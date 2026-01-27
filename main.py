from fastapi import FastAPI, File, UploadFile
from fastapi.responses import HTMLResponse
from PIL import Image
import io
import numpy as np
import tensorflow as tf
import json

from tensorflow.keras.applications.mobilenet_v2 import (
    MobileNetV2,
    preprocess_input,
    decode_predictions
)


app = FastAPI()

#pre-trained model daw
model = MobileNetV2(weights = "imagenet")

@app.get("/", response_class=HTMLResponse)
def home():
    return """
    <html>
      <body>
        <h1>DogScan Test</h1>
        <form action="/predict" method="post" enctype="multipart/form-data">
          <input type="file" name="file" required>
          <button type="submit">Predict</button>
        </form>
      </body>
    </html>
    """

@app.post("/predict", response_class=HTMLResponse)
async def predict(file: UploadFile = File(...)):
    image_bytes = await file.read()

    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    image = image.resize((224, 224))

    array = np.array(image)
    array = np.expand_dims(array, axis=0)
    array = preprocess_input(array)
    predictions = model.predict(array)
    decoded = decode_predictions(predictions, top=5)[0]
    
    result = "<h2>Predictions</h2><ul>"
    for _, name, confidence in decoded:
        result += f"<li>{name}: {confidence:.2f}</li>"
    result += "</ul>"

    return result


IMG_SIZE = 224

def load_model_and_labels(model_dir="dog_efficientnetv2b0/saved_model",
                          labels_file="dog_efficientnetv2b0/class_names.json"):
    model = tf.keras.models.load_model(model_dir)
    with open(labels_file, "r", encoding="utf-8") as f:
        class_names = json.load(f)
    return model, class_names

def preprocess_image(path, img_size=IMG_SIZE):
    img = Image.open(path).convert("RGB").resize((img_size, img_size))
    arr = np.asarray(img).astype("float32") / 255.0
    return np.expand_dims(arr, axis=0)  # batch dim

def predict_image(path, model, class_names, top_k=5):
    x = preprocess_image(path)
    preds = model.predict(x)[0]
    top_idxs = preds.argsort()[-top_k:][::-1]
    return [(class_names[i], float(preds[i])) for i in top_idxs]

if __name__ == "__main__":
    model, class_names = load_model_and_labels()
    img_path = "path/to/example.jpg"  # change to your image
    results = predict_image(img_path, model, class_names, top_k=5)
    for name, prob in results:
        print(f"{name}: {prob:.4f}")

