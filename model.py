#!/usr/bin/env python3
"""
mobilenet_dog_train.py

CPU-friendly MobileNetV2 dog-breed training + prediction + compare utility.

Usage:
    # Train
    python mobilenet_dog_train.py --mode train --data_dir ./dogs

    # Predict one image (shows top-k)
    python mobilenet_dog_train.py --mode predict --image_path path/to/image.jpg --model_path ./saved_model

Notes:
 - Expects folder structure:
    dogs/
      golden_retriever/
      german_shepherd/
      husky/
      ...
 - Optional: create a breed_traits.json file next to the script to enable "compare" details.
   Example breed_traits.json:
   {
     "golden_retriever": {"size":"large","coat":"golden","ears":"floppy","common_colors":["gold","cream"], "notes":"friendly, family dog"},
     "husky": {"size":"medium","coat":"double","ears":"pointed","common_colors":["gray","black","white"], "notes":"very energetic"}
   }
"""

import os
# Reduce TF logging BEFORE importing tensorflow
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'   # '2' hides INFO; set to '3' to hide WARNING too

import json
import argparse
from pathlib import Path
import math
import numpy as np
import tensorflow as tf
from tensorflow import keras
from tensorflow.keras import layers
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input

# -----------------------------
# CONFIG / HYPERPARAMS (edit these)
# -----------------------------
DATA_DIR = "dogs"                      # default dataset folder
IMG_SIZE = 224
BATCH_SIZE = 16                        # reduce to 8 if you run out of RAM/CPU
SEED = 42
AUTOTUNE = tf.data.AUTOTUNE

EPOCHS_HEAD = 20                       # train classifier head
EPOCHS_FINE = 30                       # fine-tune some top layers
LEARNRATE_HEAD = 1e-3
LEARNRATE_FINE = 1e-5
DENSE_UNITS = 256
DROPOUT_RATE = 0.5
FINE_TUNE_AT = -40                     # unfreeze last 40 layers (negative allowed)

MODEL_DIR = "saved_model"
CLASS_NAMES_JSON = "class_names.json"
BREED_TRAITS_JSON = "breed_traits.json"

# -----------------------------
# UTILITIES
# -----------------------------
def compute_class_weights(directory):
    """
    Compute class weights from directory structure (useful for imbalance).
    Returns dict mapping class_index -> weight.
    """
    class_counts = {}
    classes = sorted([d.name for d in Path(directory).iterdir() if d.is_dir()])
    for i, cls in enumerate(classes):
        cnt = len(list((Path(directory) / cls).glob("*")))
        class_counts[i] = max(1, cnt)
    # compute weights: inverse proportional to frequency
    total = sum(class_counts.values())
    class_weight = {i: total / (len(class_counts) * count) for i, count in class_counts.items()}
    return class_weight

def save_class_names(class_names, path=CLASS_NAMES_JSON):
    with open(path, "w", encoding="utf-8") as f:
        json.dump(class_names, f, indent=2)

def load_class_names(path=CLASS_NAMES_JSON):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def load_breed_traits(path=BREED_TRAITS_JSON):
    if Path(path).exists():
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}

# -----------------------------
# DATA LOADING + PREPROCESSING
# -----------------------------
def make_datasets(data_dir, img_size=IMG_SIZE, batch_size=BATCH_SIZE, seed=SEED, val_split=0.2):
    train_ds = tf.keras.utils.image_dataset_from_directory(
        data_dir,
        validation_split=val_split,
        subset="training",
        seed=seed,
        image_size=(img_size, img_size),
        batch_size=batch_size
    )
    val_ds = tf.keras.utils.image_dataset_from_directory(
        data_dir,
        validation_split=val_split,
        subset="validation",
        seed=seed,
        image_size=(img_size, img_size),
        batch_size=batch_size
    )
    class_names = train_ds.class_names
    # apply MobileNetV2 preprocess_input (this handles scaling correctly for pretrained weights)
    train_ds = train_ds.map(lambda x, y: (preprocess_input(tf.cast(x, tf.float32)), y), num_parallel_calls=AUTOTUNE)
    val_ds = val_ds.map(lambda x, y: (preprocess_input(tf.cast(x, tf.float32)), y), num_parallel_calls=AUTOTUNE)

    # data augmentation (light, on-the-fly)
    data_augmentation = keras.Sequential([
        layers.Resizing(img_size, img_size),   # ensure consistent
        layers.RandomFlip("horizontal"),
        layers.RandomRotation(0.08),
        layers.RandomZoom(0.08),
    ], name="data_augmentation")

    # apply augmentation only on the training pipeline
    train_ds = train_ds.map(lambda x, y: (data_augmentation(x, training=True), y), num_parallel_calls=AUTOTUNE)

    train_ds = train_ds.cache().shuffle(1000).prefetch(AUTOTUNE)
    val_ds = val_ds.cache().prefetch(AUTOTUNE)

    return train_ds, val_ds, class_names

