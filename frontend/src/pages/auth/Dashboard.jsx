import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

// components
import Sidebar from '../../components/ui/Sidebar';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    
    <div className="min-h-screen relative bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />
      {/* Navigation Bar */}
      
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setSidebarOpen(true)}
                className="block sm:hidden p-2 rounded-md hover:bg-gray-100"
                aria-label="Open sidebar"
              >
                <svg
                  className="w-6 h-6 text-gray-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>

              <span className="font-bold text-xl text-gray-900">
                DogScan<span className="text-blue-600">AI</span>
              </span>
            </div>

            <div className="hidden sm:flex items-center space-x-4">
              <span className=":block text-sm text-gray-700">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Card */}
        <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-lg p-8 mb-8 text-white">
          <h2 className="text-3xl font-bold mb-2">
            Welcome back, {user?.username}!
          </h2>
          <p className="text-blue-100">Ready to identify some dog breeds?</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* User Info Card */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>👤</span>
              Account Information
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">User ID:</span>
                <span className="font-medium text-gray-900">{user?.id}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Username:</span>
                <span className="font-medium text-gray-900">
                  {user?.username}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-200">
                <span className="text-gray-600">Email:</span>
                <span className="font-medium text-gray-900">{user?.email}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-600">Member since:</span>
                <span className="font-medium text-gray-900">
                  {user?.created_at
                    ? new Date(user.created_at).toLocaleDateString()
                    : "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <span>⚡</span>
              Quick Actions
            </h3>
            <div className="space-y-3">
              <button className="w-full text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📸</span>
                  <div>
                    <p className="font-medium text-gray-900">Scan New Dog</p>
                    <p className="text-sm text-gray-600">
                      Upload an image to identify breed
                    </p>
                  </div>
                </div>
              </button>

              <button className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📊</span>
                  <div>
                    <p className="font-medium text-gray-900">View History</p>
                    <p className="text-sm text-gray-600">See your past scans</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Dog Scans Placeholder */}
        <div className="mt-8 bg-white rounded-xl shadow p-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span>🐕</span>
            Your Dog Scans
          </h3>
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-gray-600 mb-2">No scans yet!</p>
            <p className="text-sm text-gray-500">
              Upload your first dog image to get started
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
