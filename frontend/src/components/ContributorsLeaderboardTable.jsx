import React, { useEffect, useState } from "react";
import { Crown, Loader2 } from "lucide-react";
import api from "../services/api";
import { useToast } from "./Toast";

export default function ContributorsLeaderboardTable() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let mounted = true;

    const loadLeaderboard = async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/api/contributors/leaderboard");
        if (!mounted) return;
        setRows(Array.isArray(data) ? data : []);
      } catch {
        if (!mounted) return;
        setRows([]);
        toast.error("Failed to load contributors leaderboard.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadLeaderboard();
    return () => {
      mounted = false;
    };
  }, [toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-200 bg-slate-50">
        <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
          <Crown className="w-5 h-5 text-amber-500" />
          Top Contributors
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Ranked by approved scan snapshot contributions.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[460px]">
          <thead>
            <tr className="text-left text-sm text-slate-500 border-b border-slate-200">
              <th className="py-3 px-5">Rank</th>
              <th className="py-3 px-5">Username</th>
              <th className="py-3 px-5">Approved Contributions</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-5 py-10 text-center text-slate-500">
                  No approved contributions yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={`${row.rank}-${row.username}`} className="border-b border-slate-100">
                  <td className="py-3 px-5 font-semibold text-slate-700">#{row.rank}</td>
                  <td className="py-3 px-5 text-slate-900">{row.username}</td>
                  <td className="py-3 px-5 text-slate-900 font-semibold">
                    {Number(row.approved_count ?? 0)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
