function normalizeLabel(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const rawClassName = typeof value.class_name === "string" ? value.class_name.trim() : "";
  const rawDisplayName = typeof value.display_name === "string" ? value.display_name.trim() : "";
  const classIndex = value.class_index == null ? null : Number(value.class_index);
  const confidence = value.confidence == null ? null : Number(value.confidence);

  if (
    !rawClassName &&
    !rawDisplayName &&
    !Number.isInteger(classIndex) &&
    !Number.isFinite(confidence)
  ) {
    return null;
  }

  return {
    class_name: rawClassName || rawDisplayName || null,
    display_name: rawDisplayName || rawClassName || null,
    class_index: Number.isInteger(classIndex) ? classIndex : null,
    confidence: Number.isFinite(confidence) ? confidence : null,
  };
}

function normalizeTopBreed(item, fallbackRank) {
  if (!item || typeof item !== "object" || Array.isArray(item)) return null;

  const rank = Number.parseInt(item.rank, 10);
  const parsedRank = Number.isInteger(rank) ? rank : fallbackRank;
  const breedId = item.breed_id == null ? null : Number(item.breed_id);
  const className =
    typeof item.class_name === "string" && item.class_name.trim()
      ? item.class_name.trim()
      : typeof item.display_name === "string" && item.display_name.trim()
      ? item.display_name.trim()
      : `prediction_${parsedRank}`;
  const displayName =
    typeof item.display_name === "string" && item.display_name.trim()
      ? item.display_name.trim()
      : className;
  const confidence = Number(item.confidence);
  const mixShare = item.mix_share == null ? null : Number(item.mix_share);

  if (
    !Number.isInteger(parsedRank) ||
    parsedRank < 1 ||
    parsedRank > 10 ||
    !Number.isFinite(confidence) ||
    confidence < 0 ||
    confidence > 100
  ) {
    return null;
  }

  return {
    rank: parsedRank,
    breed_id: Number.isInteger(breedId) ? breedId : null,
    mix_share: Number.isFinite(mixShare) ? mixShare : null,
    class_name: className,
    display_name: displayName,
    confidence,
  };
}

function normalizeAssistantScanContext(scanContext) {
  if (!scanContext || typeof scanContext !== "object" || Array.isArray(scanContext)) {
    return null;
  }

  const scanType =
    typeof scanContext.scan_type === "string" && scanContext.scan_type.trim().toLowerCase() === "disease"
      ? "disease"
      : "breed";
  const uploadedImageUrl =
    typeof scanContext.uploaded_image_url === "string" && scanContext.uploaded_image_url.trim()
      ? scanContext.uploaded_image_url.trim()
      : null;
  const topBreeds = Array.isArray(scanContext.top_breeds)
    ? scanContext.top_breeds
        .map((item, index) => normalizeTopBreed(item, index + 1))
        .filter(Boolean)
        .sort((a, b) => a.rank - b.rank)
    : [];

  return {
    scan_type: scanType,
    uploaded_image_url: uploadedImageUrl,
    emotion: normalizeLabel(scanContext.emotion),
    age: normalizeLabel(scanContext.age),
    top_breeds: topBreeds,
    raw_context: scanContext,
  };
}

async function replaceAssistantScanContext(client, threadId, scanContext) {
  const normalized = normalizeAssistantScanContext(scanContext);
  if (!normalized) {
    throw new Error("scan_context object is required.");
  }

  await client.query(
    `INSERT INTO assistant_thread_scan_contexts (
       thread_id,
       scan_type,
       uploaded_image_url,
       emotion_class_name,
       emotion_display_name,
       emotion_class_index,
       emotion_confidence,
       age_class_name,
       age_display_name,
       age_class_index,
       age_confidence,
       raw_context,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, NOW())
     ON CONFLICT (thread_id) DO UPDATE SET
       scan_type = EXCLUDED.scan_type,
       uploaded_image_url = EXCLUDED.uploaded_image_url,
       emotion_class_name = EXCLUDED.emotion_class_name,
       emotion_display_name = EXCLUDED.emotion_display_name,
       emotion_class_index = EXCLUDED.emotion_class_index,
       emotion_confidence = EXCLUDED.emotion_confidence,
       age_class_name = EXCLUDED.age_class_name,
       age_display_name = EXCLUDED.age_display_name,
       age_class_index = EXCLUDED.age_class_index,
       age_confidence = EXCLUDED.age_confidence,
       raw_context = EXCLUDED.raw_context,
       updated_at = NOW()`,
    [
      threadId,
      normalized.scan_type,
      normalized.uploaded_image_url,
      normalized.emotion?.class_name ?? null,
      normalized.emotion?.display_name ?? null,
      normalized.emotion?.class_index ?? null,
      normalized.emotion?.confidence ?? null,
      normalized.age?.class_name ?? null,
      normalized.age?.display_name ?? null,
      normalized.age?.class_index ?? null,
      normalized.age?.confidence ?? null,
      JSON.stringify(normalized.raw_context),
    ]
  );

  await client.query(
    `DELETE FROM assistant_thread_scan_breeds
     WHERE thread_id = $1`,
    [threadId]
  );

  if (normalized.top_breeds.length) {
    const values = normalized.top_breeds.flatMap((breed) => [
      threadId,
      breed.rank,
      breed.breed_id,
      breed.mix_share,
      breed.class_name,
      breed.display_name,
      breed.confidence,
    ]);

    const placeholders = normalized.top_breeds
      .map(
        (_, index) =>
          `($${index * 7 + 1}, $${index * 7 + 2}, $${index * 7 + 3}, $${index * 7 + 4}, $${index * 7 + 5}, $${index * 7 + 6}, $${index * 7 + 7})`
      )
      .join(", ");

    await client.query(
      `INSERT INTO assistant_thread_scan_breeds (
         thread_id,
         rank,
         breed_id,
         mix_share,
         class_name,
         display_name,
         confidence
       )
       VALUES ${placeholders}`,
      values
    );
  }

  return normalized;
}

module.exports = {
  normalizeAssistantScanContext,
  replaceAssistantScanContext,
};
