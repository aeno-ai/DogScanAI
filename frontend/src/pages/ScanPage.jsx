import { useState, useRef, useCallback } from "react";
import { AlertTriangle, Camera, PawPrint, Stethoscope, Upload, X } from "lucide-react";
import BreedResultCard from "../components/BreedResultCard";
import DiseaseResultCard from "../components/DiseaseResultCard";
import BreedDetailModal from "../components/BreedDetailModal";
import api from "../services/api";

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
      <Badge title="Dog's Emotion:" label={emotion?.class_name} confidence={emotion?.confidence} />
      <Badge title="Estimated Age:" label={age?.class_name} confidence={age?.confidence} />
    </div>
  );
}

export function ScanWorkspace({ inModal = false, onClose = null }) {
  const [mode, setMode] = useState("breed");
  const [preview, setPreview] = useState(null);
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedBreed, setSelectedBreed] = useState(null);
  const [breedLoading, setBreedLoading] = useState(false);
  const fileInputRef = useRef();

  const applyFile = useCallback((f) => {
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError(null);
  }, []);

  const handleReset = useCallback(() => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  async function handleScan() {
    if (!file || loading) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const form = new FormData();
      form.append("image", file);
      const activeMode = SCAN_MODES.find((m) => m.id === mode);
      const { data } = await api.post(activeMode.endpoint, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(data);
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
    if (!breedId || breedLoading) return;
    setBreedLoading(true);
    try {
      const { data } = await api.get(`/api/scans/breed/${breedId}`);
      setSelectedBreed(data);
    } catch {
      // non-fatal
    } finally {
      setBreedLoading(false);
    }
  }

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
                    {result.top_breeds.map((breed, i) => (
                      <BreedResultCard
                        key={breed.breed_id ?? i}
                        breed={breed}
                        rank={i + 1}
                        loading={breedLoading}
                        onTap={() => handleBreedTap(breed.breed_id)}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}

            {result.scan_type === "disease" && (
              <div>
                <h2 className={`text-lg font-bold ${isLight ? "text-gray-900" : "text-white"}`}>Top Disease Matches</h2>
                <p className="text-xs text-gray-500 mt-0.5 mb-3">For reference only. Consult a veterinarian for diagnosis.</p>
                <div className="space-y-3">
                  {result.top_diseases.map((disease, i) => (
                    <DiseaseResultCard key={i} disease={disease} rank={i + 1} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {selectedBreed && <BreedDetailModal breed={selectedBreed} onClose={() => setSelectedBreed(null)} />}
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
