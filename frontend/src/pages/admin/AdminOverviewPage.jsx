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
  { key: "total_scans", label: "Total Scans", icon: ScanLine, color: "text-indigo-600 bg-indigo-100" },
  { key: "breed_scans", label: "Breed Scans", icon: PawPrint, color: "text-emerald-600 bg-emerald-100" },
  { key: "disease_scans", label: "Disease Scans", icon: Stethoscope, color: "text-amber-600 bg-amber-100" },
  { key: "scans_last_24h", label: "Last 24 Hours", icon: Activity, color: "text-rose-600 bg-rose-100" },
];

const AdminOverviewPage = () => {
  const toast = useToast();
  const [range, setRange] = useState("30d");
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    let mounted = true;

    const fetchDashboard = async () => {
      setLoading(true);
      try {
        const response = await api.get("/api/admin/dashboard", { params: { range } });
        if (!mounted) return;
        setData(response.data);
      } catch {
        if (!mounted) return;
        setData(null);
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
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
            <div className="min-w-[640px] flex items-end gap-2 h-48">
              {scansByDay.map((day) => {
                const barHeight = Math.max(8, Math.round((Number(day.total || 0) / maxDayTotal) * 100));
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                    <div className="w-full bg-blue-100 rounded-md overflow-hidden">
                      <div className="bg-blue-600 w-full rounded-md" style={{ height: `${barHeight}px` }} />
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {new Date(day.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
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
