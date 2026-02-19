"""
app.py  —  DogScan AI  |  Flask Model API
Run: python app.py  (dev)  |  gunicorn -w 2 -b 0.0.0.0:5001 app:app  (prod)

Endpoints:
  GET  /health
  POST /predict/breed    { "image": "<base64>" }
  POST /predict/disease  { "image": "<base64>" }
"""

import os, json, base64, io, logging
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image, ImageOps

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
import tensorflow as tf
from tensorflow.keras.models import load_model

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5000"])

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")

def load_json(filename):
    with open(os.path.join(MODELS_DIR, filename), "r", encoding="utf-8") as f:
        return json.load(f)

def normalize_labels(raw, name_key="name"):
    """Convert labels from dict/list/string variants to a uniform list of dicts."""
    if isinstance(raw, dict):
        items = sorted(raw.items(), key=lambda x: int(x[0]) if str(x[0]).isdigit() else 0)
        out = []
        for i, (k, v) in enumerate(items):
            if isinstance(v, dict):
                out.append({
                    "class_index": int(v.get("class_index", i)),
                    "class_name": str(v.get("class_name", k)),
                    "display_name": str(v.get("display_name", v.get(name_key, k))),
                    **v,
                })
            else:
                out.append({
                    "class_index": i,
                    "class_name": str(v),
                    "display_name": str(v),
                })
        return out

    if isinstance(raw, list):
        out = []
        for i, item in enumerate(raw):
            if isinstance(item, dict):
                cls_name = item.get("class_name", item.get(name_key, item.get("display_name", f"class_{i}")))
                display = item.get("display_name", item.get(name_key, cls_name))
                out.append({
                    "class_index": int(item.get("class_index", i)),
                    "class_name": str(cls_name),
                    "display_name": str(display),
                    **item,
                })
            else:
                out.append({
                    "class_index": i,
                    "class_name": str(item),
                    "display_name": str(item),
                })
        return out

    return []

log.info("Loading label files...")
BREED_LABELS   = normalize_labels(load_json("class_labels.json"), name_key="display_name")
EMOTION_LABELS = normalize_labels(load_json("emotion_labels.json"))
AGE_LABELS     = normalize_labels(load_json("age_labels.json"))
DISEASE_LABELS = normalize_labels(load_json("disease_info.json"), name_key="name")

log.info("Loading Keras models... (may take a moment)")
BREED_MODEL   = load_model(os.path.join(MODELS_DIR, "trained_model", "dog_breed_model.h5"))
EMOTION_MODEL = load_model(os.path.join(MODELS_DIR, "trained_model","dog_emotion_model.h5"))
AGE_MODEL     = load_model(os.path.join(MODELS_DIR, "trained_model","dog_age_model.h5"))
DISEASE_MODEL = load_model(os.path.join(MODELS_DIR, "trained_model","dog_skin_disease_model.h5"))

_dummy = np.zeros((1, 224, 224, 3), dtype=np.float32)
for _m in [BREED_MODEL, EMOTION_MODEL, AGE_MODEL, DISEASE_MODEL]:
    _m.predict(_dummy, verbose=0)
log.info("All models loaded and warmed up")

# TTA config — mirrors your test script exactly
TTA_ROTATIONS  = (-15, -7, 0, 7, 15)
TTA_HFLIP      = True
TTA_BATCH_SIZE = 8

UNCERTAIN_THRESHOLDS = {
    "max_prob":  0.55,
    "margin":    0.18,
    "top3_sum":  0.60,
    "entropy":   0.8,
}
MIXED_BREED_SETTINGS = {
    "min_secondary_prob":  0.10,
    "max_breeds_to_show":  4,
    "confident_threshold": 0.75,
}

def preprocess_pil(img, target_size):
    """Aspect-ratio preserving resize + white padding — same as your test script."""
    img = img.convert("RGB")
    img.thumbnail(target_size, Image.LANCZOS)
    padded = Image.new("RGB", target_size, (255, 255, 255))
    left = (target_size[0] - img.width)  // 2
    top  = (target_size[1] - img.height) // 2
    padded.paste(img, (left, top))
    return np.asarray(padded).astype("float32") / 255.0

def decode_image(b64_string):
    if "," in b64_string:
        b64_string = b64_string.split(",", 1)[1]
    return Image.open(io.BytesIO(base64.b64decode(b64_string))).convert("RGB")

def predict_with_tta(pil_img, model):
    """Rotations + hflip variants, batch predict, average — same as your test script."""
    input_shape = model.input_shape
    target_size = (input_shape[2], input_shape[1])
    variants = []
    for angle in TTA_ROTATIONS:
        rotated = pil_img.rotate(angle, resample=Image.BILINEAR, expand=False)
        variants.append(preprocess_pil(rotated, target_size))
        if TTA_HFLIP:
            variants.append(preprocess_pil(ImageOps.mirror(rotated), target_size))
    preds = []
    for i in range(0, len(variants), TTA_BATCH_SIZE):
        batch = np.stack(variants[i : i + TTA_BATCH_SIZE], axis=0)
        preds.append(model.predict(batch, verbose=0))
    return np.concatenate(preds, axis=0).mean(axis=0)

def predict_simple(pil_img, model):
    """Single-pass predict — used for emotion and age."""
    input_shape = model.input_shape
    target_size = (input_shape[2], input_shape[1])
    arr = preprocess_pil(pil_img, target_size)
    return model.predict(np.expand_dims(arr, 0), verbose=0)[0]

