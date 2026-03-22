import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useCallback,
} from "react";
import api from "../services/api";


// ============== CREATE CONTEXT ==================

const AuthContext = createContext(null);
const TOKEN_STORAGE_KEY = "dogscan_auth_token";

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

// =============== PROVIDER COMPONENT ==============

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  const refreshUser = useCallback(
    async ({ withLoading = false } = {}) => {
      if (withLoading) setLoading(true);
      try {
        const authToken = localStorage.getItem(TOKEN_STORAGE_KEY) || token;
        const headers = authToken ? { Authorization: `Bearer ${authToken}` } : undefined;
        const response = await api.get("/api/auth/me", headers ? { headers } : undefined);

        setUser(response.data?.user ?? response.data);
        if (response.data?.token) {
          setToken(response.data.token);
          try {
            localStorage.setItem(TOKEN_STORAGE_KEY, response.data.token);
          } catch {
            // ignore storage errors
          }
        }
        setError(null);
        return { success: true, user: response.data?.user ?? response.data };
      } catch (err) {
        setUser(null);
        setError(err);
        if (err?.response?.status === 401 || err?.response?.status === 403) {
          setToken(null);
          try {
            localStorage.removeItem(TOKEN_STORAGE_KEY);
          } catch {
            // ignore storage errors
          }
        }
        return { success: false, error: err };
      } finally {
        if (withLoading) setLoading(false);
      }
    },
    [token]
  );

  const applyAuthSuccess = useCallback((payload) => {
    const nextUser = payload?.user ?? payload ?? null;
    setUser(nextUser);

    if (payload?.token) {
      setToken(payload.token);
      try {
        localStorage.setItem(TOKEN_STORAGE_KEY, payload.token);
      } catch {
        // ignore storage errors
      }
    }

    setError(null);
    return nextUser;
  }, []);

  useEffect(() => {
    refreshUser({ withLoading: true });
  }, [refreshUser]);


  // =================== REGISTER ==================

  /**
   * Register a new user
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @param {string} username - User's username
   * @returns {Object} { success: boolean, error?: string }
   */

  const register = async (email, password, username, policyAcceptance = null) => {
    // dito napapasa yung galing sa input
    try {
      setError(null);

      // POST request sa backend
      const response = await api.post("/api/auth/register", {
        email,
        password,
        username,
        ...(policyAcceptance || {}),
      });

      applyAuthSuccess(response.data);

      return { success: true };
    } catch (error) {
      // Extract error message from response
      const errorMessage = error.response?.data?.error || "Registration failed";
      setError(errorMessage);

      return {
        success: false,
        error: errorMessage,
        code: error.response?.data?.code || null,
        policy_key: error.response?.data?.policy_key || null,
        policy_version: error.response?.data?.policy_version || null,
      };
    }
  };

  // =================== LOGIN ==================

  /**
   * Login existing user
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @returns {Object} { success: boolean, error?: string }
   */

  const login = async (email, password) => {
    try {
      setError(null);

      // Make POST request to backend
      const response = await api.post("/api/auth/login", {
        email,
        password,
      });

      // Success! Update user state
      const nextUser = applyAuthSuccess(response.data);

      return { success: true, user: nextUser };
    } catch (error) {
      const payload = error.response?.data || {};
      const errorMessage = payload.error || "Login failed";
      setError(errorMessage);

      return {
        success: false,
        error: errorMessage,
        code: payload.code || null,
        banned_until: payload.banned_until || null,
        ban_reason: payload.ban_reason || null,
      };
    }
  };

  const loginWithGoogle = async (idToken, policyAcceptance = null) => {
    try {
      setError(null);

      const response = await api.post("/api/auth/google", {
        id_token: idToken,
        ...(policyAcceptance || {}),
      });

      const nextUser = applyAuthSuccess(response.data);

      return {
        success: true,
        user: nextUser,
        google_auth_status: response.data?.google_auth_status ?? null,
        google_auth_message: response.data?.google_auth_message ?? null,
      };
    } catch (error) {
      const payload = error.response?.data || {};
      const errorMessage = payload.error || "Google sign-in failed";
      setError(errorMessage);

      return {
        success: false,
        error: errorMessage,
        code: payload.code || null,
        banned_until: payload.banned_until || null,
        ban_reason: payload.ban_reason || null,
        policy_key: payload.policy_key || null,
        policy_version: payload.policy_version || null,
      };
    }
  };

  const getAuthPolicy = async () => {
    const response = await api.get("/api/auth/policy");
    return response.data;
  };

  // ============================================
  // LOGOUT FUNCTION
  // ============================================

  /**
   * Logout current user
   */
  const logout = async () => {
    try {
      // Call backend logout endpoint
      await api.post("/api/auth/logout");

      // Clear user state
      setUser(null);
      setToken(null);
      setError(null);
      try {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      } catch {
        // ignore storage errors
      }
    } catch (error) {
      console.error("Logout error:", error);
      // Even if API call fails, clear local state
      setUser(null);
      setToken(null);
      try {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      } catch {
        // ignore storage errors
      }
    }
  };

  // ============================================
  // PROVIDE VALUES TO APP
  // ============================================

  const value = {
    user, // Current user object or null
    loading, // Is auth check in progress?
    error, // Any auth error message
    register, // Function to register
    login, // Function to login
    loginWithGoogle,
    getAuthPolicy,
    logout, // Function to logout
    refreshUser, // Re-fetch authenticated user
    isAuthenticated: !!user, // Boolean: is user logged in?
    token, // JWT token for Authorization header
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
