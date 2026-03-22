import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import TopNav from "../components/ui/TopNav";
import { useToast } from "../components/Toast";
import api from "../services/api";
import { buildBreedImagePath } from "../utils/breedImage";
import {
  Camera,
  Dna,
  Calendar,
  ScanLine,
  History,
  BookOpen,
  Zap,
  UserCircle2,
  PawPrint,
  Lightbulb,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";
import { ScanWorkspace } from "./ScanPage";

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
  return trimmed
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function mapRecentScan(scan) {
  const predictions = Array.isArray(scan?.predictions)
    ? scan.predictions.slice().sort((a, b) => Number(a.rank) - Number(b.rank))
    : [];
  const totalConfidence = predictions.reduce(
    (sum, pred) => sum + Number(pred?.confidence ?? 0),
    0,
  );

  const topPrediction = predictions[0] || null;
  const breedName =
    topPrediction?.display_name || topPrediction?.class_name || "Unknown";
  const className = topPrediction?.class_name || "";
  const breedId = topPrediction?.breed_id ?? null;

  const topBreedImage =
    breedId && className ? buildBreedImagePath(breedId, className) : "";
  const uploadImage = scan?.image_url || "";
  const confidence = Number(
    topPrediction?.mix_share != null
      ? topPrediction.mix_share
      : totalConfidence > 0
        ? (Number(topPrediction?.confidence ?? 0) / totalConfidence) * 100
        : 0,
  );
  const origin = topPrediction?.breed_info?.origin || "Unknown";
  const temperament = normalizeTemperament(
    topPrediction?.breed_info?.temperament,
  );

  return {
    id: scan?.id,
    scannedAt: scan?.scanned_at,
    uploadImage,
    breedName,
    confidence,
    origin,
    temperament,
    topBreedImage,
  };
}

const DashboardPage = () => {
  const { user, token } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showScanModal, setShowScanModal] = useState(false);
  const [recentScans, setRecentScans] = useState([]);
  const [loadingRecentScans, setLoadingRecentScans] = useState(true);
  const loadErrorShownRef = useRef(false);

  const openScanModal = () => setShowScanModal(true);

  const closeScanModal = () => {
    setShowScanModal(false);
    if (searchParams.get("scan") === "1") {
      const next = new URLSearchParams(searchParams);
      next.delete("scan");
      setSearchParams(next, { replace: true });
    }
  };

  useEffect(() => {
    if (searchParams.get("scan") === "1") {
      setShowScanModal(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!showScanModal) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [showScanModal]);

  useEffect(() => {
    let mounted = true;

    const fetchRecentScans = async () => {
      if (!token) {
        if (mounted) {
          setRecentScans([]);
          setLoadingRecentScans(false);
        }
        return;
      }

      setLoadingRecentScans(true);
      try {
        const { data } = await api.get("/api/scans", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!mounted) return;
        const mapped = Array.isArray(data) ? data.map(mapRecentScan) : [];
        setRecentScans(mapped);
        loadErrorShownRef.current = false;
      } catch {
        if (!mounted) return;
        setRecentScans([]);
        if (!loadErrorShownRef.current) {
          loadErrorShownRef.current = true;
          toast.error("Failed to load dashboard history preview.");
        }
      } finally {
        if (mounted) setLoadingRecentScans(false);
      }
    };

    fetchRecentScans();
    return () => {
      mounted = false;
    };
  }, [token]);

  const scansThisWeek = recentScans.filter((scan) => {
    if (!scan?.scannedAt) return false;
    const date = new Date(scan.scannedAt);
    const diffDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 7;
  }).length;

  const stats = [
    { label: "Total Scans", value: String(recentScans.length), icon: Camera },
    { label: "Breeds", value: "121", icon: Dna },
    { label: "This Week", value: String(scansThisWeek), icon: Calendar },
  ];

  const quickActions = [
    {
      title: "Scan New Dog",
      description: "Upload an image to identify breed",
      icon: ScanLine,
      iconClass: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
      onClick: openScanModal,
    },
    {
      title: "View History",
      description: "See your past scans",
      icon: History,
      iconClass: "bg-green-50 text-green-600 dark:bg-emerald-500/15 dark:text-emerald-300",
      onClick: () => navigate("/history"),
    },
    {
      title: "Explore Breeds",
      description: "Learn about different breeds",
      icon: BookOpen,
      iconClass: "bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300",
      onClick: () => navigate("/doglibrary"),
    },
  ];

  return (
    <div className="page-bg">
      <TopNav />

      <div className="page-container pt-24 pb-12">
        <div className="mb-8">
          <div className="overflow-hidden rounded-2xl bg-white shadow-lg dark:border dark:border-slate-800 dark:bg-slate-900">
            <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-500 p-8 sm:p-10">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                    Welcome back, {user?.username}!
                  </h1>
                  <p className="text-blue-100 text-lg">
                    Ready to identify some amazing dog breeds?
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-px bg-gray-200 dark:bg-slate-800">
              {stats.map((stat, index) => {
                const StatIcon = stat.icon;
                return (
                  <div
                    key={index}
                    className="bg-white px-6 py-5 text-center transition-colors hover:bg-gray-50 dark:bg-slate-900 dark:hover:bg-slate-800/80"
                  >
                    <div className="mb-2 flex justify-center text-blue-600 dark:text-blue-300">
                      <StatIcon className="w-8 h-8" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-slate-100">
                      {stat.value}
                    </div>
                    <div className="mt-1 text-sm text-gray-600 dark:text-slate-400">
                      {stat.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-slate-100">
              <Zap className="w-5 h-5 text-amber-500" />
              Quick Actions
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {quickActions.map((action, index) => {
                const ActionIcon = action.icon;
                return (
                  <button
                    key={index}
                    onClick={action.onClick}
                    className="group rounded-xl border-2 border-transparent bg-white p-6 text-left shadow-sm transition-all duration-200 hover:border-blue-500 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-400 dark:hover:bg-slate-800/80"
                  >
                    <div
                      className={`w-12 h-12 rounded-lg ${action.iconClass} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                    >
                      <ActionIcon className="w-6 h-6" />
                    </div>
                    <h3 className="mb-1 font-semibold text-gray-900 dark:text-slate-100">
                      {action.title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-slate-400">
                      {action.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-slate-100">
              <UserCircle2 className="w-5 h-5 text-gray-600 dark:text-slate-400" />
              Account
            </h2>
            <div className="rounded-xl bg-white p-6 shadow-sm dark:border dark:border-slate-800 dark:bg-slate-900">
              <div className="space-y-4">
                <div className="flex items-center gap-3 border-b border-gray-100 pb-4 dark:border-slate-800">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {user?.username?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-semibold text-gray-900 dark:text-slate-100">
                      {user?.username}
                    </p>
                    <p className="truncate text-sm text-gray-600 dark:text-slate-400">
                      {user?.email}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-slate-400">Member since</span>
                    <span className="text-sm font-medium text-gray-900 dark:text-slate-200">
                      {user?.created_at
                        ? new Date(user.created_at).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              year: "numeric",
                            },
                          )
                        : "N/A"}
                    </span>
                  </div>
                </div>

                {/* <button className="w-full mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium">
                  Edit Profile
                </button> */}
                <NavLink
                  to="/profile"
                  className="mt-4 block w-full rounded-lg bg-gray-100 px-4 py-2 text-center text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Edit Profile
                </NavLink>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 text-xl font-semibold text-gray-900 dark:text-slate-100">
              <PawPrint className="w-5 h-5 text-blue-600" />
              Recent Scans
            </h2>
          </div>

          <div className="overflow-hidden rounded-xl bg-white shadow-sm dark:border dark:border-slate-800 dark:bg-slate-900">
            {loadingRecentScans ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : recentScans.length > 0 ? (
              <div className="divide-y divide-gray-100 dark:divide-slate-800">
                {recentScans.slice(0, 2).map((scan) => (
                  <div key={scan.id} className="p-4 sm:p-5">
                    <div className="flex gap-4 items-start">
                      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-100 dark:bg-slate-800">
                        {scan.uploadImage ? (
                          <img
                            src={scan.uploadImage}
                            alt="Uploaded scan"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-gray-400 dark:text-slate-500" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-500">
                              Top Prediction
                            </p>
                            <h3 className="truncate text-base font-semibold text-gray-900 dark:text-slate-100">
                              {scan.breedName}
                            </h3>
                          </div>
                          <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                            {scan.confidence.toFixed(1)}%
                          </span>
                        </div>

                        <div className="mt-2 flex items-center gap-2 text-sm text-gray-600 dark:text-slate-400">
                          <Calendar className="w-4 h-4" />
                          <span>
                            {scan.scannedAt
                              ? new Date(scan.scannedAt).toLocaleString(
                                  "en-US",
                                  {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )
                              : "Unknown date"}
                          </span>
                        </div>

                        <div className="mt-2 text-sm text-gray-600 dark:text-slate-400">
                          <span className="font-medium text-gray-700 dark:text-slate-200">
                            Origin:
                          </span>{" "}
                          {scan.origin}
                        </div>

                        {scan.temperament.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {scan.temperament.slice(0, 2).map((temp) => (
                              <span
                                key={temp}
                                className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300"
                              >
                                {temp}
                              </span>
                            ))}
                          </div>
                        )}

                        {scan.topBreedImage && (
                          <div className="mt-3 flex items-center gap-2">
                            <span className="text-xs text-gray-500 dark:text-slate-500">
                              Breed reference:
                            </span>
                            <img
                              src={scan.topBreedImage}
                              alt={scan.breedName}
                              className="h-10 w-10 rounded-md border border-gray-200 object-cover dark:border-slate-700"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="border-t border-gray-100 px-4 py-3 text-center dark:border-slate-800 sm:px-5">
                  <button
                    onClick={() => navigate("/history")}
                    className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    View more in History
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-16 px-4">
                <div className="mb-4 inline-flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800">
                  <ScanLine className="w-9 h-9 text-gray-500 dark:text-slate-400" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-slate-100">
                  No scans yet!
                </h3>
                <p className="mx-auto mb-6 max-w-sm text-gray-600 dark:text-slate-400">
                  Upload your first dog image to get started with breed
                  identification
                </p>
                <button
                  onClick={openScanModal}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all shadow-md hover:shadow-lg font-medium"
                >
                  <Camera className="w-5 h-5" />
                  Start Your First Scan
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-6 dark:border-amber-900/60 dark:from-amber-950/40 dark:to-orange-950/30">
          <div className="flex items-start gap-4">
            <Lightbulb className="w-7 h-7 shrink-0 text-amber-500 dark:text-amber-300" />
            <div>
              <h3 className="mb-1 font-semibold text-gray-900 dark:text-amber-50">Pro Tip</h3>
              <p className="text-sm text-gray-700 dark:text-amber-100/85">
                For best results, upload clear photos with good lighting where
                the dog is the main subject. Our AI works best with front or
                side profile shots.
              </p>
            </div>
          </div>
        </div>
      </div>

      {showScanModal && (
        <div
          className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm p-3 md:p-6 overflow-y-auto"
          onClick={closeScanModal}
        >
          <div className="min-h-full flex items-start md:items-center justify-center">
            <div
              className="w-full max-w-3xl rounded-2xl border border-gray-200 bg-gradient-to-br from-white via-blue-50 to-blue-50 shadow-2xl dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800"
              onClick={(e) => e.stopPropagation()}
            >
              <ScanWorkspace inModal onClose={closeScanModal} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
