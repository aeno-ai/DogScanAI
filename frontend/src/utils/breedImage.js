export function buildBreedImagePath(breedId, className) {
  const id = String(breedId ?? "").padStart(3, "0");
  const normalizedClass = String(className ?? "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
  return `/image/breed_library_images/${id}_${normalizedClass}.jpg`;
}
