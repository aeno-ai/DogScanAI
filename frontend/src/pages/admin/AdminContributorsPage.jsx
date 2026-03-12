import React from "react";
import ContributorsLeaderboardTable from "../../components/ContributorsLeaderboardTable";

export default function AdminContributorsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Contributors Leaderboard</h1>
        <p className="text-slate-600">
          Public top contributors based on approved scan snapshot submissions.
        </p>
      </div>

      <ContributorsLeaderboardTable />
    </div>
  );
}
