/**
 * map_images_tolerant.js
 *
 * Usage:
 *   node map_images_tolerant.js
 *   node map_images_tolerant.js --breeds ./breeds121.json --dataset ./sorted_dataset --out ./out_images --apply
 *
 * Behavior:
 * - Dry-run by default (it will list planned actions and write mapping.json)
 * - Add --apply to actually copy files into out dir
 *
 * Matching strategy:
 * 1) Exact normalized match
 * 2) Name variant attempts (underscores/hyphens/spaces)
 * 3) Token-overlap fuzzy match (choose best if confidence >= threshold)
 *
 * Notes:
 * - It will pick the first image in each folder (you can change this behavior)
 * - mapping.json contains matched:true/false, method: "exact" | "variant" | "fuzzy", and a confidence score for fuzzy
 */

const fs = require('fs');
const path = require('path');

const argv = process.argv.slice(2);
const arg = (flag, fallback) => {
  const i = argv.indexOf(flag);
  if (i === -1) return fallback;
  if (i + 1 >= argv.length || argv[i+1].startsWith('--')) return true;
  return argv[i+1];
};

const BREEDS_JSON = arg('--breeds', '../models/class_labels.json');
const DATASET_DIR = arg('--dataset', '../dogs');
const OUT_DIR = arg('--out', './mapped_images');
const APPLY = !!arg('--apply', false);
const MAPPING_JSON = arg('--map', './mapping.json');

function normalizeForKey(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[\u2010-\u2015]/g, '-')   // normalize dash variants
    .replace(/[_\s\-]+/g, ' ')         // collapse separators to a single space
    .replace(/[^a-z0-9 ]/g, '')        // remove other punctuation
    .trim();
}

// split into tokens (words) for overlap algorithm
function tokens(s) {
  return normalizeForKey(s).split(/\s+/).filter(Boolean);
}

function tokenOverlapScore(aTokens, bTokens) {
  const a = new Set(aTokens);
  const b = new Set(bTokens);
  let inter = 0;
  a.forEach(t => { if (b.has(t)) inter++; });
  if (inter === 0) return 0;
  // score: intersection / max(lenA, lenB) — conservative
  return inter / Math.max(a.size, b.size);
}

function safeFilename(breed, index, ext) {
  const id = String(breed.breed_id).padStart(3, '0');
  const classPart = String(breed.class_name || breed.display_name || 'breed')
    .trim()
    .replace(/[\s\-]+/g, '_')
    .replace(/[^\w_]/g, '');
  return index === null ? `${id}_${classPart}${ext}` : `${id}_${classPart}_${index}${ext}`;
}
function isImageFile(fn){ return /\.(jpe?g|png|gif|bmp|webp)$/i.test(fn); }

function readJson(file){
  try { return JSON.parse(fs.readFileSync(file,'utf8')); }
  catch(e){ console.error('Failed to read/parse JSON:', e.message); process.exit(1); }
}