# -----------------------------
# MODEL BUILDING
# -----------------------------
def build_model(num_classes, img_size=IMG_SIZE, dense_units=DENSE_UNITS, dropout_rate=DROPOUT_RATE):
    base_model = MobileNetV2(
        input_shape=(img_size, img_size, 3),
        include_top=False,
        weights="imagenet"
    )
    base_model.trainable = False

    inputs = keras.Input(shape=(img_size, img_size, 3))
    x = base_model(inputs, training=False)
    x = layers.GlobalAveragePooling2D(name="gap")(x)
    x = layers.BatchNormalization()(x)
    x = layers.Dense(dense_units, activation="relu")(x)
    x = layers.Dropout(dropout_rate)(x)
    outputs = layers.Dense(num_classes, activation="softmax")(x)

    model = keras.Model(inputs, outputs)
    return model, base_model

# -----------------------------
# TRAINING
# -----------------------------
def train(data_dir=DATA_DIR, model_dir=MODEL_DIR):
    # Prepare data
    train_ds, val_ds, class_names = make_datasets(data_dir)
    num_classes = len(class_names)
    print("Detected classes:", num_classes, class_names)
    save_class_names(class_names)

    # Compute class weights (helpful if imbalance)
    class_weights = compute_class_weights(data_dir)
    print("Class weights (sample):", {k: round(v, 3) for k, v in list(class_weights.items())[:5]})

    # Build model
    model, base_model = build_model(num_classes)
    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=LEARNRATE_HEAD),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"]
    )
    model.summary()

    # Callbacks
    checkpoint_cb = keras.callbacks.ModelCheckpoint(
        os.path.join(model_dir, "best_head.h5"),
        monitor="val_accuracy",
        save_best_only=True,
        save_weights_only=False,
        verbose=1
    )
    earlystop_cb = keras.callbacks.EarlyStopping(monitor="val_loss", patience=6, restore_best_weights=True, verbose=1)
    reduce_cb = keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.3, patience=3, min_lr=1e-7, verbose=1)
    csv_logger = keras.callbacks.CSVLogger(os.path.join(model_dir, "training_log_head.csv"))

    os.makedirs(model_dir, exist_ok=True)

    # Train head
    print("=== Training classifier head ===")
    history_head = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=EPOCHS_HEAD,
        class_weight=class_weights,
        callbacks=[checkpoint_cb, earlystop_cb, reduce_cb, csv_logger]
    )

    # Fine-tune: unfreeze top N layers
    print("=== Fine-tuning ===")
    base_model.trainable = True
    # Freeze all but the last `-FINE_TUNE_AT` layers (if negative, treat as from the end)
    if isinstance(FINE_TUNE_AT, int) and FINE_TUNE_AT < 0:
        cutoff = len(base_model.layers) + FINE_TUNE_AT
    else:
        cutoff = FINE_TUNE_AT
    cutoff = max(0, cutoff)
    for i, layer in enumerate(base_model.layers):
        layer.trainable = (i >= cutoff)

    model.compile(
        optimizer=keras.optimizers.Adam(learning_rate=LEARNRATE_FINE),
        loss="sparse_categorical_crossentropy",
        metrics=["accuracy"]
    )

    checkpoint_finetune = keras.callbacks.ModelCheckpoint(
        os.path.join(model_dir, "best_finetuned.h5"),
        monitor="val_accuracy",
        save_best_only=True,
        verbose=1
    )
    csv_logger2 = keras.callbacks.CSVLogger(os.path.join(model_dir, "training_log_finetune.csv"))
    earlystop_ft = keras.callbacks.EarlyStopping(monitor="val_loss", patience=8, restore_best_weights=True, verbose=1)
    reduce_ft = keras.callbacks.ReduceLROnPlateau(monitor="val_loss", factor=0.3, patience=3, min_lr=1e-7, verbose=1)

    history_ft = model.fit(
        train_ds,
        validation_data=val_ds,
        epochs=EPOCHS_FINE,
        class_weight=class_weights,
        callbacks=[checkpoint_finetune, earlystop_ft, reduce_ft, csv_logger2]
    )

    # Save final model and class names
    final_model_path = os.path.join(model_dir, "final_saved_model")
    model.save(final_model_path)
    print("Saved final model to:", final_model_path)

    return model, class_names

