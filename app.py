"""
app.py  —  DogScan AI  |  Flask Model API
Run: python app.py  (dev)  |  gunicorn -w 1 -b 0.0.0.0:5001 app:app  (prod)

Endpoints:
  GET  /health
  POST /predict/breed    { "image": "<base64>" }
  POST /predict/disease  { "image": "<base64>" }
  POST /assistant/chat   { "message": "...", "thread_type": "general|scan", "scan_context": {}, "history": [] }
"""

import os, json, base64, io, logging
import threading
from typing import Any
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image, ImageOps

os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.applications import MobileNetV2
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input, decode_predictions

app = Flask(__name__)
CORS(app, origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5000"])

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(BASE_DIR, "models")


def _get_env_int(name: str, default: int, minimum: int) -> int:
    raw = os.getenv(name, str(default)).strip()
    try:
        value = int(raw)
    except Exception:
        value = default
    return max(minimum, value)


def _get_env_bool(name: str, default: bool = False) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def _clip_text(value: Any, max_chars: int) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    return text[:max_chars]

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

SCAN_MODEL_PATHS = {
    "breed": os.path.join(MODELS_DIR, "trained_model", "dog_breed_model.h5"),
    "emotion": os.path.join(MODELS_DIR, "trained_model", "dog_emotion_model.h5"),
    "age": os.path.join(MODELS_DIR, "trained_model", "dog_age_model.h5"),
    "disease": os.path.join(MODELS_DIR, "trained_model", "dog_skin_disease_model.h5"),
}
EAGER_LOAD_SCAN_MODELS = _get_env_bool("EAGER_LOAD_SCAN_MODELS", False)
_SCAN_MODELS = {name: None for name in SCAN_MODEL_PATHS}
_SCAN_MODELS_LOCK = threading.RLock()


# ---------------------------------------------------------------------------
# Dog Validator — uses MobileNetV2 (ImageNet) to confirm a dog is present.
# ImageNet dog classes span indices 151–268 (inclusive).
# ---------------------------------------------------------------------------

# Confidence threshold: combined probability of all dog classes must exceed
# this value for the image to be accepted as a dog.
DOG_VALIDATOR_THRESHOLD = float(os.getenv("DOG_VALIDATOR_THRESHOLD", "0.20"))

# ImageNet class range for dogs (Keras decode_predictions uses WordNet IDs,
# but we check raw index range for speed).
_IMAGENET_DOG_IDX_MIN = 151
_IMAGENET_DOG_IDX_MAX = 268  # inclusive

_DOG_VALIDATOR_MODEL = None
_DOG_VALIDATOR_LOCK  = threading.Lock()


def _get_dog_validator():
    """Lazy-load MobileNetV2 for dog presence detection."""
    global _DOG_VALIDATOR_MODEL
    if _DOG_VALIDATOR_MODEL is not None:
        return _DOG_VALIDATOR_MODEL
    with _DOG_VALIDATOR_LOCK:
        if _DOG_VALIDATOR_MODEL is None:
            log.info("Loading dog validator (MobileNetV2 ImageNet)...")
            _DOG_VALIDATOR_MODEL = MobileNetV2(weights="imagenet", include_top=True)
            # warm-up
            dummy = np.zeros((1, 224, 224, 3), dtype=np.float32)
            _DOG_VALIDATOR_MODEL.predict(dummy, verbose=0)
            log.info("Dog validator ready (threshold=%.2f)", DOG_VALIDATOR_THRESHOLD)
    return _DOG_VALIDATOR_MODEL


def is_dog_image(pil_img: Image.Image) -> tuple[bool, float]:
    """
    Returns (is_dog, dog_score).

    dog_score = sum of MobileNetV2 softmax probabilities for all ImageNet
    dog classes (indices 151–268).  If dog_score >= DOG_VALIDATOR_THRESHOLD
    the image is accepted as containing a dog.
    """
    validator = _get_dog_validator()

    img = pil_img.convert("RGB").resize((224, 224), Image.LANCZOS)
    arr = np.expand_dims(np.asarray(img, dtype="float32"), 0)
    arr = preprocess_input(arr)                          # MobileNetV2 expects [-1, 1]

    preds = validator.predict(arr, verbose=0)[0]         # shape: (1000,)

    dog_score = float(preds[_IMAGENET_DOG_IDX_MIN : _IMAGENET_DOG_IDX_MAX + 1].sum())
    return dog_score >= DOG_VALIDATOR_THRESHOLD, round(dog_score, 4)


# ---------------------------------------------------------------------------

def _warm_model(model):
    input_shape = model.input_shape
    if isinstance(input_shape, list) and input_shape:
        input_shape = input_shape[0]
    h = int(input_shape[1] or 224)
    w = int(input_shape[2] or 224)
    c = int(input_shape[3] or 3)
    dummy = np.zeros((1, h, w, c), dtype=np.float32)
    model.predict(dummy, verbose=0)


def _get_scan_model(name: str):
    model = _SCAN_MODELS.get(name)
    if model is not None:
        return model

    with _SCAN_MODELS_LOCK:
        model = _SCAN_MODELS.get(name)
        if model is not None:
            return model

        model_path = SCAN_MODEL_PATHS[name]
        log.info("Loading scan model '%s' from %s", name, model_path)
        model = load_model(model_path)
        _warm_model(model)
        _SCAN_MODELS[name] = model
        log.info("Scan model '%s' loaded and warmed", name)
        return model


def _scan_models_status():
    loaded = {k: (v is not None) for k, v in _SCAN_MODELS.items()}
    return {
        "loaded_count": int(sum(1 for x in loaded.values() if x)),
        "loaded": loaded,
        "expected_count": len(_SCAN_MODELS),
        "eager_load_enabled": EAGER_LOAD_SCAN_MODELS,
    }


if EAGER_LOAD_SCAN_MODELS:
    log.info("EAGER_LOAD_SCAN_MODELS=true; loading all scan models at startup")
    for _name in SCAN_MODEL_PATHS:
        _get_scan_model(_name)
else:
    log.info("EAGER_LOAD_SCAN_MODELS=false; scan models will load on first use")

# Assistant RAG config
ASSISTANT_INDEX_DIR = os.path.join(MODELS_DIR, "assistant_index")
ASSISTANT_BREEDS_JSON = os.path.join(BASE_DIR, "frontend", "public", "image", "complete_dog_breeds.json")
ASSISTANT_SYSTEM_GUIDE = os.path.join(BASE_DIR, "backend", "knowledge", "system_guide.md")
ASSISTANT_MODEL_NAME = os.getenv("ASSISTANT_MODEL_NAME", "llama3.2-lite") # MODEL
ASSISTANT_EMBED_MODEL_NAME = os.getenv("ASSISTANT_EMBED_MODEL_NAME", "BAAI/bge-small-en-v1.5")

# --- FIX: Bumped from 2 to 5 so retrieval casts a wider net before filtering ---
ASSISTANT_TOP_K = max(2, int(os.getenv("ASSISTANT_TOP_K", "5")))

ASSISTANT_CONTEXT_WINDOW = _get_env_int("ASSISTANT_CONTEXT_WINDOW", 2048, 256)
ASSISTANT_MAX_OUTPUT_TOKENS = _get_env_int("ASSISTANT_MAX_OUTPUT_TOKENS", 256, 16)
ASSISTANT_KEEP_ALIVE = os.getenv("ASSISTANT_KEEP_ALIVE", "30s").strip() or "30s"
ASSISTANT_HISTORY_TURNS = _get_env_int("ASSISTANT_HISTORY_TURNS", 6, 1)
ASSISTANT_HISTORY_CHARS = _get_env_int("ASSISTANT_HISTORY_CHARS", 500, 64)
ASSISTANT_SCAN_CONTEXT_CHARS = _get_env_int("ASSISTANT_SCAN_CONTEXT_CHARS", 3000, 256)

ASSISTANT_QUERY_ENGINE = None
ASSISTANT_INIT_ERROR = None
ASSISTANT_LLM = None


def _build_system_guide_docs():
    from llama_index.core import Document

    if not os.path.exists(ASSISTANT_SYSTEM_GUIDE):
        return []

    with open(ASSISTANT_SYSTEM_GUIDE, "r", encoding="utf-8") as f:
        raw_text = f.read().strip()

    if not raw_text:
        return []

    docs = []
    current_title = "System Guide"
    current_lines = []

    def flush_section():
        nonlocal current_title, current_lines
        body = "\n".join(current_lines).strip()
        if not body:
            return
        text = f"Section: {current_title}\n\n{body}"
        docs.append(
            Document(
                text=text,
                metadata={
                    "kind": "system_guide",
                    "section": current_title.strip().lower(),
                },
            )
        )

    for line in raw_text.splitlines():
        if line.startswith("## "):
            flush_section()
            current_title = line[3:].strip() or "System Guide"
            current_lines = []
            continue
        if line.startswith("# "):
            continue
        current_lines.append(line)

    flush_section()

    if not docs:
        docs.append(Document(text=raw_text, metadata={"kind": "system_guide"}))

    return docs


def _build_assistant_docs():
    from llama_index.core import Document

    docs = []

    with open(ASSISTANT_BREEDS_JSON, "r", encoding="utf-8") as f:
        breeds = json.load(f)

    for dog in breeds:
        text = f"""
        Breed: {dog.get('display_name', 'Unknown')}
        Size: {dog.get('size', 'Unknown')}
        Description: {dog.get('description', '')}
        Origin: {(dog.get('characteristics') or {}).get('origin', 'Unknown')}
        Breed Group: {(dog.get('characteristics') or {}).get('breed_group', 'Unknown')}
        Lifespan: {(dog.get('characteristics') or {}).get('lifespan_min', '?')}-{(dog.get('characteristics') or {}).get('lifespan_max', '?')} years
        Temperament: {', '.join(dog.get('temperament') or [])}
        Health Considerations: {dog.get('health_considerations', '')}
        Key Health Tips: {dog.get('key_health_tips', '')}
        Physical Traits:
          Snout: {(dog.get('physical_traits') or {}).get('snout', 'Unknown')}
          Ears: {(dog.get('physical_traits') or {}).get('ears', 'Unknown')}
          Coat: {(dog.get('physical_traits') or {}).get('coat', 'Unknown')}
          Tail: {(dog.get('physical_traits') or {}).get('tail', 'Unknown')}
        Measurements:
          Height: {(dog.get('measurements') or {}).get('height_min', '?')}-{(dog.get('measurements') or {}).get('height_max', '?')} inches
          Weight: {(dog.get('measurements') or {}).get('weight_min', '?')}-{(dog.get('measurements') or {}).get('weight_max', '?')} lbs
        """
        docs.append(Document(text=text.strip(), metadata={"kind": "breed", "breed": dog.get("display_name", "")}))

    docs.extend(_build_system_guide_docs())

    return docs


def _init_assistant():
    global ASSISTANT_QUERY_ENGINE
    global ASSISTANT_INIT_ERROR
    global ASSISTANT_LLM

    try:
        from llama_index.core import VectorStoreIndex, StorageContext, load_index_from_storage
        from llama_index.llms.ollama import Ollama
        from llama_index.embeddings.huggingface import HuggingFaceEmbedding

        llm = Ollama(
            model=ASSISTANT_MODEL_NAME,
            request_timeout=120,
            context_window=ASSISTANT_CONTEXT_WINDOW,
            keep_alive=ASSISTANT_KEEP_ALIVE,
            additional_kwargs={"num_predict": ASSISTANT_MAX_OUTPUT_TOKENS},
        )

        ASSISTANT_LLM = llm
        embed = HuggingFaceEmbedding(model_name=ASSISTANT_EMBED_MODEL_NAME)

        if os.path.isdir(ASSISTANT_INDEX_DIR) and os.listdir(ASSISTANT_INDEX_DIR):
            log.info("Loading assistant vector index from disk...")
            storage = StorageContext.from_defaults(persist_dir=ASSISTANT_INDEX_DIR)
            index = load_index_from_storage(storage, embed_model=embed)
        else:
            log.info("Building assistant vector index from documents...")
            docs = _build_assistant_docs()
            if not docs:
                raise RuntimeError("No assistant documents available for indexing.")
            index = VectorStoreIndex.from_documents(docs, embed_model=embed)
            os.makedirs(ASSISTANT_INDEX_DIR, exist_ok=True)
            index.storage_context.persist(persist_dir=ASSISTANT_INDEX_DIR)

        # Store the index so we can use the retriever separately from the LLM
        ASSISTANT_QUERY_ENGINE = index.as_retriever(similarity_top_k=ASSISTANT_TOP_K)
        ASSISTANT_INIT_ERROR = None
        log.info("Assistant RAG engine ready (TOP_K=%d)", ASSISTANT_TOP_K)
    except Exception as e:
        ASSISTANT_QUERY_ENGINE = None
        ASSISTANT_INIT_ERROR = str(e)
        log.exception("Assistant RAG initialization failed")


def _format_history(history: list[dict[str, Any]]) -> str:
    lines = []
    for item in history[-ASSISTANT_HISTORY_TURNS:]:
        role = str(item.get("role", "")).strip().lower()
        content = _clip_text(item.get("content", ""), ASSISTANT_HISTORY_CHARS)
        if not content:
            continue
        if role == "assistant":
            lines.append(f"Assistant: {content}")
        else:
            lines.append(f"User: {content}")
    return "\n".join(lines)


def _compact_scan_context(scan_context: Any) -> str:
    if not isinstance(scan_context, dict):
        return ""

    # ── Breed comparison from the compare modal ──
    if scan_context.get("type") == "breed_comparison":
        breeds = scan_context.get("breeds", [])
        if not isinstance(breeds, list) or not breeds:
            return ""
        lines = [
            f"The user is comparing {len(breeds)} breeds: "
            f"{', '.join(b.get('name', '') for b in breeds if isinstance(b, dict))}\n"
        ]
        for b in breeds:
            if not isinstance(b, dict):
                continue
            lines.append(
                f"Breed: {b.get('name', '?')}\n"
                f"  Size: {b.get('size', '?')} | Origin: {b.get('origin', '?')} | Group: {b.get('group', '?')}\n"
                f"  Lifespan: {b.get('lifespan', '?')} yrs | Height: {b.get('height', '?')} in | Weight: {b.get('weight', '?')} lbs\n"
                f"  Temperament: {', '.join(b.get('temperament') or [])}\n"
                f"  Health: {', '.join(b.get('healthConsiderations') or [])}\n"
                f"  Description: {b.get('description', '')}"
            )
        return _clip_text("\n".join(lines), ASSISTANT_SCAN_CONTEXT_CHARS)

    # ── Original scan handling (breed/disease scans) ──
    compact: dict[str, Any] = {}
    scan_type = str(scan_context.get("scan_type", "")).strip().lower()
    if scan_type in {"breed", "disease"}:
        compact["scan_type"] = scan_type

    if "uploaded_image_url" in scan_context:
        compact["uploaded_image_url"] = _clip_text(scan_context.get("uploaded_image_url"), 512)

    if isinstance(scan_context.get("emotion"), dict):
        emotion = scan_context["emotion"]
        compact["emotion"] = {
            "class_name": _clip_text(emotion.get("class_name", ""), 80),
            "display_name": _clip_text(emotion.get("display_name", ""), 80),
            "confidence": emotion.get("confidence"),
        }

    if isinstance(scan_context.get("age"), dict):
        age = scan_context["age"]
        compact["age"] = {
            "class_name": _clip_text(age.get("class_name", ""), 80),
            "display_name": _clip_text(age.get("display_name", ""), 80),
            "confidence": age.get("confidence"),
        }

    top_breeds = scan_context.get("top_breeds")
    if isinstance(top_breeds, list) and top_breeds:
        compact["top_breeds"] = []
        for item in top_breeds[:5]:
            if not isinstance(item, dict):
                continue
            compact["top_breeds"].append({
                "rank": item.get("rank"),
                "breed_id": item.get("breed_id"),
                "class_name": _clip_text(item.get("class_name", ""), 100),
                "display_name": _clip_text(item.get("display_name", ""), 100),
                "confidence": item.get("confidence"),
                "mix_share": item.get("mix_share"),
            })

    top_diseases = scan_context.get("top_diseases")
    if isinstance(top_diseases, list) and top_diseases:
        compact["top_diseases"] = []
        for item in top_diseases[:5]:
            if not isinstance(item, dict):
                continue
            compact["top_diseases"].append({
                "rank": item.get("rank"),
                "class_name": _clip_text(item.get("class_name", ""), 100),
                "display_name": _clip_text(item.get("display_name", ""), 100),
                "confidence": item.get("confidence"),
                "severity": _clip_text(item.get("severity", ""), 40),
                "description": _clip_text(item.get("description", ""), 220),
                "treatment": _clip_text(item.get("treatment", ""), 220),
            })

    text = json.dumps(compact, ensure_ascii=False, separators=(",", ":"))
    return _clip_text(text, ASSISTANT_SCAN_CONTEXT_CHARS)


# ---------------------------------------------------------------------------
# FIX: Build a short, focused retrieval query from the user message +
# breed/disease names from the scan context.  This is what gets embedded
# and compared against the vector index — keeping it clean means the right
# breed/disease document is actually retrieved.
# ---------------------------------------------------------------------------
def _build_retrieval_query(message: str, scan_context: Any) -> str:
    parts = [message.strip()]

    if isinstance(scan_context, dict):
        # Breed scan — pull top breed display names
        top_breeds = scan_context.get("top_breeds") or []
        for b in top_breeds[:2]:
            if isinstance(b, dict):
                name = b.get("display_name") or b.get("class_name", "")
                if name:
                    parts.append(name)

        # Disease scan — pull top disease display names
        top_diseases = scan_context.get("top_diseases") or []
        for d in top_diseases[:2]:
            if isinstance(d, dict):
                name = d.get("display_name") or d.get("class_name", "")
                if name:
                    parts.append(name)

        # Breed comparison modal
        breeds = scan_context.get("breeds") or []
        for b in breeds[:2]:
            if isinstance(b, dict):
                name = b.get("name", "")
                if name:
                    parts.append(name)

    query = " ".join(p for p in parts if p)
    log.info("RAG retrieval query: %r", query)
    return query


# ---------------------------------------------------------------------------
# FIX: _build_assistant_prompt now accepts retrieved_context as a separate
# parameter so the LLM always gets the correctly fetched breed/disease docs,
# not whatever happened to be embedded alongside the system prompt noise.
# ---------------------------------------------------------------------------
def _build_assistant_prompt(
    message: str,
    thread_type: str,
    scan_context: Any,
    history: list[dict[str, Any]],
    retrieved_context: str = "",
) -> str:
    history_text = _format_history(history)
    context_text = ""
    if thread_type == "scan" and isinstance(scan_context, dict):
        context_text = _compact_scan_context(scan_context)

    return f"""
You are Casper, the DogScan AI assistant.

Primary responsibilities:
- Explain dog scan results in clear and practical language.
- Explain breed traits, care, and behavior guidance using DogScan knowledge first.
- Explain DogScan AI app navigation, features, and tutorials when asked.

Safety rules:
- Do not provide veterinary diagnosis.
- For disease/health concerns, clearly recommend consulting a licensed veterinarian.
- If user asks for harmful/offensive content, refuse politely and redirect to safe dog-care help.

Language style:
- Default to English.
- If the user speaks another language, reply in that language.
- Keep answers concise and easy for first-time dog owners.

Knowledge base (use this to answer accurately):
{retrieved_context or "N/A"}

Scan context (if available):
{context_text or "N/A"}

Chat history:
{history_text or "N/A"}

User message:
{message}
""".strip()


# ---------------------------------------------------------------------------
# FIX: Retrieval and generation are now two separate steps.
# Step 1 — retrieve docs using the clean short query (_build_retrieval_query)
# Step 2 — call the LLM with the full prompt that includes those retrieved docs
# Previously, the full system prompt was passed directly to query_engine.query()
# which used it as the search query, returning irrelevant documents.
# ---------------------------------------------------------------------------
def generate_assistant_reply(
    message: str,
    thread_type: str,
    scan_context: Any,
    history: list[dict[str, Any]],
) -> str:
    if ASSISTANT_QUERY_ENGINE is None:
        raise RuntimeError(ASSISTANT_INIT_ERROR or "Assistant engine not initialized.")
    if ASSISTANT_LLM is None:
        raise RuntimeError("LLM not initialized.")

    is_breed_compare = (
        isinstance(scan_context, dict)
        and scan_context.get("type") == "breed_comparison"
    )

    try:
        if is_breed_compare:
            # Breed comparison already has all the data in scan_context,
            # so we skip RAG and call the LLM directly.
            log.info("breed_comparison: bypassing RAG, calling LLM directly")
            prompt = _build_assistant_prompt(message, thread_type, scan_context, history)
            response = ASSISTANT_LLM.complete(prompt)
            text = str(response).strip()
        else:
            # Step 1: retrieve relevant docs with a focused query
            retrieval_query = _build_retrieval_query(message, scan_context)
            nodes = ASSISTANT_QUERY_ENGINE.retrieve(retrieval_query)

            retrieved_context = "\n\n".join(
                n.get_content() for n in nodes if n.get_content().strip()
            )
            log.info(
                "Retrieved %d nodes for query %r",
                len(nodes),
                retrieval_query,
            )

            # Step 2: build the full prompt with retrieved docs injected,
            # then call the LLM directly (not query_engine.query)
            prompt = _build_assistant_prompt(
                message,
                thread_type,
                scan_context,
                history,
                retrieved_context=retrieved_context,
            )
            response = ASSISTANT_LLM.complete(prompt)
            text = str(response).strip()

    except Exception as e:
        log.exception("LLM call failed: %s", str(e))
        raise

    if not text:
        raise RuntimeError("Assistant returned an empty response.")
    return text


_init_assistant()

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
    mix_pct = top_probs * 100.0
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
            "confidence":   round(raw * 100, 2)
        })

    result_type = "pure_breed" if is_pure else ("mixed_breed" if is_mixed else "uncertain")
    return {"result_type": result_type, "top_breeds": top_breeds, "entropy": round(entropy, 4), "reasons": reasons}


