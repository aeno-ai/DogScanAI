import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * Wrapper component that protects routes
 * Redirects to login if user is not authenticated
 */
const ProtectedRoute = ({ children, redirectAdminTo = null }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login and preserve destination
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (redirectAdminTo && user.is_admin) {
    return <Navigate to={redirectAdminTo} replace />;
  }

  // User is authenticated, render the protected component
  return children;
};

export default ProtectedRoute;