def softmax_entropy(p):
    p = np.clip(p, 1e-12, 1.0)
    return float(-np.sum(p * np.log(p)))

def label_by_index(labels, idx):
    target = int(idx)
    for i, item in enumerate(labels):
        if isinstance(item, dict):
            item_idx = item.get("class_index", i)
            try:
                item_idx = int(item_idx)
            except Exception:
                continue
            if item_idx == target:
                return item
            continue
        if i == target:
            text = str(item)
            return {"class_index": i, "class_name": text, "display_name": text}
    return {}

def top1_result(preds, labels):
    idx = int(np.argmax(preds))
    return {"class_index": idx, "confidence": round(float(preds[idx]) * 100, 2), **label_by_index(labels, idx)}

def analyze_breed(preds):
    TOP_K     = 3
    top_idx   = np.argsort(preds)[::-1][:TOP_K]
    top_probs = preds[top_idx]
    p1        = float(top_probs[0])
    p2        = float(top_probs[1]) if len(top_probs) > 1 else 0.0
    topk_sum  = float(top_probs.sum())
    entropy   = softmax_entropy(preds)
    margin    = p1 - p2

    is_mixed, is_uncertain, reasons = False, False, []

    if p1      < UNCERTAIN_THRESHOLDS["max_prob"]:  is_mixed     = True;  reasons.append(f"low_confidence ({p1:.2f})")
    if margin  < UNCERTAIN_THRESHOLDS["margin"]:    is_mixed     = True;  reasons.append(f"close_margin ({margin:.2f})")
    if topk_sum< UNCERTAIN_THRESHOLDS["top3_sum"]:  is_uncertain = True;  reasons.append(f"spread_predictions ({topk_sum:.2f})")
    if entropy > UNCERTAIN_THRESHOLDS["entropy"]:   is_mixed     = True;  reasons.append(f"high_entropy ({entropy:.2f})")

    is_pure    = p1 >= MIXED_BREED_SETTINGS["confident_threshold"]
    mix_pct    = (top_probs / topk_sum * 100.0) if topk_sum > 0 else np.zeros(TOP_K)
    top_breeds = []

    for i, (idx, pct) in enumerate(zip(top_idx, mix_pct)):
        raw  = float(preds[idx])
        if is_mixed and raw < MIXED_BREED_SETTINGS["min_secondary_prob"]:
            continue
        entry = label_by_index(BREED_LABELS, idx)
        if not entry:
            continue
        top_breeds.append({
            "rank":         i + 1,
            "class_index":  int(idx),
            "class_name":   entry.get("class_name", ""),
            "display_name": entry.get("display_name", ""),
            "breed_id":     entry.get("breed_id"),
            "confidence":   round(raw * 100, 2),
            "mix_share":    round(float(pct), 1),
        })

    result_type = "pure_breed" if is_pure else ("mixed_breed" if is_mixed else "uncertain")
    return {"result_type": result_type, "top_breeds": top_breeds, "entropy": round(entropy, 4), "reasons": reasons}


@app.get("/health")
def health():
    return jsonify({"status": "ok", "models_loaded": 4})


@app.post("/predict/breed")
def predict_breed():
    body = request.get_json(force=True, silent=True) or {}
    if "image" not in body:
        return jsonify({"error": "Missing 'image' field (base64)"}), 400
    try:
        pil_img = decode_image(body["image"])
    except Exception as e:
        return jsonify({"error": f"Image decode failed: {e}"}), 422
    try:
        breed_data = analyze_breed(predict_with_tta(pil_img, BREED_MODEL))
        emotion    = top1_result(predict_simple(pil_img, EMOTION_MODEL), EMOTION_LABELS)
        age        = top1_result(predict_simple(pil_img, AGE_MODEL),     AGE_LABELS)
    except Exception as e:
        log.exception("Inference error (breed)")
        return jsonify({"error": f"Inference failed: {e}"}), 500

    return jsonify({
        "scan_type":   "breed",
        "result_type": breed_data["result_type"],
        "top_breeds":  breed_data["top_breeds"],
        "reasons":     breed_data["reasons"],
        "emotion":     emotion,
        "age":         age,
    })


@app.post("/predict/disease")
def predict_disease():
    body = request.get_json(force=True, silent=True) or {}
    if "image" not in body:
        return jsonify({"error": "Missing 'image' field (base64)"}), 400
    try:
        pil_img = decode_image(body["image"])
    except Exception as e:
        return jsonify({"error": f"Image decode failed: {e}"}), 422
    try:
        preds   = predict_simple(pil_img, DISEASE_MODEL)
        top_idx = np.argsort(preds)[::-1][:3]
        diseases = []
        for i, idx in enumerate(top_idx):
            entry = label_by_index(DISEASE_LABELS, idx)
            if not entry: continue
            diseases.append({
                "rank":         i + 1,
                "class_index":  int(idx),
                "class_name":   entry.get("class_name", ""),
                "display_name": entry.get("display_name", entry.get("class_name", "")),
                "confidence":   round(float(preds[idx]) * 100, 2),
                "description":  entry.get("description", ""),
                "treatment":    entry.get("treatment", ""),
                "severity":     entry.get("severity", ""),
            })
    except Exception as e:
        log.exception("Inference error (disease)")
        return jsonify({"error": f"Inference failed: {e}"}), 500

    return jsonify({"scan_type": "disease", "top_diseases": diseases})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=False)
