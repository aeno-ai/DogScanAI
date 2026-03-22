import React, { useEffect, useState } from "react";
import {
  CalendarDays,
  Crown,
  Loader2,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import api from "../services/api";
import { useToast } from "./Toast";

function buildRowKey(row) {
  return row?.user_id ? `user-${row.user_id}` : `${row?.rank}-${row?.username}`;
}

function formatPercent(value) {
  if (value == null || Number.isNaN(Number(value))) return "N/A";
  return `${Number(value).toFixed(1)}%`;
}

function formatDate(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getContributorSuggestion(row) {
  const accuracy = Number(row?.avg_accuracy ?? 0);
  const confidence = Number(row?.avg_confidence ?? 0);
  const approvedCount = Number(row?.approved_count ?? 0);
  const recentCount = Number(row?.approved_last_7d ?? 0);
  const busiestDayTotal = Number(row?.busiest_day_total ?? 0);

  if (accuracy >= 85 && approvedCount >= 12) {
    return "Excellent precision and volume. This contributor is a strong candidate for edge-case review or labeling best-practice guidance.";
  }
  if (accuracy < 60 && approvedCount >= 5) {
    return "High output, but the model-vs-approved match rate is slipping. Review repeated breed mismatches before relying on this contributor's patterns.";
  }
  if (recentCount === 0 && approvedCount > 0) {
    return "No approved activity in the last 7 days. Check whether this contributor has pending submissions stuck in review or has simply gone quiet.";
  }
  if (busiestDayTotal >= 5 && confidence >= 70) {
    return "Strong peak-day throughput with solid confidence. Keep an eye on consistency during heavy submission days.";
  }
  return "Steady contributor. Encourage more approved submissions to get a clearer quality signal over time.";
}

export default function ContributorsLeaderboardTable({ adminMode = false }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [activeRowKey, setActiveRowKey] = useState(null);

  useEffect(() => {
    let mounted = true;

    const loadLeaderboard = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(
          adminMode
            ? "/api/admin/contributors/leaderboard"
            : "/api/contributors/leaderboard"
        );
        if (!mounted) return;
        const nextRows = Array.isArray(data) ? data : [];
        setRows(nextRows);
        setActiveRowKey(nextRows[0] ? buildRowKey(nextRows[0]) : null);
      } catch {
        if (!mounted) return;
        setRows([]);
        setActiveRowKey(null);
        toast.error(
          adminMode
            ? "Failed to load admin contributor insights."
            : "Failed to load contributors leaderboard."
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadLeaderboard();
    return () => {
      mounted = false;
    };
  }, [adminMode, toast]);

  const activeRow =
    adminMode && rows.length > 0
      ? rows.find((row) => buildRowKey(row) === activeRowKey) || rows[0]
      : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/70">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
          <Crown className="w-5 h-5 text-amber-500" />
          Top Contributors
        </h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          {adminMode
            ? "Hover a contributor row to inspect quality, busiest day activity, and review suggestions."
            : "Ranked by approved scan snapshot contributions."}
        </p>
      </div>

      {adminMode && activeRow && (
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-5 dark:border-slate-800 dark:bg-slate-950/70">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600 dark:text-blue-300">
                Contributor Focus
              </p>
              <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
                {activeRow.username}
              </h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                Rank #{activeRow.rank} with {Number(activeRow.approved_count ?? 0)} approved contributions.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                  <Target className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                  Avg Accuracy
                </div>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {formatPercent(activeRow.avg_accuracy)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                  <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
                  Avg Confidence
                </div>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {formatPercent(activeRow.avg_confidence)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                  <CalendarDays className="h-4 w-4 text-amber-600 dark:text-amber-300" />
                  Busiest Day
                </div>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {Number(activeRow.busiest_day_total ?? 0)}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {formatDate(activeRow.busiest_day)}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                  <Crown className="h-4 w-4 text-violet-600 dark:text-violet-300" />
                  Last 7 Days
                </div>
                <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  {Number(activeRow.approved_last_7d ?? 0)}
                </p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Last approved: {formatDate(activeRow.latest_submission_at)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900/50 dark:bg-blue-950/30">
            <div className="flex items-start gap-3">
              <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-300" />
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Suggestion
                </p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
                  {getContributorSuggestion(activeRow)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[460px]">
          <thead>
            <tr className="border-b border-slate-200 text-left text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
              <th className="px-5 py-3">Rank</th>
              <th className="px-5 py-3">Username</th>
              <th className="px-5 py-3">Approved Contributions</th>
              {adminMode && <th className="px-5 py-3">Avg Accuracy</th>}
              {adminMode && <th className="px-5 py-3">Busiest Day</th>}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={adminMode ? 5 : 3}
                  className="px-5 py-10 text-center text-slate-500 dark:text-slate-400"
                >
                  No approved contributions yet.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const rowKey = buildRowKey(row);
                const isActive = adminMode && rowKey === activeRowKey;

                return (
                  <tr
                    key={rowKey}
                    tabIndex={adminMode ? 0 : undefined}
                    onMouseEnter={
                      adminMode ? () => setActiveRowKey(rowKey) : undefined
                    }
                    onFocus={adminMode ? () => setActiveRowKey(rowKey) : undefined}
                    className={`border-b border-slate-100 transition-colors dark:border-slate-800 ${
                      adminMode
                        ? `cursor-pointer hover:bg-blue-50/80 dark:hover:bg-slate-800/80 ${
                            isActive
                              ? "bg-blue-50/80 dark:bg-slate-800/80"
                              : ""
                          }`
                        : ""
                    }`}
                  >
                    <td className="px-5 py-3 font-semibold text-slate-700 dark:text-slate-200">
                      #{row.rank}
                    </td>
                    <td className="px-5 py-3 text-slate-900 dark:text-slate-100">
                      {row.username}
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-900 dark:text-slate-100">
                      {Number(row.approved_count ?? 0)}
                    </td>
                    {adminMode && (
                      <td className="px-5 py-3 text-slate-700 dark:text-slate-300">
                        {formatPercent(row.avg_accuracy)}
                      </td>
                    )}
                    {adminMode && (
                      <td className="px-5 py-3 text-slate-700 dark:text-slate-300">
                        <div className="font-medium">
                          {Number(row.busiest_day_total ?? 0)} scans
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {formatDate(row.busiest_day)}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
