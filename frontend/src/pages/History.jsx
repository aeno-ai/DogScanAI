import React, { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Image as ImageIcon,
  Trash2,
  CheckCircle,
  Loader2,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import TopNav from "../components/ui/TopNav";
import { useToast } from "../components/Toast";
import api from "../services/api";
import { buildBreedImagePath } from "../utils/breedImage";

// ─── Constants (defined outside component so they're never recreated) ────────

const FILTER_STATUSES = [
  { value: "all", label: "All Scans" },
  { value: "completed", label: "Completed" },
  { value: "high_confidence", label: "High Confidence" },
  { value: "medium_confidence", label: "Medium Confidence" },
  { value: "low_confidence", label: "Low Confidence" }
];

const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "oldest", label: "Oldest First" },
  { value: "high_confidence", label: "High Confidence - Low Confidence" },
  { value: "low_confidence", label: "Low Confidence - High Confidence" },
];

const STATS_CONFIG = [
  { key: "total_scans",    label: "Total Scans",      icon: ImageIcon,  color: "text-blue-600 bg-blue-100"   },
  { key: "this_month",     label: "This Month",        icon: Calendar,   color: "text-green-600 bg-green-100" },
  { key: "avg_confidence", label: "Avg Confidence",    icon: TrendingUp, color: "text-blue-600 bg-blue-100" },
];

// ─── Pure helpers (outside component — no need to be recreated each render) ──

function normalizeTemperament(value) {
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

  return trimmed.split(",").map((item) => item.trim()).filter(Boolean);
}

function getTop1Confidence(scan) {
  return Number(
    scan?.predictions?.[0]?.normalized_confidence ??
    scan?.predictions?.[0]?.confidence ??
    0
  );
}

function getConfidenceColor(confidence) {
  if (confidence >= 70) return "text-green-600 bg-green-100";
  if (confidence >= 40) return "text-yellow-600 bg-yellow-100";
  return "text-red-600 bg-red-100";
}

