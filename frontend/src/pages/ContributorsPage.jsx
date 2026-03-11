import React from "react";
import Navigation from "../components/Navigation";
import TopNav from "../components/ui/TopNav";
import Footer from "../components/Footer";
import ContributorsLeaderboardTable from "../components/ContributorsLeaderboardTable";
import { useAuth } from "../context/AuthContext";

export default function ContributorsPage() {
  const { user } = useAuth();
  const isAuthenticated = Boolean(user);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {isAuthenticated ? <TopNav /> : <Navigation />}

      <div className={`max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 ${isAuthenticated ? "py-8" : "pt-24 pb-10"}`}>
        <div className="mb-6">
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">Contributors Leaderboard</h1>
          <p className="text-slate-600 mt-2">
            Public ranking of users with the most approved scan snapshot contributions.
          </p>
        </div>

        <ContributorsLeaderboardTable />
      </div>

      {!isAuthenticated && <Footer />}
    </div>
  );
}
