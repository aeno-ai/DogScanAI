import { ChevronRight, Dog } from "lucide-react";
import { buildBreedImagePath } from "../utils/breedImage";

const RANK_COLORS = ["#f59e0b", "#9ca3af", "#b45309"];

function renderTemperament(value) {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed
      .slice(1, -1)
      .split(",")
      .map((v) => v.replace(/^"|"$/g, "").trim())
      .filter(Boolean)
      .join(", ");
  }
  return trimmed;
}

export default function BreedResultCard({ breed, rank, onTap }) {
  const db = breed.db_info;
  const confidence = breed.confidence ?? 0;
  const rankColor = RANK_COLORS[rank - 1] ?? "#6b7280";
  const imagePath = buildBreedImagePath(breed.breed_id, breed.class_name);
  const temperamentText = renderTemperament(db?.temperament);

  return (
    <button
      onClick={onTap}
      className="w-full text-left bg-white border border-gray-200 hover:border-blue-500 rounded-2xl p-4 transition-all active:scale-[0.98] flex gap-4 items-start shadow-sm"
    >
      <div
        className="text-lg font-black w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1"
        style={{ background: rankColor + "22", color: rankColor, border: `1.5px solid ${rankColor}` }}
      >
        {rank}
      </div>

      <img
        src={imagePath}
        alt={breed.display_name ?? breed.class_name}
        className="w-16 h-16 rounded-xl object-cover shrink-0 bg-gray-100"
        onError={(e) => {
          e.currentTarget.style.display = "none";
          const fallback = e.currentTarget.nextElementSibling;
          if (fallback) fallback.classList.remove("hidden");
        }}
      />
      <div className="hidden w-16 h-16 rounded-xl bg-gray-100 items-center justify-center shrink-0 text-gray-400">
        <Dog className="w-7 h-7" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="font-bold text-base truncate">{breed.display_name ?? breed.class_name}</div>
        {db && (
          <div className="text-xs text-gray-400 mt-0.5">
            {db.breed_group && <span>{db.breed_group}</span>}
            {db.origin && <span>{db.origin}</span>}
          </div>
        )}
        {temperamentText && <div className="text-xs text-gray-500 truncate mt-0.5">{temperamentText}</div>}

        <div className="mt-2 flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${confidence}%`,
                background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
              }}
            />
          </div>
          <span className="text-xs font-medium text-blue-600 shrink-0">{confidence}%</span>
        </div>
      </div>

      <ChevronRight className="w-5 h-5 text-gray-500 shrink-0 self-center" />
    </button>
  );
}