// MAIN
(function main(){
  console.log(`breeds JSON: ${BREEDS_JSON}`);
  console.log(`dataset dir: ${DATASET_DIR}`);
  console.log(`out dir: ${OUT_DIR}`);
  console.log(`apply mode: ${APPLY ? 'ON (will copy files)' : 'DRY-RUN (no files will be copied)'}\n`);

  const breeds = readJson(BREEDS_JSON);
  if (!Array.isArray(breeds)) { console.error('Breeds JSON must be an array.'); process.exit(1); }

  // Build lookup maps with normalized keys and token sets
  const breedByNorm = new Map();
  const breedList = breeds.map(b => {
    const normClass = normalizeForKey(b.class_name);
    const normDisplay = normalizeForKey(b.display_name);
    breedByNorm.set(normClass, b);
    if (!breedByNorm.has(normDisplay)) breedByNorm.set(normDisplay, b);
    return {
      ...b,
      normClass,
      normDisplay,
      tokensClass: tokens(b.class_name),
      tokensDisplay: tokens(b.display_name)
    };
  });

  // read dataset folders
  let folders;
  try {
    folders = fs.readdirSync(DATASET_DIR).filter(n => {
      return fs.existsSync(path.join(DATASET_DIR,n)) && fs.statSync(path.join(DATASET_DIR,n)).isDirectory();
    }).sort((a,b) => a.localeCompare(b, undefined, {sensitivity:'base'}));
  } catch(err){
    console.error('Failed to read dataset dir:', err.message); process.exit(1);
  }

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const mapping = [];

  folders.forEach(folderName => {
    const folderPath = path.join(DATASET_DIR, folderName);
    const files = fs.readdirSync(folderPath).filter(f => fs.statSync(path.join(folderPath,f)).isFile() && isImageFile(f))
                      .sort((a,b)=> a.localeCompare(b, undefined, {sensitivity:'base'}));
    if (files.length === 0) {
      mapping.push({ folder: folderName, matched: false, reason: 'no_images', files: [] });
      console.warn(`Folder "${folderName}" has no image files — flagged.`);
      return;
    }
    const firstImage = files[0];
    // normalize folder
    const normFolder = normalizeForKey(folderName);

    // 1) exact normalized match
    let matchedBreed = breedByNorm.get(normFolder);
    let method = 'exact';
    let confidence = 1.0;

    // 2) try simple variants if not found (replace underscore/hyphen/space variations)
    if (!matchedBreed) {
      const variants = [
        normFolder.replace(/\s+/g,'_'),
        normFolder.replace(/\s+/g,'-'),
        normFolder.replace(/_/g,' '),
        normFolder.replace(/-/g,' ')
      ];
      for (const v of variants) {
        if (breedByNorm.get(v)) { matchedBreed = breedByNorm.get(v); method = 'variant'; confidence = 0.95; break; }
      }
    }

    // 3) fuzzy token overlap fallback
    if (!matchedBreed) {
      const folderTokens = tokens(folderName);
      let best = { score: 0, breed: null };
      breedList.forEach(b => {
        // compute two scores: with class tokens and display tokens; take max
        const sc1 = tokenOverlapScore(folderTokens, b.tokensClass);
        const sc2 = tokenOverlapScore(folderTokens, b.tokensDisplay);
        const sc = Math.max(sc1, sc2);
        if (sc > best.score) best = { score: sc, breed: b };
      });
      // threshold conservative: require >=0.5 overlap and unique gap
      if (best.score >= 0.45) {
        // ensure not ambiguous: find second best
        const second = breedList
          .map(b => Math.max(tokenOverlapScore(folderTokens, b.tokensClass), tokenOverlapScore(folderTokens, b.tokensDisplay)))
          .sort((a,b)=> b - a)[1] || 0;
        if (best.score - second >= 0.15) {
          matchedBreed = best.breed;
          method = 'fuzzy';
          confidence = Number(best.score.toFixed(2));
        }
      }
    }

    if (!matchedBreed) {
      mapping.push({
        folder: folderName,
        matched: false,
        reason: 'no_confident_match',
        sampled_image: path.join(folderPath, firstImage)
      });
      console.warn(`No confident match found for folder "${folderName}" (norm="${normFolder}").`);
      return;
    }

    // build destination filename(s) - single image as requested
    const ext = path.extname(firstImage).toLowerCase();
    const destBase = safeFilename(matchedBreed, null, ext);
    let destPath = path.join(OUT_DIR, destBase);

    // avoid collision
    let coll = 1;
    while (fs.existsSync(destPath)) {
      const nameNoExt = path.basename(destBase, ext);
      destPath = path.join(OUT_DIR, `${nameNoExt}_${coll}${ext}`);
      coll++;
    }

    // dry-run: log; apply: copy
    if (!APPLY) {
      console.log(`[DRY] ${path.join(folderPath, firstImage)}  ->  ${destPath}   (match: ${matchedBreed.class_name} via ${method}, conf=${confidence})`);
    } else {
      try {
        fs.copyFileSync(path.join(folderPath, firstImage), destPath);
        console.log(`[COPY] ${path.join(folderPath, firstImage)}  ->  ${destPath}   (match: ${matchedBreed.class_name} via ${method}, conf=${confidence})`);
      } catch (err) {
        console.error(`Failed to copy: ${err.message}`);
      }
    }

    mapping.push({
      folder: folderName,
      matched: true,
      method,
      confidence,
      matched_class_name: matchedBreed.class_name,
      matched_display_name: matchedBreed.display_name,
      matched_breed_id: matchedBreed.breed_id,
      source_image: path.join(folderPath, firstImage),
      dest_image: destPath
    });
  });

  fs.writeFileSync(MAPPING_JSON, JSON.stringify(mapping, null, 2), 'utf8');
  console.log(`\nMapping written to ${MAPPING_JSON} (${mapping.length} entries).`);

  const matched = mapping.filter(m => m.matched).length;
  const unmatched = mapping.length - matched;
  console.log(`Summary: processed ${mapping.length} folders — ${matched} matched, ${unmatched} unmatched.`);

  if (!APPLY) {
    console.log('\nDry-run complete. Re-run with --apply to actually copy files.');
  } else {
    console.log('\nApply complete. Check out folder and mapping.json.');
  }

})();
