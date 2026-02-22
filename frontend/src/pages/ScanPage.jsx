import { useState, useRef, useCallback } from "react";
import { AlertTriangle, Camera, Loader2, PawPrint, Stethoscope, Upload, X } from "lucide-react";
import BreedResultCard from "../components/BreedResultCard";
import DiseaseResultCard from "../components/DiseaseResultCard";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";

const SCAN_MODES = [
  {
    id: "breed",
    label: "Breed Scan",
    icon: PawPrint,
    description: "Identify breed, emotion and age",
    endpoint: "/api/scans/breed",
  },
  {
    id: "disease",
    label: "Disease Scan",
    icon: Stethoscope,
    description: "Detect skin conditions",
    endpoint: "/api/scans/disease",
  },
];

function EmotionAgeBadges({ emotion, age, light = false }) {
  const Badge = ({ title, label, confidence }) => (
    <div className={`flex-1 rounded-xl p-3 text-center border ${light ? "bg-white border-gray-200" : "bg-[#1a1a2e] border-gray-700"}`}>
      <div className={`text-xs mb-1 ${light ? "text-gray-500" : "text-gray-400"}`}>{title}</div>
      <div className={`font-semibold capitalize ${light ? "text-gray-900" : "text-white"}`}>{label ?? "-"}</div>
      {confidence != null && <div className={`text-xs mt-0.5 ${light ? "text-blue-600" : "text-indigo-400"}`}>{confidence}%</div>}
    </div>
  );

  return (
    <div className="flex gap-3">
      <Badge title="Detected Emotion:" label={emotion?.class_name} confidence={emotion?.confidence} />
      <Badge title="Estimated Age:" label={age?.class_name} confidence={age?.confidence} />
    </div>
  );
}

