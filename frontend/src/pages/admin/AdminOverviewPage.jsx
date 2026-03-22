import React, { useEffect, useMemo, useState } from "react";
import {
  Users,
  ScanLine,
  Stethoscope,
  PawPrint,
  Activity,
  Loader2,
} from "lucide-react";
import api from "../../services/api";
import { useToast } from "../../components/Toast";

const RANGE_OPTIONS = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "all", label: "All time" },
];

const KPI_CONFIG = [
  { key: "total_users", label: "Total Users", icon: Users, color: "text-blue-600 bg-blue-100" },
  { key: "total_scans", label: "Total Scans", icon: ScanLine, color: "text-blue-600 bg-blue-100" },
  { key: "breed_scans", label: "Breed Scans", icon: PawPrint, color: "text-emerald-600 bg-emerald-100" },
  { key: "disease_scans", label: "Disease Scans", icon: Stethoscope, color: "text-amber-600 bg-amber-100" },
  { key: "scans_last_24h", label: "Last 24 Hours", icon: Activity, color: "text-rose-600 bg-rose-100" },
];

function buildDayKey(day) {
  return String(day?.date || "");
}

function formatPercent(value) {
  if (value == null || Number.isNaN(Number(value))) return "N/A";
  return `${Number(value).toFixed(1)}%`;
}

