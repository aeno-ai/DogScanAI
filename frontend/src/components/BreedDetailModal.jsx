import { useEffect } from "react";
import { X } from "lucide-react";
import { buildBreedImagePath } from "../utils/breedImage";

function Stat({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="font-semibold text-sm text-gray-900">{value}</div>
    </div>
  );
}

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

export default function BreedDetailModal({ breed, onClose }) {
  if (!breed) return null;

  useEffect(() => {
    const handler = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const imagePath = buildBreedImagePath(breed.breed_id, breed.class_name);
  const temperamentText = renderTemperament(breed.temperament);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-lg max-h-[90vh] overflow-y-auto border border-gray-200 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <img
            src={imagePath}
            alt={breed.display_name}
            className="w-full h-52 object-cover md: bg-gray-100"
          />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-white/90 rounded-full w-8 h-8 flex items-center justify-center text-gray-700 hover:bg-red-600 hover:text-white transition-colors border border-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 text-gray-900">
          <div className="mb-1">
            <h2 className="text-2xl font-bold">{breed.display_name}</h2>
            <div className="text-sm text-gray-600 flex flex-col mt-0.5">
              {breed.breed_group && (
                <span>
                  <span className="font-semibold">Breed:</span>{" "}
                  {breed.breed_group}
                </span>
              )}
              {breed.origin && (
                <span>
                  <span className="font-semibold">Origin:</span> {breed.origin}
                </span>
              )}
              {breed.size && (
                <span>
                  <span className="font-semibold">Size:</span> {breed.size}
                </span>
              )}
              {temperamentText && (
                <p className="text-sm text-gray-600">
                  <span className="font-semibold">Temperaments:</span>{" "}
                  {temperamentText}
                </p>
              )}
            </div>
          </div>

          {breed.description && (
            <p className="text-sm text-gray-700 mt-3 leading-relaxed">
              {breed.description}
            </p>
          )}

          <div className="grid grid-cols-3 gap-2 mt-4">
            <Stat
              label="Height"
              value={
                breed.height_min && breed.height_max
                  ? `${breed.height_min}-${breed.height_max} cm`
                  : null
              }
            />
            <Stat
              label="Weight"
              value={
                breed.weight_min && breed.weight_max
                  ? `${breed.weight_min}-${breed.weight_max} kg`
                  : null
              }
            />
            <Stat
              label="Lifespan"
              value={
                breed.lifespan_min && breed.lifespan_max
                  ? `${breed.lifespan_min}-${breed.lifespan_max} yrs`
                  : null
              }
            />
          </div>

          {(breed.snout || breed.ears || breed.coat || breed.tail) && (
            <div className="mt-4">
              <h3 className="text-sm font-bold text-gray-700 mb-2">
                Physical Traits
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {breed.snout && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
                    <span className="text-gray-500">Snout - </span>
                    {breed.snout}
                  </div>
                )}
                {breed.ears && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
                    <span className="text-gray-500">Ears - </span>
                    {breed.ears}
                  </div>
                )}
                {breed.coat && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
                    <span className="text-gray-500">Coat - </span>
                    {breed.coat}
                  </div>
                )}
                {breed.tail && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-2">
                    <span className="text-gray-500">Tail - </span>
                    {breed.tail}
                  </div>
                )}
              </div>
            </div>
          )}

          {breed.health_considerations && (
            <div className="mt-4">
              <h3 className="text-sm font-bold text-gray-700 mb-1">
                Health Considerations
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                {breed.health_considerations}
              </p>
            </div>
          )}

          {breed.key_health_tips && (
            <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-3">
              <h3 className="text-xs font-bold text-green-700 mb-1">
                Key Health Tips
              </h3>
              <p className="text-xs text-gray-700 leading-relaxed">
                {breed.key_health_tips}
              </p>
            </div>
          )}

          <div className="h-2" />
        </div>
      </div>
    </div>
  );
}