function getConfidenceBadge(confidence) {
  if (confidence >= 70) return { label: "High",   color: "bg-green-500"  };
  if (confidence >= 40) return { label: "Medium", color: "bg-yellow-500" };
  return                       { label: "Low",    color: "bg-red-500"    };
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTrainingBadge(status) {
  switch (status) {
    case "pending":
      return { label: "Training Pending", className: "bg-amber-100 text-amber-700" };
    case "approved":
      return { label: "Training Approved", className: "bg-green-100 text-green-700" };
    case "rejected":
      return { label: "Training Rejected", className: "bg-red-100 text-red-700" };
    default:
      return { label: "Not Shared", className: "bg-slate-100 text-slate-600" };
  }
}

function mapApiScanToUi(scan) {
  const apiPredictions = Array.isArray(scan?.predictions) ? scan.predictions : [];

  const predictions = apiPredictions
    .slice()
    .sort((a, b) => Number(a.rank) - Number(b.rank))
    .map((pred, idx) => {
      const uploadedImage = scan?.image_url || "";
      const breedImage =
        pred?.breed_id && pred?.class_name
          ? buildBreedImagePath(pred.breed_id, pred.class_name)
          : null;

      return {
        rank: Number(pred?.rank) || idx + 1,
        breed_id: pred?.breed_id ?? null,
        breed_name: pred?.display_name ?? pred?.class_name ?? "Unknown Breed",
        confidence: Number(pred?.confidence ?? 0),
        breed_info: {
          size: pred?.breed_info?.size ?? "unknown",
          temperament: normalizeTemperament(pred?.breed_info?.temperament),
          origin: pred?.breed_info?.origin ?? "Unknown",
          image_url: breedImage,
        },
      };
    });

  if (predictions.length === 0) {
    predictions.push({
      rank: 1,
      breed_id: null,
      breed_name: "Unknown Breed",
      confidence: 0,
      breed_info: { size: "unknown", temperament: [], origin: "Unknown", image_url: scan?.image_url || "" },
    });
  }

  const totalConfidence = predictions.reduce((sum, p) => sum + Number(p.confidence ?? 0), 0);
  const predictionsWithShare = predictions.map((pred) => ({
    ...pred,
    normalized_confidence:
      totalConfidence > 0 ? (Number(pred.confidence ?? 0) / totalConfidence) * 100 : 0,
  }));

  const top1Confidence = Number(predictionsWithShare[0]?.normalized_confidence ?? predictionsWithShare[0]?.confidence ?? 0);
  const images = scan?.image_url
    ? [scan.image_url]
    : [predictionsWithShare[0].breed_info.image_url].filter(Boolean);

  return {
    id: scan?.id,
    scan_date: scan?.scanned_at,
    status: top1Confidence < 40 ? "low_confidence" : "completed",
    training_status: scan?.training_status || "not_shared",
    training_rejection_reason: scan?.training_rejection_reason || null,
    training_reviewed_at: scan?.training_reviewed_at || null,
    images,
    predictions: predictionsWithShare,
    created_at: scan?.scanned_at,
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

const HistoryPage = () => {
  const navigate = useNavigate();
  const { token } = useAuth();
  const toast = useToast();
  const loadErrorShownRef = useRef(false);

  const [scans, setScans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  // Fetch on mount (or when token changes)
  useEffect(() => {
    let mounted = true;

    const fetchScans = async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/api/scans");
        if (!mounted) return;
        setScans(Array.isArray(data) ? data.map(mapApiScanToUi) : []);
        loadErrorShownRef.current = false;
      } catch {
        if (!mounted) return;
        setScans([]);
        if (!loadErrorShownRef.current) {
          loadErrorShownRef.current = true;
          toast.error("Failed to load scan history.");
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchScans();
    return () => { mounted = false; };
  }, [token]);

  // Derived: filtered + sorted scans — only recalculates when inputs change
  const filteredScans = useMemo(() => {
    const filtered = scans.filter((scan) => {
      if (filterStatus === "all") return true;
      if (filterStatus === "high_confidence") return getTop1Confidence(scan) >= 70;
      if (filterStatus === "medium_confidence") return getTop1Confidence(scan) >= 40 && getTop1Confidence(scan) < 70;
      if (filterStatus === "low_confidence") return getTop1Confidence(scan) < 40;
      if (filterStatus === "training_pending") return scan.training_status === "pending";
      if (filterStatus === "training_approved") return scan.training_status === "approved";
      if (filterStatus === "training_rejected") return scan.training_status === "rejected";
      return scan.status === filterStatus;
    });

    return filtered.sort((a, b) => {
      const aConf = getTop1Confidence(a);
      const bConf = getTop1Confidence(b);
      switch (sortBy) {
        case "newest":          return new Date(b.created_at) - new Date(a.created_at);
        case "oldest":          return new Date(a.created_at) - new Date(b.created_at);
        case "high_confidence": return bConf - aConf;
        case "low_confidence":  return aConf - bConf;
        default:                return 0;
      }
    });
  }, [scans, filterStatus, sortBy]);

  // Derived: stats — only recalculates when scans change
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = scans.filter((scan) => {
      const d = new Date(scan.created_at);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;

    const avgConfidence = scans.length
      ? scans.reduce((sum, scan) => sum + getTop1Confidence(scan), 0) / scans.length
      : 0;

    return {
      total_scans: scans.length,
      this_month: thisMonth,
      avg_confidence: Number(avgConfidence.toFixed(1)),
    };
  }, [scans]);

  // Stable delete handler — won't cause child re-renders if passed as prop
  const handleDeleteScan = useCallback(async (scanId) => {
    if (!window.confirm("Are you sure you want to delete this scan?")) return;
    try {
      await api.delete(`/api/scans/${scanId}`);
      setScans((prev) => prev.filter((scan) => scan.id !== scanId));
    } catch {
      toast.error("Failed to delete scan.");
    }
  }, [toast]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="page-bg">
      <TopNav />

      <div className="page-container pt-24 pb-12">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Scan History</h1>
          <p className="text-gray-600">View and manage your dog breed identification scans</p>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {STATS_CONFIG.map((stat) => {
            const Icon = stat.icon;
            const value = stat.key === "avg_confidence" ? `${stats[stat.key]}%` : stats[stat.key];
            return (
              <div key={stat.key} className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold text-gray-900">{value}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center`}>
                    <Icon className="w-6 h-6" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {FILTER_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-sm text-gray-600">
              Showing <span className="font-semibold text-gray-900">{filteredScans.length}</span> of{" "}
              <span className="font-semibold text-gray-900">{scans.length}</span> scans
            </p>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          </div>
        )}

        {/* Scan list */}
        {!loading && filteredScans.length > 0 && (
          <div className="space-y-4">
            {filteredScans.map((scan) => {
              const topPrediction = scan.predictions[0];
              const top1Confidence = getTop1Confidence(scan);
              const badge = getConfidenceBadge(top1Confidence);
              const trainingBadge = getTrainingBadge(scan.training_status);

              return (
                <div key={scan.id} className="bg-white rounded-xl shadow-sm overflow-hidden transition-shadow hover:shadow-md">
                  <div className="p-6">
                    <div className="flex flex-col lg:flex-row gap-6">

                      {/* Scan images */}
                      <div className="flex-shrink-0">
                        <div className="flex gap-2">
                          {scan.images.slice(0, 3).map((img, idx) => (
                            <div key={idx} className="w-24 h-24 bg-gray-200 rounded-lg overflow-hidden">
                              <img src={img} alt={`Scan ${idx + 1}`} className="w-full h-full object-cover" />
                            </div>
                          ))}
                          {scan.images.length > 3 && (
                            <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                              <span className="text-gray-600 font-medium">+{scan.images.length - 3}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Scan details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-bold text-gray-900 mb-1">{topPrediction.breed_name}</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="w-4 h-4" />
                              <span>{formatDate(scan.created_at)}</span>
                            </div>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${badge.color} text-white`}>
                            {badge.label}
                          </span>
                        </div>

                        {/* Predictions list */}
                        <div className="space-y-2 mb-4">
                          {scan.predictions.map((pred) => {
                            const displayConf = Number(pred.normalized_confidence ?? pred.confidence);
                            return (
                              <div key={pred.rank} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className={`flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${
                                    pred.rank === 1 ? "bg-yellow-100 text-yellow-700"
                                    : pred.rank === 2 ? "bg-gray-200 text-gray-700"
                                    : "bg-orange-100 text-orange-700"
                                  }`}>
                                    {pred.rank}
                                  </div>
                                  {pred.breed_info.image_url && (
                                   <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-200">
                                    <img src={pred.breed_info.image_url} alt={pred.breed_name} className="w-full h-full object-cover" />
                                  </div>
                                  )}
                                  <div>
                                    <p className="font-medium text-gray-900">{pred.breed_name}</p>
                                    <p className="text-xs text-gray-500">{pred.breed_info.temperament.slice(0, 3).join(", ")}</p>
                                  </div>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getConfidenceColor(displayConf)}`}>
                                  {displayConf.toFixed(1)}%
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <button
                            onClick={() => handleDeleteScan(scan.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                          <span className={`ml-auto px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${trainingBadge.className}`}>
                            <CheckCircle className="w-3 h-3" />
                            {trainingBadge.label}
                          </span>
                        </div>
                        {scan.training_status === "rejected" && scan.training_rejection_reason && (
                          <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                            Rejection reason: {scan.training_rejection_reason}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredScans.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No scans found</h3>
            <p className="text-gray-600 mb-6">
              {filterStatus !== "all" || sortBy !== "newest"
                ? "Try adjusting your filters"
                : "Start by uploading your first dog image"}
            </p>
            <button
              onClick={() => navigate("/dashboard?scan=1")}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all font-medium"
            >
              Start New Scan
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default HistoryPage;
