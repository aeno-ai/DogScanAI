# ---------- Enhanced inference (no retraining) ----------
import numpy as np
from PIL import Image, ImageOps
import math
import os
import json
from pathlib import Path
import tensorflow as tf

# ========== Model Loading ==========
MODEL_DIR = "models/trained_model"
LABELS_FILE = "models/class_names.json" 

print("Loading model...")
model = tf.keras.models.load_model(os.path.join(MODEL_DIR, "best_finetuned.h5"))
with open(LABELS_FILE, "r", encoding="utf-8") as f:
    class_info = json.load(f)  # ← CHANGED: Load full class info
    class_names = [breed["display_name"] for breed in class_info]  # ← CHANGED: Extract display names
print(f"Model loaded. {len(class_names)} breeds supported.")

# ========== Helper Functions ==========
def softmax_entropy(p: np.ndarray) -> float:
    """Calculate entropy of probability distribution (higher = more uncertain)"""
    p = np.clip(p, 1e-12, 1.0)
    return -np.sum(p * np.log(p))

def is_blurry(np_img: np.ndarray, thresh: float = 100.0) -> bool:
    """Check if image is blurry using Laplacian variance"""
    try:
        import cv2
        if np_img.dtype == np.float32 or np_img.dtype == np.float64:
            np_img = (np_img * 255).astype(np.uint8)
        gray = cv2.cvtColor(np_img, cv2.COLOR_RGB2GRAY)
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        return laplacian_var < thresh
    except ImportError:
        # If cv2 not available, skip blur detection
        return False

# Parameters you can tweak
TOP_K = 5                      # Show top 5 breeds for mixed breed analysis (was 3)
TTA_ENABLED = True
TTA_ROTATIONS = (-15, -7, 0, 7, 15)  # More rotation angles for better averaging
TTA_HFLIP = True
TTA_BATCH_SIZE = 8             # batch size for model.predict during TTA
TEMP_GRID = np.linspace(0.5, 5.0, 46)  # grid for temperature search (1.0 = no scaling)

# Mixed breed detection thresholds (tuned for better mixed breed recognition)
UNCERTAIN_THRESHOLDS = {
    "max_prob": 0.55,      # RAISED: if highest prob < 55% -> likely mixed (was 0.45)
    "margin": 0.18,        # RAISED: if top1-top2 < 18% -> likely mixed (was 0.12)
    "top3_sum": 0.60,      # RAISED: if sum(top3) < 70% -> uncertain (was 0.60)
    "entropy": 0.8,        # LOWERED: if entropy > 0.8 -> likely mixed (was 1.0)
}

# Additional mixed breed settings
MIXED_BREED_SETTINGS = {
    "min_secondary_prob": 0.10,   # Show breeds with at least 10% probability
    "max_breeds_to_show": 4,      # Show up to 4 breeds in mix
    "confident_threshold": 0.75,  # Only call it "pure breed" if > 75% confident
}

# image preprocessing helper
def preprocess_pil(img: Image.Image, target_size):
    # keep aspect ratio, pad with white to target_size
    img = img.convert("RGB")
    img.thumbnail(target_size, Image.LANCZOS)
    # pad to square target
    new_img = Image.new("RGB", target_size, (255, 255, 255))
    left = (target_size[0] - img.width) // 2
    top = (target_size[1] - img.height) // 2
    new_img.paste(img, (left, top))
    arr = np.asarray(new_img).astype("float32") / 255.0
    return arr

# build TTA variants for one PIL image
def generate_tta_images(pil_img, target_size):
    imgs = []
    for angle in TTA_ROTATIONS:
        imr = pil_img.rotate(angle, resample=Image.BILINEAR, expand=False)
        imgs.append(preprocess_pil(imr, target_size))
        if TTA_HFLIP:
            imgs.append(preprocess_pil(ImageOps.mirror(imr), target_size))
    return imgs

# apply TTA and average predictions
def predict_with_tta(pil_img, model, input_shape):
    target_size = (input_shape[2], input_shape[1])  # (width, height)
    if not TTA_ENABLED:
        arr = preprocess_pil(pil_img, target_size)
        return model.predict(np.expand_dims(arr, 0))[0]
    variants = generate_tta_images(pil_img, target_size)
    # batch predict
    preds = []
    for i in range(0, len(variants), TTA_BATCH_SIZE):
        batch = np.stack(variants[i:i+TTA_BATCH_SIZE], axis=0)
        batch_preds = model.predict(batch)
        preds.append(batch_preds)
    preds = np.concatenate(preds, axis=0)
    avg = preds.mean(axis=0)
    return avg

# temperature-scaling on probabilities (works without logits)
def apply_temperature_scaling(probs, T):
    # probs: (..., num_classes)
    # avoid zeros
    p = np.clip(probs, 1e-12, 1.0)
    scaled = p ** (1.0 / T)
    scaled = scaled / np.sum(scaled, axis=-1, keepdims=True)
    return scaled

# compute negative log-likelihood for one-hot labels
def nll_for_T(probs, labels_onehot, T):
    scaled = apply_temperature_scaling(probs, T)
    return -np.mean(np.sum(labels_onehot * np.log(np.clip(scaled, 1e-12, 1.0)), axis=-1))

