import React from "react";
import ContributorsLeaderboardTable from "../../components/ContributorsLeaderboardTable";

export default function AdminContributorsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">Contributors Leaderboard</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Hover contributors to inspect average accuracy, busiest submission day, and review suggestions.
        </p>
      </div>

      <ContributorsLeaderboardTable adminMode />
    </div>
  );
}
