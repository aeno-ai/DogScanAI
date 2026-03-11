import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { UIProvider } from "./context/UIContext";
import { ToastProvider } from "./components/Toast";
import ProtectedRoute from "./pages/auth/ProtectedRoute";
import AdminRoute from "./pages/auth/AdminRoute";
import NotFound from "./pages/NotFound";
import AdminLayout from "./layouts/AdminLayout";

// Import pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/auth/Login";
import SignUpPage from "./pages/auth/Register";
import DashboardPage from "./pages/Dashboard";
import DogLibrary from "./pages/DogLibrary"
import HistoryPage from "./pages/History";
import ProfilePage from "./pages/ProfilePage";
import AssistantPage from "./pages/AssistantPage";
import ContributorsPage from "./pages/ContributorsPage";
import AdminOverviewPage from "./pages/admin/AdminOverviewPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminContributionsPage from "./pages/admin/AdminContributionsPage";
import AdminContributorsPage from "./pages/admin/AdminContributorsPage";

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <UIProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignUpPage />} />
            <Route path="/doglibrary" element={<DogLibrary/>}/>
            <Route path="/contributors" element={<ContributorsPage />} />
            

            {/* Protected routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute redirectAdminTo="/admin/overview">
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route path="/scan" element={<Navigate to="/dashboard?scan=1" replace />} />
            <Route path="/scanpage" element={<Navigate to="/dashboard?scan=1" replace />} />
            <Route
              path="/assistant"
              element={
                <ProtectedRoute>
                  <AssistantPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/doglibrary"
              element={
                <ProtectedRoute>
                  <DogLibrary />
                </ProtectedRoute>
              }
            />
            <Route
              path="/history"
              element={
                <ProtectedRoute>
                  <HistoryPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminLayout />
                </AdminRoute>
              }
            >
              <Route index element={<Navigate to="/admin/overview" replace />} />
              <Route path="overview" element={<AdminOverviewPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="contributions" element={<AdminContributionsPage />} />
              <Route path="contributors" element={<AdminContributorsPage />} />
            </Route>
            {/* Catch-all redirect */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </UIProvider>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