export function ScanWorkspace({ inModal = false, onClose = null }) {
  const { token } = useAuth();
  const toast = useToast();
  const [mode, setMode] = useState("breed");
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [expandedBreedId, setExpandedBreedId] = useState(null);
  const [breedDetails, setBreedDetails] = useState({});
  const [loadingBreedId, setLoadingBreedId] = useState(null);
  const [historySaveState, setHistorySaveState] = useState("idle");
  const fileInputRef = useRef();

  const getAuthHeaders = useCallback(() => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [token]);

  const applyFile = useCallback((f) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError(null);
    setExpandedBreedId(null);
    setBreedDetails({});
    setLoadingBreedId(null);
    setHistorySaveState("idle");
  }, []);

  const handleReset = useCallback(() => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setExpandedBreedId(null);
    setBreedDetails({});
    setLoadingBreedId(null);
    setHistorySaveState("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  async function handleScan() {
    if (!file || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setHistorySaveState("idle");

    try {
      const form = new FormData();
      form.append("image", file);
      const activeMode = SCAN_MODES.find((m) => m.id === mode);
      const { data } = await api.post(activeMode.endpoint, form, {
        headers: {
          "Content-Type": "multipart/form-data",
          ...getAuthHeaders(),
        },
      });
      setResult(data);
      setExpandedBreedId(null);
      setBreedDetails({});
      setLoadingBreedId(null);
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        (err?.response?.status === 503
          ? "AI service is starting up, please try again in a moment."
          : "Scan failed. Please try again.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  async function handleBreedTap(breedId) {
    if (!breedId) return;
    if (expandedBreedId === breedId) {
      setExpandedBreedId(null);
      return;
    }

    if (breedDetails[breedId]) {
      setExpandedBreedId(breedId);
      return;
    }

    if (loadingBreedId === breedId) return;

    setLoadingBreedId(breedId);
    try {
      const { data } = await api.get(`/api/scans/breed/${breedId}`, {
        headers: getAuthHeaders(),
      });
      setBreedDetails((prev) => ({ ...prev, [breedId]: data }));
      setExpandedBreedId(breedId);
    } catch {
      toast.warning("Could not load breed details right now.");
    } finally {
      setLoadingBreedId(null);
    }
  }

  function renderTemperament(value) {
    if (Array.isArray(value)) return value.filter(Boolean);
    if (typeof value !== "string") return [];
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      return trimmed
        .slice(1, -1)
        .split(",")
        .map((item) => item.replace(/^"|"$/g, "").trim())
        .filter(Boolean);
    }
    return trimmed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  function formatRange(min, max, unit = "") {
    const hasMin = min !== null && min !== undefined && min !== "";
    const hasMax = max !== null && max !== undefined && max !== "";

    if (!hasMin && !hasMax) return "Unknown";
    if (hasMin && hasMax) return `${min}-${max}${unit ? ` ${unit}` : ""}`;
    if (hasMin) return `${min}${unit ? ` ${unit}` : ""}`;
    return `${max}${unit ? ` ${unit}` : ""}`;
  }

  const buildHistoryPayload = useCallback(() => {
    if (!result) return null;

    let predictions = [];
    if (result.scan_type === "breed") {
      const topBreeds = Array.isArray(result.top_breeds)
        ? result.top_breeds
        : Array.isArray(result.predictions)
        ? result.predictions
        : [];
      const totalBreedConfidence = topBreeds.reduce(
        (sum, breed) => sum + Number(breed?.confidence ?? 0),
        0
      );
      predictions = topBreeds.map((breed, idx) => ({
        confidence: Number(
          breed?.mix_share != null
            ? breed.mix_share
            : totalBreedConfidence > 0
            ? (Number(breed?.confidence ?? 0) / totalBreedConfidence) * 100
            : 0
        ),
        rank: idx + 1,
        breed_id: breed?.breed_id ?? null,
        class_name: breed?.class_name ?? "",
        display_name: breed?.display_name ?? breed?.class_name ?? "",
      }));
    } else if (result.scan_type === "disease") {
      const topDiseases = Array.isArray(result.top_diseases) ? result.top_diseases : [];
      const totalDiseaseConfidence = topDiseases.reduce(
        (sum, disease) => sum + Number(disease?.confidence ?? 0),
        0
      );
      predictions = topDiseases.map((disease, idx) => ({
        confidence: Number(
          disease?.mix_share != null
            ? disease.mix_share
            : totalDiseaseConfidence > 0
            ? (Number(disease?.confidence ?? 0) / totalDiseaseConfidence) * 100
            : 0
        ),
        rank: idx + 1,
        breed_id: null,
        class_name: disease?.class_name ?? disease?.display_name ?? `disease_${idx + 1}`,
        display_name: disease?.display_name ?? disease?.class_name ?? `Disease ${idx + 1}`,
      }));
    }

    if (predictions.length === 0) return null;

    const imageUrl = typeof result?.uploaded_image_url === "string"
      ? result.uploaded_image_url
      : "";

    return { image_url: imageUrl, predictions };
  }, [result]);

  async function handleSaveToHistory() {
    if (historySaveState === "saving" || historySaveState === "saved") return;

    const payload = buildHistoryPayload();
    if (!payload) {
      toast.error("No scan result available to save.");
      return;
    }

    setHistorySaveState("saving");
    try {
      if (payload.image_url) {
        await api.post("/api/scans", payload, {
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
        });
      } else if (file) {
        const form = new FormData();
        form.append("image", file);
        form.append("predictions", JSON.stringify(payload.predictions));

        await api.post("/api/scans", form, {
          headers: {
            ...getAuthHeaders(),
          },
        });
      } else {
        throw new Error("No image available to save.");
      }

      setHistorySaveState("saved");
      toast.success("Scan saved to history.");
    } catch (err) {
      setHistorySaveState("error");
      if (err?.response?.status === 401) {
        toast.error("Please log in again to save history.");
      } else {
        const message = err?.response?.data?.error || "Failed to save history. You can try again.";
        toast.warning(message);
      }
    }
  }

  const renderSaveButton = () => (
    <div className="mt-4">
      <button
        onClick={handleSaveToHistory}
        disabled={historySaveState === "saving" || historySaveState === "saved"}
        className={`w-full sm:w-auto px-4 py-2 rounded-lg text-sm font-semibold transition-colors inline-flex items-center justify-center gap-2 ${
          historySaveState === "saved"
            ? "bg-green-100 text-green-700 border border-green-300 cursor-default"
            : "bg-blue-600 text-white hover:bg-blue-700"
        } ${historySaveState === "saving" ? "opacity-80 cursor-not-allowed" : ""}`}
      >
        {historySaveState === "saving" && <Loader2 className="w-4 h-4 animate-spin" />}
        {historySaveState === "saving"
          ? "Saving..."
          : historySaveState === "saved"
          ? "Saved to History"
          : "Save to History"}
      </button>
      {historySaveState === "error" && (
        <p className={`mt-2 text-xs ${isLight ? "text-red-600" : "text-red-400"}`}>
          Could not save right now. Check your connection and try again.
        </p>
      )}
    </div>
  );

  const currentMode = SCAN_MODES.find((m) => m.id === mode);
  const isLight = inModal;

  return (
    <div className={inModal ? "text-gray-900" : "min-h-screen bg-[#0f0f1a] text-white p-4 md:p-8 max-w-2xl mx-auto"}>
      <div className={inModal ? "max-w-2xl mx-auto p-4 md:p-6" : ""}>
        <div className="flex items-start justify-end gap-3 mb-1">
          {inModal && onClose && (
            <button
              onClick={onClose}
              className="h-9 w-9 rounded-full bg-white border border-gray-300 text-gray-600 hover:text-red-600 hover:border-red-300 transition-colors inline-flex items-center justify-center"
              aria-label="Close scan modal"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="flex gap-3 mb-6">
          {SCAN_MODES.map((m) => {
            const ModeIcon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => {
                  setMode(m.id);
                  handleReset();
                }}
                className={`flex-1 py-3 px-4 rounded-xl border text-sm font-medium transition-all ${
                  mode === m.id
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 border-indigo-500 text-white shadow-lg"
                    : isLight
                      ? "bg-white border-gray-200 text-gray-600 hover:border-blue-400"
                      : "bg-[#1a1a2e] border-gray-700 text-gray-400 hover:border-indigo-500"
                }`}
              >
                <div className="flex justify-center mb-1">
                  <ModeIcon className="w-6 h-6" />
                </div>
                <div className="font-semibold">{m.label}</div>
                <div className="text-xs opacity-70 mt-0.5">{m.description}</div>
              </button>
            );
          })}
        </div>

        <div className="mb-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files[0];
              if (f) applyFile(f);
            }}
          />
          <div
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors ${
              isLight ? "border-gray-300 hover:border-blue-500 bg-white" : "border-gray-600 hover:border-indigo-500"
            }`}
            onClick={() => !preview && fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f?.type.startsWith("image/")) applyFile(f);
            }}
          >
            {preview ? (
              <div className="relative">
                <img src={preview} alt="preview" className="max-h-64 mx-auto rounded-xl object-contain" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReset();
                  }}
                  className="absolute top-2 right-2 bg-black/60 rounded-full w-7 h-7 flex items-center justify-center text-white hover:bg-red-600 transition-colors"
                  aria-label="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="py-8 select-none">
                <div className="flex justify-center mb-3">
                  <Upload className="w-12 h-12 text-indigo-400" />
                </div>
                <p className="text-gray-400">
                  Drag and drop or <span className={isLight ? "text-blue-600" : "text-indigo-400"}>click to upload</span>
                </p>
                <p className={`text-xs mt-1 ${isLight ? "text-gray-500" : "text-gray-600"}`}>JPG, PNG, WEBP up to 10 MB</p>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleScan}
          disabled={!file || loading}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-white transition-all text-lg mb-6 inline-flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Analyzing...
            </>
          ) : (
            <>
              <Camera className="w-5 h-5" />
              {`Run ${currentMode.label}`}
            </>
          )}
        </button>

        {error && (
          <div className={`rounded-xl p-4 mb-4 text-sm flex items-start gap-2 ${isLight ? "bg-red-50 border border-red-200 text-red-700" : "bg-red-900/40 border border-red-700 text-red-300"}`}>
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            {result.scan_type === "breed" && (
              <>
                <EmotionAgeBadges emotion={result.emotion} age={result.age} light={isLight} />
                <div>
                  <h2 className={`text-lg font-bold ${isLight ? "text-gray-900" : "text-white"}`}>Top Breed Matches</h2>
                  <p className={`text-xs mt-0.5 mb-3 ${isLight ? "text-gray-500" : "text-gray-500"}`}>Tap a card to view full breed profile</p>
                  <div className="space-y-3">
                    {(Array.isArray(result.top_breeds) ? result.top_breeds : []).map((breed, i) => (
                      <div key={breed.breed_id ?? i} className="space-y-2">
                        <BreedResultCard
                          breed={breed}
                          rank={i + 1}
                          onTap={() => handleBreedTap(breed.breed_id)}
                        />

                        {expandedBreedId === breed.breed_id && (
                          <div
                            className={`rounded-2xl border p-4 ${
                              isLight
                                ? "bg-white border-gray-200"
                                : "bg-[#1a1a2e] border-gray-700"
                            }`}
                          >
                            {loadingBreedId === breed.breed_id && !breedDetails[breed.breed_id] && (
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Loading breed details...
                              </div>
                            )}

                            {breedDetails[breed.breed_id] && (
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3 text-sm">
                                  <div>
                                    <span className={isLight ? "text-gray-500" : "text-gray-400"}>Size: </span>
                                    <span className={isLight ? "text-gray-900" : "text-white"}>{breedDetails[breed.breed_id].size || "Unknown"}</span>
                                  </div>
                                  <div>
                                    <span className={isLight ? "text-gray-500" : "text-gray-400"}>Popularity: </span>
                                    <span className={isLight ? "text-gray-900" : "text-white"}>
                                      {breedDetails[breed.breed_id].popularity_score ?? "N/A"}
                                    </span>
                                  </div>
                                </div>

                                <p className={`text-sm ${isLight ? "text-gray-700" : "text-gray-300"}`}>
                                  {breedDetails[breed.breed_id].description || "No description available."}
                                </p>

                                <div>
                                  <p className={`text-xs font-semibold mb-2 ${isLight ? "text-gray-600" : "text-gray-300"}`}>
                                    Physical Traits
                                  </p>
                                  <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div className={`rounded-lg px-3 py-2 ${isLight ? "bg-gray-50 text-gray-800" : "bg-[#111124] text-gray-200"}`}>
                                      <span className={isLight ? "text-gray-500" : "text-gray-400"}>Snout: </span>
                                      {breedDetails[breed.breed_id].snout || "Unknown"}
                                    </div>
                                    <div className={`rounded-lg px-3 py-2 ${isLight ? "bg-gray-50 text-gray-800" : "bg-[#111124] text-gray-200"}`}>
                                      <span className={isLight ? "text-gray-500" : "text-gray-400"}>Ears: </span>
                                      {breedDetails[breed.breed_id].ears || "Unknown"}
                                    </div>
                                    <div className={`rounded-lg px-3 py-2 ${isLight ? "bg-gray-50 text-gray-800" : "bg-[#111124] text-gray-200"}`}>
                                      <span className={isLight ? "text-gray-500" : "text-gray-400"}>Coat: </span>
                                      {breedDetails[breed.breed_id].coat || "Unknown"}
                                    </div>
                                    <div className={`rounded-lg px-3 py-2 ${isLight ? "bg-gray-50 text-gray-800" : "bg-[#111124] text-gray-200"}`}>
                                      <span className={isLight ? "text-gray-500" : "text-gray-400"}>Tail: </span>
                                      {breedDetails[breed.breed_id].tail || "Unknown"}
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <p className={`text-xs font-semibold mb-2 ${isLight ? "text-gray-600" : "text-gray-300"}`}>
                                    Measurements
                                  </p>
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                      <span className={isLight ? "text-gray-500" : "text-gray-400"}>Height: </span>
                                      <span className={isLight ? "text-gray-900" : "text-white"}>
                                        {formatRange(
                                          breedDetails[breed.breed_id].height_min,
                                          breedDetails[breed.breed_id].height_max,
                                          "in"
                                        )}
                                      </span>
                                    </div>
                                    <div>
                                      <span className={isLight ? "text-gray-500" : "text-gray-400"}>Weight: </span>
                                      <span className={isLight ? "text-gray-900" : "text-white"}>
                                        {formatRange(
                                          breedDetails[breed.breed_id].weight_min,
                                          breedDetails[breed.breed_id].weight_max,
                                          "lbs"
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <p className={`text-xs font-semibold mb-2 ${isLight ? "text-gray-600" : "text-gray-300"}`}>
                                    Characteristics
                                  </p>
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                      <span className={isLight ? "text-gray-500" : "text-gray-400"}>Breed Group: </span>
                                      <span className={isLight ? "text-gray-900" : "text-white"}>{breedDetails[breed.breed_id].breed_group || "Unknown"}</span>
                                    </div>
                                    <div>
                                      <span className={isLight ? "text-gray-500" : "text-gray-400"}>Origin: </span>
                                      <span className={isLight ? "text-gray-900" : "text-white"}>{breedDetails[breed.breed_id].origin || "Unknown"}</span>
                                    </div>
                                    <div>
                                      <span className={isLight ? "text-gray-500" : "text-gray-400"}>Lifespan: </span>
                                      <span className={isLight ? "text-gray-900" : "text-white"}>
                                        {formatRange(
                                          breedDetails[breed.breed_id].lifespan_min,
                                          breedDetails[breed.breed_id].lifespan_max,
                                          "years"
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                <div>
                                  <p className={`text-xs font-semibold mb-2 ${isLight ? "text-gray-600" : "text-gray-300"}`}>
                                    Temperament
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {renderTemperament(breedDetails[breed.breed_id].temperament).map((temp) => (
                                      <span
                                        key={temp}
                                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                                          isLight ? "bg-blue-100 text-blue-700" : "bg-indigo-900/40 text-indigo-300"
                                        }`}
                                      >
                                        {temp}
                                      </span>
                                    ))}
                                  </div>
                                </div>

                                {breedDetails[breed.breed_id].health_considerations && (
                                  <div>
                                    <p className={`text-xs font-semibold mb-1 ${isLight ? "text-gray-600" : "text-gray-300"}`}>
                                      Health Considerations
                                    </p>
                                    <p className={`text-sm ${isLight ? "text-gray-700" : "text-gray-300"}`}>
                                      {breedDetails[breed.breed_id].health_considerations}
                                    </p>
                                  </div>
                                )}

                                {breedDetails[breed.breed_id].key_health_tips && (
                                  <div className={`rounded-lg px-3 py-2 text-sm ${isLight ? "bg-green-50 text-green-800 border border-green-200" : "bg-green-950/30 text-green-300 border border-green-900"}`}>
                                    <span className="font-semibold">Key Health Tips: </span>
                                    {breedDetails[breed.breed_id].key_health_tips}
                                  </div>
                                )}

                                <div className="pt-1">
                                  <button
                                    onClick={() => window.location.assign(`/breeds/${breed.breed_id}`)}
                                    className={`text-sm font-medium ${isLight ? "text-blue-600 hover:text-blue-700" : "text-indigo-300 hover:text-indigo-200"}`}
                                  >
                                    View full breed page
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {renderSaveButton()}
                </div>
              </>
            )}

            {result.scan_type === "disease" && (
              <div>
                <h2 className={`text-lg font-bold ${isLight ? "text-gray-900" : "text-white"}`}>Top Disease Matches</h2>
                <p className="text-xs text-gray-500 mt-0.5 mb-3">For reference only. Consult a veterinarian for diagnosis.</p>
                <div className="space-y-3">
                  {(Array.isArray(result.top_diseases) ? result.top_diseases : []).map((disease, i) => (
                    <DiseaseResultCard key={i} disease={disease} rank={i + 1} />
                  ))}
                </div>
                {renderSaveButton()}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ScanPage() {
  return (
    <div className="min-h-screen bg-[#0f0f1a]">
      <ScanWorkspace />
    </div>
  );
}