# If a validation folder exists, run a simple grid-search to pick T
def calibrate_temperature_if_possible(model, input_shape):
    val_dir = os.path.join("dogs", "val")
    if not os.path.isdir(val_dir):
        print("No dogs/val found — skipping temperature calibration.")
        return 1.0
    print("Found dogs/val — running temperature calibration (grid search).")
    ds_val = tf.keras.utils.image_dataset_from_directory(
        val_dir,
        labels="inferred",
        label_mode="categorical",
        image_size=(input_shape[1], input_shape[2]),
        batch_size=32,
        shuffle=False
    )
    # collect predictions and labels (smallish val sets expected)
    probs_list = []
    labels_list = []
    for batch_images, batch_labels in ds_val:
        # if TTA: average per-image predictions by running TTA on PIL reconstructed images
        # For speed, do a simple predict without TTA here (calibration is optional)
        preds = model.predict(batch_images)
        probs_list.append(preds)
        labels_list.append(batch_labels.numpy())
    probs = np.concatenate(probs_list, axis=0)
    labels = np.concatenate(labels_list, axis=0)
    # grid search
    best_T = 1.0
    best_nll = float("inf")
    for T in TEMP_GRID:
        nll = nll_for_T(probs, labels, T)
        if nll < best_nll:
            best_nll = nll
            best_T = T
    print(f"Calibration chosen T = {best_T:.3f}  (NLL {best_nll:.4f})")
    return best_T

# inference on sample images (uploads / sample)
sample_folder = Path("uploads")
if not sample_folder.exists():
    sample_folder = Path("sample")  # keep backward-compatible
imgs = []
if sample_folder.exists():
    for p in sample_folder.rglob("*"):
        if p.suffix.lower() in [".jpg", ".jpeg", ".png", ".bmp", ".webp", ".avif"]:
            imgs.append(p)
if not imgs:
    print("No sample images found in 'uploads/' or 'sample/'. Place images there to run inference.")
else:
    # optionally calibrate temperature
    T_chosen = calibrate_temperature_if_possible(model, model.input_shape)

    for p in imgs:
        pil = Image.open(p).convert("RGB")
        preds = predict_with_tta(pil, model, model.input_shape)  # raw probs
        # optional temperature scaling
        preds = apply_temperature_scaling(preds, T_chosen)

        # get top-k
        top_idx = np.argsort(preds)[::-1][:TOP_K]
        top_probs = preds[top_idx]
        p1 = float(top_probs[0])
        p2 = float(top_probs[1]) if len(top_probs) > 1 else 0.0
        topk_sum = float(top_probs.sum())
        entropy = softmax_entropy(preds)
        margin = p1 - p2

        # blur check
        arr_for_blur = preprocess_pil(pil, (model.input_shape[2], model.input_shape[1]))
        blur_flag = is_blurry(arr_for_blur)

        # compute normalized mixture among top-K
        if topk_sum > 0:
            mix_percent = (top_probs / topk_sum) * 100.0
        else:
            mix_percent = np.zeros_like(top_probs)  # degenerate case

        # decide uncertainty / mixed heuristics
        uncertain_reasons = []
        uncertain = False
        is_mixed = False
        
        # Check for mixed breed indicators
        if p1 < UNCERTAIN_THRESHOLDS["max_prob"]:
            is_mixed = True
            uncertain_reasons.append(f"low_max={p1:.2f}")
        if margin < UNCERTAIN_THRESHOLDS["margin"]:
            is_mixed = True
            uncertain_reasons.append(f"small_margin={margin:.2f}")
        if topk_sum < UNCERTAIN_THRESHOLDS["top3_sum"]:
            uncertain = True
            uncertain_reasons.append(f"top{TOP_K}_sum={topk_sum:.2f}")
        if entropy > UNCERTAIN_THRESHOLDS["entropy"]:
            is_mixed = True
            uncertain_reasons.append(f"entropy={entropy:.2f}")
        if blur_flag:
            uncertain = True
            uncertain_reasons.append("blurry")

        # Determine if it's a confident pure breed
        is_pure_breed = p1 >= MIXED_BREED_SETTINGS["confident_threshold"]
    
        # print results
        print("\n" + "="*50)
        print("Image:", p)
        print("="*50)
        
        if blur_flag:
            print("[!] Warning: Image appears blurry - results may be less accurate")
        
        if is_pure_breed:
            # High confidence single breed
            print(f"[DOG] Breed: {class_names[top_idx[0]]}")
            print(f"      Confidence: {p1*100:.1f}%")
            print(f"      Status: Pure breed (high confidence)")
        elif is_mixed or not is_pure_breed:
            # Likely mixed breed - show breed composition
            print("[DOG] Likely MIXED BREED")
            print(f"      Detection reasons: {', '.join(uncertain_reasons)}")
            print("\n      Estimated breed composition:")
            
            # Filter and show significant breeds
            shown = 0
            for idx, prob_pct in zip(top_idx, mix_percent):
                raw_prob = preds[idx]
                # Only show breeds above minimum threshold
                if raw_prob >= MIXED_BREED_SETTINGS["min_secondary_prob"] and shown < MIXED_BREED_SETTINGS["max_breeds_to_show"]:
                    bar_len = int(prob_pct / 5)  # Visual bar
                    bar = "#" * bar_len + "-" * (20 - bar_len)
                    print(f"      * {class_names[idx]:25s} [{bar}] {prob_pct:.0f}%")  # ← FIXED: Use idx directly
                    shown += 1
        else:
            # Uncertain but not clearly mixed
            print(f"[DOG] Predicted: {class_names[top_idx[0]]} ({p1*100:.1f}%)")
            print("      Other possibilities:")
            for idx, prob_pct in zip(top_idx[1:TOP_K], mix_percent[1:TOP_K]):     
                print(f"      * {class_names[idx]}: {prob_pct:.0f}%")

print("Done.")