function formatDayLabel(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function buildDayInsightLabel(day) {
  const total = Number(day?.total ?? 0);
  const breed = Number(day?.breed ?? 0);
  const disease = Number(day?.disease ?? 0);
  const accuracy = Number(day?.avg_accuracy ?? 0);
  const confidence = Number(day?.avg_confidence ?? 0);
  const approvedContributions = Number(day?.approved_contribution_count ?? 0);

  if (approvedContributions === 0) {
    return "Awaiting review data";
  }
  if (total >= 25 && accuracy >= 85) {
    return "Strong benchmark day";
  }
  if (total >= 25 && confidence < 65) {
    return "Watch low-confidence traffic";
  }
  if (approvedContributions >= 5 && accuracy < 60) {
    return "Review model misses";
  }
  if (disease > breed) {
    return "Disease-heavy day";
  }
  if (total <= 5) {
    return "Low-volume signal";
  }
  return "Balanced activity";
}

const AdminOverviewPage = () => {
  const toast = useToast();
  const [range, setRange] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [activeDayKey, setActiveDayKey] = useState(null);

  useEffect(() => {
    let mounted = true;

    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const response = await api.get("/api/admin/dashboard", { params: { range } });
        if (!mounted) return;
        setData(response.data);
        const nextSeries = Array.isArray(response.data?.scans_by_day)
          ? response.data.scans_by_day
          : [];
        setActiveDayKey(
          nextSeries.length ? buildDayKey(nextSeries[nextSeries.length - 1]) : null
        );
      } catch {
        if (!mounted) return;
        setData(null);
        setActiveDayKey(null);
        toast.error("Failed to load admin dashboard.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchDashboard();
    return () => {
      mounted = false;
    };
  }, [range, toast]);

  const maxDayTotal = useMemo(() => {
    const values = Array.isArray(data?.scans_by_day) ? data.scans_by_day.map((item) => Number(item.total)) : [];
    return Math.max(1, ...values);
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[320px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const kpis = data?.kpis || {};
  const scansByDay = Array.isArray(data?.scans_by_day) ? data.scans_by_day : [];
  const topBreeds = Array.isArray(data?.top_breeds) ? data.top_breeds : [];
  const recentScans = Array.isArray(data?.recent_scans) ? data.recent_scans : [];
  const activeDay =
    scansByDay.find((day) => buildDayKey(day) === activeDayKey) ||
    scansByDay[scansByDay.length - 1] ||
    null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Admin Overview</h1>
          <p className="text-slate-600">Live analytics and system activity.</p>
        </div>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="w-full sm:w-auto px-3 py-2 border border-slate-300 rounded-lg bg-white"
        >
          {RANGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5 gap-4">
        {KPI_CONFIG.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.key} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <p className="text-2xl font-bold text-slate-900">{kpis[item.key] ?? 0}</p>
                </div>
                <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${item.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Scans by Day</h2>
        {scansByDay.length === 0 ? (
          <p className="text-sm text-slate-500">No scan data for this range.</p>
        ) : (
          <div className="overflow-x-auto">
              <div className="min-w-[760px] flex items-end gap-2 h-64">
                {scansByDay.map((day) => {
                  const fillPercent = Math.max(
                    6,
                    Math.round((Number(day.total || 0) / maxDayTotal) * 100)
                  );
                  const isActive = buildDayKey(day) === buildDayKey(activeDay);
                  const insightLabel = buildDayInsightLabel(day);

                  return (
                    <button
                      key={day.date}
                      type="button"
                      onMouseEnter={() => setActiveDayKey(buildDayKey(day))}
                      onFocus={() => setActiveDayKey(buildDayKey(day))}
                      className={`flex min-w-[56px] flex-col items-center gap-2 rounded-xl px-1 py-2 text-left outline-none transition-all ${
                        isActive ? "flex-[2.1]" : "flex-1"
                      }`}
                    >
                      <div
                        className={`relative flex h-full w-full overflow-hidden rounded-xl border transition-all duration-200 ${
                          isActive
                            ? "border-blue-700 bg-blue-700 text-white shadow-lg"
                            : "border-blue-100 bg-blue-50 hover:border-blue-200 hover:bg-blue-100/70"
                        }`}
                      >
                        {!isActive && (
                          <div
                            className="absolute inset-x-0 bottom-0 rounded-t-lg bg-blue-600 transition-all"
                            style={{ height: `${fillPercent}%` }}
                          />
                        )}

                        {isActive ? (
                          <div className="relative z-10 flex h-full w-full flex-col justify-between p-3">
                            <div>
                              <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-100/90">
                                {formatDayLabel(day.date)}
                              </p>
                              <div className="mt-3">
                                <p className="text-3xl font-bold leading-none">
                                  {Number(day.total ?? 0)}
                                </p>
                                <p className="mt-1 text-[11px] font-medium text-blue-100/90">
                                  total scans
                                </p>
                              </div>
                            </div>

                            <div className="space-y-2">
                              <div className="grid grid-cols-2 gap-2 text-[11px]">
                                <div className="rounded-lg bg-white/10 px-2 py-1.5">
                                  <p className="text-blue-100/80">Breed</p>
                                  <p className="font-semibold text-white">
                                    {Number(day.breed ?? 0)}
                                  </p>
                                </div>
                                <div className="rounded-lg bg-white/10 px-2 py-1.5">
                                  <p className="text-blue-100/80">Disease</p>
                                  <p className="font-semibold text-white">
                                    {Number(day.disease ?? 0)}
                                  </p>
                                </div>
                                <div className="rounded-lg bg-white/10 px-2 py-1.5">
                                  <p className="text-blue-100/80">Accuracy</p>
                                  <p className="font-semibold text-white">
                                    {formatPercent(day.avg_accuracy)}
                                  </p>
                                </div>
                                <div className="rounded-lg bg-white/10 px-2 py-1.5">
                                  <p className="text-blue-100/80">Confidence</p>
                                  <p className="font-semibold text-white">
                                    {formatPercent(day.avg_confidence)}
                                  </p>
                                </div>
                              </div>

                              <div className="rounded-lg bg-white/10 px-2 py-1.5 text-[10px] font-medium text-white/95">
                                {insightLabel}
                              </div>

                              <div className="space-y-1">
                                <div className="h-1.5 rounded-full bg-white/20">
                                  <div
                                    className="h-full rounded-full bg-white"
                                    style={{ width: `${fillPercent}%` }}
                                  />
                                </div>
                                <p className="text-[10px] text-blue-100/80">
                                  {Number(day.approved_contribution_count ?? 0)} reviewed samples
                                </p>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <span className={`text-[11px] ${
                        isActive ? "font-semibold text-blue-700" : "text-slate-500"
                      }`}>
                        {new Date(day.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </button>
                  );
                })}
              </div>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Top Breeds</h2>
          <div className="space-y-3">
            {topBreeds.length === 0 && <p className="text-sm text-slate-500">No breed data yet.</p>}
            {topBreeds.map((breed) => (
              <div key={`${breed.breed_id}-${breed.name}`} className="flex items-center justify-between">
                <p className="text-sm text-slate-700 truncate pr-4">{breed.name}</p>
                <p className="text-sm font-semibold text-slate-900">{breed.scan_count}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Public Demo Usage</h2>
          <div className="space-y-2 text-sm text-slate-700">
            <p>
              Active devices: <span className="font-semibold">{data?.public_usage?.active_devices ?? 0}</span>
            </p>
            <p>
              Consumed scans: <span className="font-semibold">{data?.public_usage?.consumed_scans ?? 0}</span>
            </p>
            <p className="text-slate-500">
              Period start: {data?.public_usage?.period_start || "All time"}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Scans</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-200">
                <th className="py-2 pr-3">User</th>
                <th className="py-2 pr-3">Type</th>
                <th className="py-2 pr-3">Top Prediction</th>
                <th className="py-2">Scanned At</th>
              </tr>
            </thead>
            <tbody>
              {recentScans.length === 0 && (
                <tr>
                  <td className="py-4 text-slate-500" colSpan={4}>
                    No recent scans found.
                  </td>
                </tr>
              )}
              {recentScans.map((scan) => (
                <tr key={scan.scan_id} className="border-b border-slate-100">
                  <td className="py-2 pr-3 text-slate-700">{scan.username}</td>
                  <td className="py-2 pr-3 text-slate-700 capitalize">{scan.scan_type || "breed"}</td>
                  <td className="py-2 pr-3 text-slate-700">{scan.top_prediction_name || "-"}</td>
                  <td className="py-2 text-slate-500">
                    {scan.scanned_at ? new Date(scan.scanned_at).toLocaleString() : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminOverviewPage;
