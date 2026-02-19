// frontend/src/components/scan/DiseaseResultCard.jsx

const SEVERITY_COLOR = {
  mild: "#22c55e",
  moderate: "#f59e0b",
  severe: "#ef4444",
};

export default function DiseaseResultCard({ disease, rank }) {
  const confidence = disease.confidence ?? 0;
  const sevColor = SEVERITY_COLOR[disease.severity?.toLowerCase()] ?? "#6b7280";

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
      <div className="flex items-start gap-3">
        {/* Rank */}
        <div className="text-sm font-black text-gray-500 w-5 shrink-0 mt-0.5">#{rank}</div>

        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-base">{disease.display_name ?? disease.class_name}</span>
            {disease.severity && (
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium"
                style={{ background: sevColor + "22", color: sevColor, border: `1px solid ${sevColor}55` }}
              >
                {disease.severity}
              </span>
            )}
          </div>

          {/* Confidence bar */}
          <div className="flex items-center gap-2 mt-2">
            <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${confidence}%`,
                  background: `linear-gradient(90deg, #f59e0b, #ef4444)`,
                }}
              />
            </div>
            <span className="text-xs font-medium text-amber-600 shrink-0">{confidence}%</span>
          </div>

          {/* Description */}
          {disease.description && (
            <p className="text-xs text-gray-600 mt-2 leading-relaxed">{disease.description}</p>
          )}

          {/* Treatment */}
          {disease.treatment && (
            <div className="mt-2 bg-green-50 border border-green-200 rounded-lg p-2">
              <div className="text-xs font-semibold text-green-700 mb-0.5">Recommended Action</div>
              <p className="text-xs text-gray-700">{disease.treatment}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
