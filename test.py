# import os, sys
# import tensorflow as tf
# print("TensorFlow version:", tf.__version__)
# print("GPUs:", tf.config.list_physical_devices("GPU"))


# import os,sys
# print("Python EXE:", sys.executable)
# print("PATH (first 10 entries):")
# for p in os.environ.get('PATH','').split(';')[:30]:
#     print("  ", p)

# import ctypes
# import os
# p = r"C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v11.8\bin\cudnn64_8.dll"
# print("exists:", os.path.exists(p))
# try:
#     ctypes.CDLL(p)
#     print("Successfully loaded cudnn DLL")
# except Exception as e:
#     print("Failed to load cudnn DLL:", e)

# import os
# os.environ['TF_CPP_MIN_LOG_LEVEL'] = '0'   # show all logs
# import tensorflow as tf
# tf.debugging.set_log_device_placement(True)
# a = tf.constant([[1.0,2.0],[3.0,4.0]])
# b = tf.matmul(a, a)
# print("matmul result:", b.numpy())
# print("physical:", tf.config.list_physical_devices('GPU'))


# import tensorflow as tf
# print("TensorFlow version:", tf.__version__)
# gpus = tf.config.list_physical_devices('GPU')
# print("GPUs detected:", gpus)


# import tensorflow as tf, json; print('tf:', tf.__version__); 
# print('tf path:', tf.__file__); 
# try: print('build_info:', json.dumps(tf.sysconfig.get_build_info(), indent=2)); 
# except: print('no build_info'); 
# print('built_with_cuda:', tf.test.is_built_with_cuda()); 
# print('GPUs:', tf.config.list_physical_devices('GPU'))


# import ctypes
# import os
# libs = ["libcudart.so", "libcublas.so", "libcudnn.so"]
# for lib in libs:
#     try:
#         ctypes.cdll.LoadLibrary(os.path.join("/usr/lib/cuda/lib64", lib))
#         print(lib, "found")
#     except OSError as e:
#         print(lib, "missing!", e)

#!/usr/bin/env python3
# rename_wnid_folders.py
# Renames folders like "n323151-Chihuahua" -> "Chihuahua"
# - safe dry-run by default
# - writes mapping JSON (wnid_to_breed.json) in the data_dir
# - resolves name collisions by appending _1, _2, ...
#
# Usage examples:
#  python rename_wnid_folders.py ./dogs            # dry-run (preview)
#  python rename_wnid_folders.py ./dogs --apply    # actually rename
#  python rename_wnid_folders.py ./dogs --apply --replace-spaces  # replace spaces with underscores

import os
import json
import numpy as np
import tensorflow as tf
from tensorflow import keras
from pathlib import Path

# -------- CONFIG --------
MODEL_DIR = "dog_cpu_model"
MODEL_PATH = os.path.join(MODEL_DIR, "saved_model")
CLASS_NAMES_PATH = os.path.join(MODEL_DIR, "class_names.json")
IMAGE_FOLDER = "sample"
IMG_SIZE = 160
TOP_K = 5
# ------------------------

# Load class names
with open(CLASS_NAMES_PATH, "r", encoding="utf-8") as f:
    class_names = json.load(f)

num_classes = len(class_names)
print(f"Loaded {num_classes} classes")

# Load model
print("Loading model...")
model = tf.keras.Sequential([
    keras.layers.TFSMLayer(
        "dog_cpu_model/saved_model",
        call_endpoint="serving_default"
    )
])

print("Model loaded")

# Preprocessing
normalization = tf.keras.layers.Rescaling(1.0 / 255.0)

def load_image(path):
    img = tf.io.read_file(path)
    img = tf.image.decode_image(img, channels=3, expand_animations=False)
    img = tf.image.resize(img, (IMG_SIZE, IMG_SIZE))
    img = normalization(img)
    img = tf.expand_dims(img, axis=0)
    return img

# Run inference
image_paths = sorted([
    p for p in Path(IMAGE_FOLDER).iterdir()
    if p.suffix.lower() in [".jpg", ".jpeg", ".png", ".bmp", ".webp"]
])

if not image_paths:
    print("❌ No images found in:", IMAGE_FOLDER)
    exit(1)

print(f"\nFound {len(image_paths)} images\n")

for img_path in image_paths:
    img = load_image(str(img_path))
    outputs = model.predict(img, verbose=0)
    preds = list(outputs.values())[0][0]


    top_indices = np.argsort(preds)[-TOP_K:][::-1]

    print(f"📸 {img_path.name}")
    for rank, idx in enumerate(top_indices, 1):
        print(f"  {rank}. {class_names[idx]:25s} {preds[idx]*100:.2f}%")
    print("-" * 40)