# -----------------------------
# PREDICTION / TOP-K + COMPARE
# -----------------------------
def load_model_and_classes(model_path):
    # model_path can be the saved_model folder or .h5 file
    model = tf.keras.models.load_model(model_path)
    class_names = load_class_names()
    return model, class_names

def preprocess_image_for_predict(image_path, img_size=IMG_SIZE):
    from PIL import Image
    img = Image.open(image_path).convert("RGB").resize((img_size, img_size))
    arr = np.array(img).astype("float32")
    arr = preprocess_input(arr)
    arr = np.expand_dims(arr, axis=0)
    return arr

def predict_top_k(model, class_names, image_path, top_k=3):
    x = preprocess_image_for_predict(image_path)
    preds = model.predict(x)[0]    # softmax outputs
    top_idx = np.argsort(preds)[::-1][:top_k]
    results = [(class_names[i], float(preds[i])) for i in top_idx]
    return results

def compare_breeds(predictions, traits_db=None):
    """
    predictions: list of tuples (class_name, prob)
    traits_db: dict loaded from breed_traits.json (optional)
    Returns a readable comparison dict/list
    """
    if traits_db is None:
        traits_db = load_breed_traits()

    compare = []
    for cls, prob in predictions:
        info = traits_db.get(cls, {})
        compare.append({
            "breed": cls,
            "probability": round(prob, 4),
            "traits": info
        })
    return compare

# -----------------------------
# CLI
# -----------------------------
def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--mode", choices=["train", "predict"], required=True)
    p.add_argument("--data_dir", default=DATA_DIR)
    p.add_argument("--model_dir", default=MODEL_DIR)
    p.add_argument("--model_path", default=os.path.join(MODEL_DIR, "final_saved_model"))
    p.add_argument("--image_path", default=None)
    p.add_argument("--top_k", type=int, default=3)
    return p.parse_args()

def main():
    args = parse_args()
    if args.mode == "train":
        train(data_dir=args.data_dir, model_dir=args.model_dir)
    elif args.mode == "predict":
        if not args.image_path:
            raise SystemExit("Error: --image_path is required for predict mode")
        model, class_names = load_model_and_classes(args.model_path)
        topk = predict_top_k(model, class_names, args.image_path, top_k=args.top_k)
        print("Top-{} predictions:".format(args.top_k))
        for cname, p in topk:
            print(f" - {cname}: {p:.4f}")
        traits_db = load_breed_traits()
        comp = compare_breeds(topk, traits_db)
        print("\nComparison info (from breed_traits.json if present):")
        for item in comp:
            print(f"\nBreed: {item['breed']}  (prob {item['probability']})")
            if item['traits']:
                for k, v in item['traits'].items():
                    print(f"   {k}: {v}")
            else:
                print("   No trait data available for this breed. Create breed_traits.json to add notes.")
    else:
        raise SystemExit("Unknown mode")

if __name__ == "__main__":
    main()
