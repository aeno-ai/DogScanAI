import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./components/Toast";
import ProtectedRoute from "./pages/auth/ProtectedRoute";
import NotFound from "./pages/NotFound";

// Import pages
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/auth/Login";
import SignUpPage from "./pages/auth/Register";
import DashboardPage from "./pages/Dashboard";
import DogLibrary from "./pages/DogLibrary"

import "./App.css";

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignUpPage />} />
          <Route path="/doglibrary" element={<DogLibrary/>}/>
          

          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
                <DogLibrary/>
              </ProtectedRoute>
            }
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