@app.get("/health")
def health():
    scan_status = _scan_models_status()
    return jsonify({
        "status": "ok",
        "models_loaded": scan_status["loaded_count"],
        "models_expected": scan_status["expected_count"],
        "scan_models": scan_status["loaded"],
        "eager_load_scan_models": scan_status["eager_load_enabled"],
        "assistant_ready": ASSISTANT_QUERY_ENGINE is not None,
        "assistant_error": ASSISTANT_INIT_ERROR,
        "dog_validator_threshold": DOG_VALIDATOR_THRESHOLD,
    })


@app.post("/predict/breed")
def predict_breed():
    body = request.get_json(force=True, silent=True) or {}
    if "image" not in body:
        return jsonify({"error": "Missing 'image' field (base64)"}), 400

    try:
        pil_img = decode_image(body["image"])
    except Exception as e:
        return jsonify({"error": f"Image decode failed: {e}"}), 422

    # ── Dog presence validation ──────────────────────────────────────────────
    try:
        dog_detected, dog_score = is_dog_image(pil_img)
        log.info("Breed endpoint — dog_score=%.4f threshold=%.2f accepted=%s",
                 dog_score, DOG_VALIDATOR_THRESHOLD, dog_detected)
    except Exception as e:
        log.exception("Dog validator error (breed)")
        return jsonify({"error": f"Dog validation failed: {e}"}), 500

    if not dog_detected:
        return jsonify({
            "error": "no_dog_detected",
            "message": "No dog detected in the uploaded image. Please upload a clear photo of a dog.",
            "dog_score": dog_score,
            "threshold": DOG_VALIDATOR_THRESHOLD,
        }), 422
    # ────────────────────────────────────────────────────────────────────────

    try:
        breed_model   = _get_scan_model("breed")
        emotion_model = _get_scan_model("emotion")
        age_model     = _get_scan_model("age")

        breed_data = analyze_breed(predict_with_tta(pil_img, breed_model))
        emotion    = top1_result(predict_simple(pil_img, emotion_model), EMOTION_LABELS)
        age        = top1_result(predict_simple(pil_img, age_model), AGE_LABELS)
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
        "dog_score":   dog_score,
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

    # ── Dog presence validation ──────────────────────────────────────────────
    try:
        dog_detected, dog_score = is_dog_image(pil_img)
        log.info("Disease endpoint — dog_score=%.4f threshold=%.2f accepted=%s",
                 dog_score, DOG_VALIDATOR_THRESHOLD, dog_detected)
    except Exception as e:
        log.exception("Dog validator error (disease)")
        return jsonify({"error": f"Dog validation failed: {e}"}), 500

    if not dog_detected:
        return jsonify({
            "error": "no_dog_detected",
            "message": "No dog detected in the uploaded image. Please upload a clear photo of a dog.",
            "dog_score": dog_score,
            "threshold": DOG_VALIDATOR_THRESHOLD,
        }), 422
    # ────────────────────────────────────────────────────────────────────────

    try:
        disease_model = _get_scan_model("disease")
        preds = predict_simple(pil_img, disease_model)
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

    return jsonify({
        "scan_type":    "disease",
        "top_diseases": diseases,
        "dog_score":    dog_score,
    })


@app.post("/assistant/chat")
def assistant_chat():
    body = request.get_json(force=True, silent=True) or {}

    message = str(body.get("message", "")).strip()
    if not message:
        return jsonify({"error": "message is required"}), 400

    thread_type = str(body.get("thread_type", "general")).strip().lower()
    if thread_type not in {"general", "scan"}:
        return jsonify({"error": "thread_type must be 'general' or 'scan'"}), 400

    scan_context = body.get("scan_context")
    history = body.get("history")
    if not isinstance(history, list):
        history = []
    history = [item for item in history if isinstance(item, dict)]

    try:
        reply = generate_assistant_reply(message, thread_type, scan_context, history)
        return jsonify({"reply": reply})
    except Exception as e:
        log.exception("=== generate_assistant_reply FAILED")
        return jsonify({"error": f"Assistant unavailable: {e}"}), 503


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=False)
