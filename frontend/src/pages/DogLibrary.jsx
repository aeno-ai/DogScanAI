import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  Dog,
  Heart,
  Activity,
  Ruler,
  Weight,
  Home,
  Users,
  Sparkles,
  AlertCircle,
  ChevronRight,
  Star,
  X,
  Loader2,
  Maximize2,
  ZoomIn,
} from "lucide-react";
import TopNav from "../components/ui/TopNav";

const DogLibrary = () => {
  const navigate = useNavigate();
  const [breeds, setBreeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSize, setSelectedSize] = useState("all");
  const [selectedTemperament, setSelectedTemperament] = useState("all");
  const [imageViewer, setImageViewer] = useState({
    open: false,
    image: "",
    name: "",
  });

  const filterConfig = {
    sizes: [
      { value: "all", label: "All Sizes" },
      { value: "small", label: "Small" },
      { value: "medium", label: "Medium" },
      { value: "large", label: "Large" },
      { value: "giant", label: "Giant" },
    ],
    temperaments: [
      { value: "all", label: "All Temperaments" },
      { value: "playful", label: "Playful" },
      { value: "calm", label: "Calm" },
      { value: "energetic", label: "Energetic" },
      { value: "protective", label: "Protective" },
      { value: "friendly", label: "Friendly" },
    ],
  };

  const breedCardConfig = {
    physicalTraits: [
      { key: "snout", label: "Snout", icon: Dog },
      { key: "ears", label: "Ears", icon: AlertCircle },
      { key: "coat", label: "Coat", icon: Sparkles },
      { key: "tail", label: "Tail", icon: Activity },
    ],
    measurements: [
      { key: "height", label: "Height", icon: Ruler, unit: "inches" },
      { key: "weight", label: "Weight", icon: Weight, unit: "lbs" },
    ],
    characteristics: [
      { key: "lifespan", label: "Lifespan", icon: Heart, unit: "years" },
      { key: "origin", label: "Origin", icon: Home },
      { key: "group", label: "Group", icon: Users },
    ],
  };

  const temperamentConfig = {
    badges: [
      {
        value: "playful",
        label: "Playful",
        color: "bg-blue-100 text-blue-700",
      },
      {
        value: "friendly",
        label: "Friendly",
        color: "bg-green-100 text-green-700",
      },
      {
        value: "energetic",
        label: "Energetic",
        color: "bg-orange-100 text-orange-700",
      },
      { value: "calm", label: "Calm", color: "bg-purple-100 text-purple-700" },
      {
        value: "protective",
        label: "Protective",
        color: "bg-red-100 text-red-700",
      },
      {
        value: "intelligent",
        label: "Intelligent",
        color: "bg-indigo-100 text-indigo-700",
      },
      { value: "loyal", label: "Loyal", color: "bg-blue-100 text-blue-700" },
      {
        value: "gentle",
        label: "Gentle",
        color: "bg-green-100 text-green-700",
      },
    ],
  };

  // Transform JSON data to match component format
  const transformBreedData = (jsonBreed) => {
    return {
      id: jsonBreed.breed_id,
      name: jsonBreed.display_name,
      image: `../../../public/image/breed_library_images/${jsonBreed.breed_id.toString().padStart(3, '0')}_${jsonBreed.class_name}.jpg`,
      size: jsonBreed.size,
      temperament: jsonBreed.temperament,
      physicalTraits: {
        snout: jsonBreed.physical_traits.snout,
        ears: jsonBreed.physical_traits.ears,
        coat: jsonBreed.physical_traits.coat,
        tail: jsonBreed.physical_traits.tail,
      },
      measurements: {
        height: `${jsonBreed.measurements.height_min}-${jsonBreed.measurements.height_max}`,
        weight: `${jsonBreed.measurements.weight_min}-${jsonBreed.measurements.weight_max}`,
      },
      characteristics: {
        lifespan: `${jsonBreed.characteristics.lifespan_min}-${jsonBreed.characteristics.lifespan_max}`,
        origin: jsonBreed.characteristics.origin,
        group: jsonBreed.characteristics.breed_group,
      },
      description: jsonBreed.description,
      popularity: jsonBreed.popularity_score,
      healthConsiderations: jsonBreed.health_considerations,
      keyHealthTips: jsonBreed.key_health_tips,
    };
  };

  // Fetch breeds from your backend
  useEffect(() => {
    const fetchBreeds = async () => {
      setLoading(true);
      try {
        console.log("🔄 Fetching breeds from backend...");

        // Call your backend API
        const response = await fetch("http://localhost:5000/api/breeds");

        if (!response.ok) {
          throw new Error("Failed to fetch breeds");
        }

        const jsonData = await response.json();
        console.log("✅ Received data:", jsonData.length, "breeds");

        // Transform the data
        const transformedBreeds = jsonData.map(transformBreedData);
        setBreeds(transformedBreeds);
      } catch (error) {
        console.error("❌ Error fetching breeds:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBreeds();
  }, []);

  // Filter logic
  const filteredBreeds = breeds.filter((breed) => {
    const matchesSearch = breed.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesSize = selectedSize === "all" || breed.size === selectedSize;
    const matchesTemperament =
      selectedTemperament === "all" ||
      breed.temperament.includes(selectedTemperament);

    return matchesSearch && matchesSize && matchesTemperament;
  });

  const getTempBadgeColor = (temp) => {
    const badge = temperamentConfig.badges.find((b) => b.value === temp);
    return badge ? badge.color : "bg-gray-100 text-gray-700";
  };

  const openImageViewer = (image, name) => {
    setImageViewer({ open: true, image, name });
    document.body.style.overflow = "hidden";
  };

  const closeImageViewer = () => {
    setImageViewer({ open: false, image: "", name: "" });
    document.body.style.overflow = "unset";
  };

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === "Escape" && imageViewer.open) {
        closeImageViewer();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [imageViewer.open]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <TopNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Dog Breed Library
          </h1>
          <p className="text-gray-600">
            Explore our comprehensive database of {breeds.length} dog breeds
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Filters */}
          <div className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
              <div className="flex items-center gap-2 mb-6">
                <Filter className="w-5 h-5 text-blue-600" />
                <h2 className="font-semibold text-gray-900">Filters</h2>
              </div>

              {/* Search */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Search Breed
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {/* Size Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Size
                </label>
                <select
                  value={selectedSize}
                  onChange={(e) => setSelectedSize(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {filterConfig.sizes.map((size) => (
                    <option key={size.value} value={size.value}>
                      {size.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Temperament Filter */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temperament
                </label>
                <select
                  value={selectedTemperament}
                  onChange={(e) => setSelectedTemperament(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {filterConfig.temperaments.map((temp) => (
                    <option key={temp.value} value={temp.value}>
                      {temp.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear Filters */}
              {(searchTerm ||
                selectedSize !== "all" ||
                selectedTemperament !== "all") && (
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedSize("all");
                    setSelectedTemperament("all");
                  }}
                  className="w-full px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors font-medium"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Results Count */}
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                Showing{" "}
                <span className="font-semibold text-gray-900">
                  {filteredBreeds.length}
                </span>{" "}
                breeds
              </p>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            )}

            {/* Breed Cards */}
            {!loading && filteredBreeds.length > 0 && (
              <div className="grid md:grid-cols-2 gap-6">
                {filteredBreeds.map((breed) => (
                  <div
                    key={breed.id}
                    className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                  >
                    {/* Image with View Button */}
                    <div className="relative h-48 bg-gray-200 group">
                      <img
                        src={breed.image}
                        alt={breed.name}
                        className="w-full h-full object-cover"
                        onClick={() => openImageViewer(breed.image, breed.name)}
                      />

                      <button
                        onClick={() => openImageViewer(breed.image, breed.name)}
                        className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 text-white rounded-lg backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1.5"
                        aria-label="View full image"
                      >
                        <ZoomIn className="w-4 h-4" />
                        <span className="text-xs font-medium">View</span>
                      </button>

                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/20 pointer-events-none">
                        <Maximize2 className="w-8 h-8 text-white drop-shadow-lg" />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-6">
                      {/* Header */}
                      <div className="mb-4">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">
                          {breed.name}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {breed.description}
                        </p>
                      </div>

                      {/* Temperament Badges */}
                      <div className="mb-4">
                        <p className="text-xs font-medium text-gray-700 mb-2">
                          Behavior
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {breed.temperament.map((temp, idx) => (
                            <span
                              key={idx}
                              className={`px-3 py-1 rounded-full text-xs font-medium ${getTempBadgeColor(temp)}`}
                            >
                              {temp.charAt(0).toUpperCase() + temp.slice(1)}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Physical Traits */}
                      <div className="mb-4 pb-4 border-b border-gray-100">
                        <p className="text-xs font-medium text-gray-700 mb-3">
                          Physical Traits
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          {breedCardConfig.physicalTraits.map((trait) => {
                            const IconComponent = trait.icon;
                            return (
                              <div
                                key={trait.key}
                                className="flex items-start gap-2"
                              >
                                <IconComponent className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-xs text-gray-500">
                                    {trait.label}
                                  </p>
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {breed.physicalTraits[trait.key]}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Measurements */}
                      <div className="mb-4 pb-4 border-b border-gray-100">
                        <div className="grid grid-cols-2 gap-3">
                          {breedCardConfig.measurements.map((measure) => {
                            const IconComponent = measure.icon;
                            return (
                              <div
                                key={measure.key}
                                className="flex items-start gap-2"
                              >
                                <IconComponent className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="text-xs text-gray-500">
                                    {measure.label}
                                  </p>
                                  <p className="text-sm font-medium text-gray-900">
                                    {breed.measurements[measure.key]}{" "}
                                    {measure.unit}
                                  </p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Characteristics */}
                      <div className="mb-4">
                        <div className="grid grid-cols-3 gap-3">
                          {breedCardConfig.characteristics.map((char) => {
                            const IconComponent = char.icon;
                            return (
                              <div key={char.key} className="text-center">
                                <div className="flex justify-center mb-1">
                                  <IconComponent className="w-4 h-4 text-purple-600" />
                                </div>
                                <p className="text-xs text-gray-500 mb-0.5">
                                  {char.label}
                                </p>
                                <p className="text-sm font-medium text-gray-900">
                                  {breed.characteristics[char.key]}
                                  {char.unit && ` ${char.unit}`}
                                </p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* View Details Button */}
                      <button
                        onClick={() => navigate(`/breeds/${breed.id}`)}
                        className="w-full px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium flex items-center justify-center gap-2"
                      >
                        View Full Details
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!loading && filteredBreeds.length === 0 && (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <Dog className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No breeds found
                </h3>
                <p className="text-gray-600 mb-6">
                  Try adjusting your filters or search term
                </p>
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedSize("all");
                    setSelectedTemperament("all");
                  }}
                  className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Viewer Modal */}
      {imageViewer.open && (
        <div
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={closeImageViewer}
        >
          <button
            onClick={closeImageViewer}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 text-white rounded-full backdrop-blur-sm transition-colors z-10"
            aria-label="Close image viewer"
          >
            <X className="w-6 h-6" />
          </button>

          <div className="absolute top-4 left-4 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg">
            <p className="text-white font-semibold">{imageViewer.name}</p>
          </div>

          <div
            className="relative max-w-5xl max-h-[85vh] w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={imageViewer.image}
              alt={imageViewer.name}
              className="w-full h-full object-contain rounded-lg shadow-2xl"
            />
          </div>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-lg">
            <p className="text-white text-sm">
              Click anywhere to close • Press ESC
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DogLibrary;
