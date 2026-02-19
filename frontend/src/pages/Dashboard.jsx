import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import TopNav from "../components/ui/TopNav";
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
  ArrowRight,
  Lightbulb,
} from "lucide-react";
import { ScanWorkspace } from "./ScanPage";

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showScanModal, setShowScanModal] = useState(false);

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

  const stats = [
    { label: "Total Scans", value: "0", icon: Camera },
    { label: "Breeds", value: "121", icon: Dna },
    { label: "This Week", value: "0", icon: Calendar },
  ];

  const quickActions = [
    {
      title: "Scan New Dog",
      description: "Upload an image to identify breed",
      icon: ScanLine,
      iconClass: "bg-blue-50 text-blue-600",
      onClick: openScanModal,
    },
    {
      title: "View History",
      description: "See your past scans",
      icon: History,
      iconClass: "bg-green-50 text-green-600",
      onClick: () => navigate("/history"),
    },
    {
      title: "Explore Breeds",
      description: "Learn about different breeds",
      icon: BookOpen,
      iconClass: "bg-purple-50 text-purple-600",
      onClick: () => navigate("/doglibrary"),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <TopNav />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="mb-8">
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 p-8 sm:p-10">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">Welcome back, {user?.username}!</h1>
                  <p className="text-blue-100 text-lg">Ready to identify some amazing dog breeds?</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-px bg-gray-200">
              {stats.map((stat, index) => {
                const StatIcon = stat.icon;
                return (
                  <div
                    key={index}
                    className="bg-white px-6 py-5 text-center hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-center mb-2 text-blue-600">
                      <StatIcon className="w-8 h-8" />
                    </div>
                    <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                    <div className="text-sm text-gray-600 mt-1">{stat.label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
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
                    className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all duration-200 p-6 text-left border-2 border-transparent hover:border-blue-500"
                  >
                    <div
                      className={`w-12 h-12 rounded-lg ${action.iconClass} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                    >
                      <ActionIcon className="w-6 h-6" />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-1">{action.title}</h3>
                    <p className="text-sm text-gray-600">{action.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <UserCircle2 className="w-5 h-5 text-gray-600" />
              Account
            </h2>
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {user?.username?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{user?.username}</p>
                    <p className="text-sm text-gray-600 truncate">{user?.email}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">User ID</span>
                    <span className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">#{user?.id}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Member since</span>
                    <span className="text-sm font-medium text-gray-900">
                      {user?.created_at
                        ? new Date(user.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            year: "numeric",
                          })
                        : "N/A"}
                    </span>
                  </div>
                </div>

                <button className="w-full mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors text-sm font-medium">
                  Edit Profile
                </button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <PawPrint className="w-5 h-5 text-indigo-600" />
              Recent Scans
            </h2>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1">
              View All
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="text-center py-16 px-4">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
                <ScanLine className="w-9 h-9 text-gray-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No scans yet!</h3>
              <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                Upload your first dog image to get started with breed identification
              </p>
              <button
                onClick={openScanModal}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg font-medium"
              >
                <Camera className="w-5 h-5" />
                Start Your First Scan
              </button>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <Lightbulb className="w-7 h-7 text-amber-500 shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Pro Tip</h3>
              <p className="text-sm text-gray-700">
                For best results, upload clear photos with good lighting where the dog is the main subject. Our AI works
                best with front or side profile shots.
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
              className="w-full max-w-3xl bg-gradient-to-br from-white via-blue-50 to-indigo-50 border border-gray-200 rounded-2xl shadow-2xl"
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
