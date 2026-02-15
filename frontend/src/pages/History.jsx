import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Calendar,
  Image as ImageIcon,
  ChevronRight,
  Eye,
  Trash2,
  Filter,
  Download,
  CheckCircle,
  AlertCircle,
  Clock,
  Star,
  X,
  Loader2,
  TrendingUp,
  Search,
  Heart
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import TopNav from "../components/ui/TopNav";

const HistoryPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedScan, setSelectedScan] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // JSON-like configuration for easy editing
  const filterConfig = {
    statuses: [
      { value: "all", label: "All Scans", icon: null },
      { value: "completed", label: "Completed", icon: CheckCircle },
      { value: "pending", label: "Pending", icon: Clock },
      { value: "low_confidence", label: "Low Confidence", icon: AlertCircle },
      { value: "favorites", label: "Favorites Only", icon: Heart }
    ],
    sortOptions: [
      { value: "newest", label: "Newest First" },
      { value: "oldest", label: "Oldest First" },
      { value: "high_confidence", label: "Highest Confidence" },
      { value: "low_confidence", label: "Lowest Confidence" }
    ]
  };

  const statsConfig = [
    { 
      key: "total_scans", 
      label: "Total Scans", 
      icon: ImageIcon, 
      color: "text-blue-600 bg-blue-100" 
    },
    { 
      key: "this_month", 
      label: "This Month", 
      icon: Calendar, 
      color: "text-green-600 bg-green-100" 
    },
    { 
      key: "avg_confidence", 
      label: "Avg Confidence", 
      icon: TrendingUp, 
      color: "text-purple-600 bg-purple-100" 
    }
  ];

  // Mock data structure - replace with actual API call
  const mockScans = [
    {
      id: 1,
      scan_date: "2024-02-10T14:30:00Z",
      status: "completed",
      is_favorite: true,
      images: [
        "https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=400&h=300&fit=crop"
      ],
      predictions: [
        {
          rank: 1,
          breed_id: 1,
          breed_name: "Golden Retriever",
          confidence: 94.5,
          breed_info: {
            size: "large",
            temperament: ["friendly", "intelligent", "playful"],
            origin: "Scotland",
            image_url: "https://images.unsplash.com/photo-1633722715463-d30f4f325e24?w=400&h=300&fit=crop"
          }
        },
        {
          rank: 2,
          breed_id: 3,
          breed_name: "Labrador Retriever",
          confidence: 78.2,
          breed_info: {
            size: "large",
            temperament: ["friendly", "playful", "energetic"],
            origin: "Canada",
            image_url: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=400&h=300&fit=crop"
          }
        },
        {
          rank: 3,
          breed_id: 5,
          breed_name: "Irish Setter",
          confidence: 62.8,
          breed_info: {
            size: "large",
            temperament: ["energetic", "playful", "friendly"],
            origin: "Ireland",
            image_url: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=300&fit=crop"
          }
        }
      ],
      is_approved_for_training: false,
      created_at: "2024-02-10T14:30:00Z"
    },
    {
      id: 2,
      scan_date: "2024-02-08T10:15:00Z",
      status: "completed",
      is_favorite: false,
      images: [
        "https://images.unsplash.com/photo-1568572933382-74d440642117?w=400&h=300&fit=crop"
      ],
      predictions: [
        {
          rank: 1,
          breed_id: 2,
          breed_name: "German Shepherd",
          confidence: 96.8,
          breed_info: {
            size: "large",
            temperament: ["intelligent", "protective", "loyal"],
            origin: "Germany",
            image_url: "https://images.unsplash.com/photo-1568572933382-74d440642117?w=400&h=300&fit=crop"
          }
        },
        {
          rank: 2,
          breed_id: 6,
          breed_name: "Belgian Malinois",
          confidence: 81.3,
          breed_info: {
            size: "large",
            temperament: ["intelligent", "protective", "energetic"],
            origin: "Belgium",
            image_url: "https://images.unsplash.com/photo-1598133893773-de3574464f99?w=400&h=300&fit=crop"
          }
        },
        {
          rank: 3,
          breed_id: 7,
          breed_name: "Dutch Shepherd",
          confidence: 68.5,
          breed_info: {
            size: "large",
            temperament: ["intelligent", "loyal", "protective"],
            origin: "Netherlands",
            image_url: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&h=300&fit=crop"
          }
        }
      ],
      is_approved_for_training: true,
      created_at: "2024-02-08T10:15:00Z"
    },
    {
      id: 3,
      scan_date: "2024-02-05T16:45:00Z",
      status: "completed",
      is_favorite: true,
      images: [
        "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400&h=300&fit=crop",
        "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400&h=300&fit=crop"
      ],
      predictions: [
        {
          rank: 1,
          breed_id: 4,
          breed_name: "French Bulldog",
          confidence: 92.1,
          breed_info: {
            size: "small",
            temperament: ["playful", "friendly", "calm"],
            origin: "France",
            image_url: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400&h=300&fit=crop"
          }
        },
        {
          rank: 2,
          breed_id: 8,
          breed_name: "Boston Terrier",
          confidence: 75.4,
          breed_info: {
            size: "small",
            temperament: ["friendly", "playful", "intelligent"],
            origin: "USA",
            image_url: "https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?w=400&h=300&fit=crop"
          }
        },
        {
          rank: 3,
          breed_id: 9,
          breed_name: "Pug",
          confidence: 58.9,
          breed_info: {
            size: "small",
            temperament: ["playful", "gentle", "friendly"],
            origin: "China",
            image_url: "https://images.unsplash.com/photo-1517849845537-4d257902454a?w=400&h=300&fit=crop"
          }
        }
      ],
      is_approved_for_training: false,
      created_at: "2024-02-05T16:45:00Z"
    },
    {
      id: 4,
      scan_date: "2024-01-28T09:20:00Z",
      status: "low_confidence",
      is_favorite: false,
      images: [
        "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&h=300&fit=crop"
      ],
      predictions: [
        {
          rank: 1,
          breed_id: 10,
          breed_name: "Mixed Breed",
          confidence: 48.3,
          breed_info: {
            size: "medium",
            temperament: ["varies"],
            origin: "Various",
            image_url: "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&h=300&fit=crop"
          }
        },
        {
          rank: 2,
          breed_id: 11,
          breed_name: "Australian Shepherd",
          confidence: 42.1,
          breed_info: {
            size: "medium",
            temperament: ["intelligent", "energetic", "loyal"],
            origin: "USA",
            image_url: "https://images.unsplash.com/photo-1568393691622-c7ba131d63b4?w=400&h=300&fit=crop"
          }
        },
        {
          rank: 3,
          breed_id: 12,
          breed_name: "Border Collie",
          confidence: 38.7,
          breed_info: {
            size: "medium",
            temperament: ["intelligent", "energetic", "loyal"],
            origin: "UK",
            image_url: "https://images.unsplash.com/photo-1586671267731-da2cf3ceeb80?w=400&h=300&fit=crop"
          }
        }
      ],
      is_approved_for_training: false,
      created_at: "2024-01-28T09:20:00Z"
    }
  ];

  const mockStats = {
    total_scans: 24,
    this_month: 8,
    avg_confidence: 82.5
  };

  // Simulate API fetch
  useEffect(() => {
    const fetchScans = async () => {
      setLoading(true);
      // Replace with actual API call: await fetch('/api/scans')
      setTimeout(() => {
        setScans(mockScans);
        setLoading(false);
      }, 1000);
    };

    fetchScans();
  }, []);

  // Filter and sort logic
  const filteredScans = scans
    .filter((scan) => {
      // Favorites filter
      if (filterStatus === "favorites") {
        return scan.is_favorite;
      }
      
      // Status filters
      if (filterStatus === "all") return true;
      if (filterStatus === "low_confidence") {
        return scan.predictions[0].confidence < 70;
      }
      return scan.status === filterStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at) - new Date(a.created_at);
        case "oldest":
          return new Date(a.created_at) - new Date(b.created_at);
        case "high_confidence":
          return b.predictions[0].confidence - a.predictions[0].confidence;
        case "low_confidence":
          return a.predictions[0].confidence - b.predictions[0].confidence;
        default:
          return 0;
      }
    });

  const handleViewDetails = (scan) => {
    setSelectedScan(scan);
    setShowModal(true);
  };

  const handleDeleteScan = async (scanId) => {
    if (window.confirm("Are you sure you want to delete this scan?")) {
      // Replace with actual API call: await fetch(`/api/scans/${scanId}`, { method: 'DELETE' })
      setScans(scans.filter((s) => s.id !== scanId));
    }
  };

  const handleToggleFavorite = async (scanId) => {
    // Replace with actual API call: await fetch(`/api/scans/${scanId}/favorite`, { method: 'PUT' })
    setScans(scans.map((scan) => 
      scan.id === scanId 
        ? { ...scan, is_favorite: !scan.is_favorite }
        : scan
    ));
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 80) return "text-green-600 bg-green-100";
    if (confidence >= 60) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const getConfidenceBadge = (confidence) => {
    if (confidence >= 80) return { label: "High", color: "bg-green-500" };
    if (confidence >= 60) return { label: "Medium", color: "bg-yellow-500" };
    return { label: "Low", color: "bg-red-500" };
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <TopNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Scan History
          </h1>
          <p className="text-gray-600">
            View and manage your dog breed identification scans
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {statsConfig.map((stat) => {
            const IconComponent = stat.icon;
            const value = stat.key === "avg_confidence" 
              ? `${mockStats[stat.key]}%` 
              : mockStats[stat.key];
            
            return (
              <div
                key={stat.key}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center`}>
                    <IconComponent className="w-6 h-6" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters and Sort */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Filter by Status */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Filter by Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {filterConfig.statuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sort By
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {filterConfig.sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Results count */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{filteredScans.length}</span> of{" "}
              <span className="font-semibold text-gray-900">{scans.length}</span> scans
            </p>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        )}

        {/* Scan List */}
        {!loading && filteredScans.length > 0 && (
          <div className="space-y-4">
            {filteredScans.map((scan) => {
              const topPrediction = scan.predictions[0];
              const confidenceBadge = getConfidenceBadge(topPrediction.confidence);

              return (
                <div
                  key={scan.id}
                  className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                >
                  <div className="p-6">
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Images Preview */}
                      <div className="flex-shrink-0">
                        <div className="flex gap-2">
                          {scan.images.slice(0, 3).map((img, idx) => (
                            <div
                              key={idx}
                              className="w-24 h-24 bg-gray-200 rounded-lg overflow-hidden"
                            >
                              <img
                                src={img}
                                alt={`Scan ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                          {scan.images.length > 3 && (
                            <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                              <span className="text-gray-600 font-medium">
                                +{scan.images.length - 3}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Scan Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div>
                              <h3 className="text-lg font-bold text-gray-900 mb-1">
                                {topPrediction.breed_name}
                              </h3>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Calendar className="w-4 h-4" />
                                <span>{formatDate(scan.created_at)}</span>
                              </div>
                            </div>
                            {scan.is_favorite && (
                              <Heart className="w-5 h-5 text-red-500 fill-red-500 flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${confidenceBadge.color} text-white`}>
                              {confidenceBadge.label}
                            </span>
                          </div>
                        </div>

                        {/* Top 3 Predictions */}
                        <div className="space-y-2 mb-4">
                          {scan.predictions.map((pred) => (
                            <div
                              key={pred.rank}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                                  pred.rank === 1 ? "bg-yellow-100 text-yellow-700" :
                                  pred.rank === 2 ? "bg-gray-200 text-gray-700" :
                                  "bg-orange-100 text-orange-700"
                                } font-bold text-sm`}>
                                  {pred.rank}
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {pred.breed_name}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {pred.breed_info.temperament.slice(0, 3).join(", ")}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getConfidenceColor(pred.confidence)}`}>
                                  {pred.confidence.toFixed(1)}%
                                </span>
                                <button
                                  onClick={() => navigate(`/breeds/${pred.breed_id}`)}
                                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                                >
                                  View Breed
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggleFavorite(scan.id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                              scan.is_favorite
                                ? "bg-red-50 text-red-600 hover:bg-red-100"
                                : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                            }`}
                          >
                            <Heart 
                              className={`w-4 h-4 ${scan.is_favorite ? "fill-red-600" : ""}`} 
                            />
                            {scan.is_favorite ? "Unfavorite" : "Favorite"}
                          </button>
                          <button
                            onClick={() => handleViewDetails(scan)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                          >
                            <Eye className="w-4 h-4" />
                            View Details
                          </button>
                          <button
                            onClick={() => handleDeleteScan(scan.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                          {scan.is_approved_for_training && (
                            <span className="ml-auto px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Training Approved
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredScans.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No scans found
            </h3>
            <p className="text-gray-600 mb-6">
              {filterStatus !== "all" || sortBy !== "newest"
                ? "Try adjusting your filters"
                : "Start by uploading your first dog image"}
            </p>
            <button
              onClick={() => navigate("/scan")}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium"
            >
              Start New Scan
            </button>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showModal && selectedScan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Scan Details</h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-600" />
              </button>
            </div>

            <div className="p-6">
              {/* Images Grid */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Uploaded Images</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {selectedScan.images.map((img, idx) => (
                    <div
                      key={idx}
                      className="aspect-square bg-gray-200 rounded-lg overflow-hidden"
                    >
                      <img
                        src={img}
                        alt={`Image ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Predictions Detailed */}
              <div className="mb-6">
                <h3 className="font-semibold text-gray-900 mb-3">Prediction Results</h3>
                <div className="space-y-4">
                  {selectedScan.predictions.map((pred) => (
                    <div
                      key={pred.rank}
                      className="border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <img
                          src={pred.breed_info.image_url}
                          alt={pred.breed_name}
                          className="w-24 h-24 object-cover rounded-lg"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`flex items-center justify-center w-6 h-6 rounded-full ${
                                pred.rank === 1 ? "bg-yellow-100 text-yellow-700" :
                                pred.rank === 2 ? "bg-gray-200 text-gray-700" :
                                "bg-orange-100 text-orange-700"
                              } font-bold text-xs`}>
                                {pred.rank}
                              </span>
                              <h4 className="font-bold text-gray-900">
                                {pred.breed_name}
                              </h4>
                            </div>
                            <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getConfidenceColor(pred.confidence)}`}>
                              {pred.confidence.toFixed(1)}%
                            </span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-gray-600">Size:</span>
                              <span className="font-medium text-gray-900 capitalize">
                                {pred.breed_info.size}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <span className="text-gray-600">Origin:</span>
                              <span className="font-medium text-gray-900">
                                {pred.breed_info.origin}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {pred.breed_info.temperament.map((temp, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium"
                                >
                                  {temp}
                                </span>
                              ))}
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setShowModal(false);
                              navigate(`/breeds/${pred.breed_id}`);
                            }}
                            className="mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                          >
                            View Full Breed Profile
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scan Metadata */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Scan Information</h3>
                <div className="grid sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Scan ID:</span>
                    <span className="ml-2 font-medium text-gray-900">#{selectedScan.id}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Date:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {formatDate(selectedScan.created_at)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Images Uploaded:</span>
                    <span className="ml-2 font-medium text-gray-900">
                      {selectedScan.images.length}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Status:</span>
                    <span className="ml-2 font-medium text-gray-900 capitalize">
                      {selectedScan.status.replace("_", " ")}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryPage;