import React, {
  createContext,
  useState,
  useEffect,
  useContext,
} from "react";
import axios from "axios";

// ============== CONFIGURATION ====================
axios.defaults.baseURL = "http://localhost:5000";
axios.defaults.withCredentials = true; // allows cookies to be sent daw

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
  const [created_at, setCreatedAt] = useState(null);
  const [token, setToken] = useState(() => {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch {
      return null;
    }
  });

  useEffect(() => {
    checkAuth();
  }, []);

  /**
   * Check if user is already logged in
   * Called when app first loads
   */

const checkAuth = async () => {
  setLoading(true); 
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
    const response = await axios.get("/api/auth/me", headers ? { headers } : undefined);
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
  } catch (err) {
    setUser(null);
    setError(err);
    if (err?.response?.status === 401) {
      setToken(null);
      try {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      } catch {
        // ignore storage errors
      }
    }
  } finally {
    setLoading(false); // done checking
  }
};


  // =================== REGISTER ==================

  /**
   * Register a new user
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @param {string} username - User's username
   * @returns {Object} { success: boolean, error?: string }
   */

  const register = async (email, password, username) => {
    // dito napapasa yung galing sa input
    try {
      setError(null);

      // POST request sa backend
      const response = await axios.post("/api/auth/register", {
        email,
        password,
        username,
      });

      setUser(response.data.user);
      if (response.data?.token) {
        setToken(response.data.token);
        try {
          localStorage.setItem(TOKEN_STORAGE_KEY, response.data.token);
        } catch {
          // ignore storage errors
        }
      }

      return { success: true };
    } catch (error) {
      // Extract error message from response
      const errorMessage = error.response?.data?.error || "Registration failed";
      setError(errorMessage);

      return {
        success: false,
        error: errorMessage,
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

  const login = async (email, password, created_at) => {
    try {
      setError(null);

      // Make POST request to backend
      const response = await axios.post("/api/auth/login", {
        email,
        password,
        created_at
      });

      // Success! Update user state
      setUser(response.data.user);
      setCreatedAt(response.data.created_at); // set kung kailan siya na create
      if (response.data?.token) {
        setToken(response.data.token);
        try {
          localStorage.setItem(TOKEN_STORAGE_KEY, response.data.token);
        } catch {
          // ignore storage errors
        }
      }

      return { success: true };
    } catch (error) {
      // Extract error message from response
      const errorMessage = error.response?.data?.error || "Login failed";
      setError(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    }
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
      await axios.post("/api/auth/logout");

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
    logout, // Function to logout
    isAuthenticated: !!user, // Boolean: is user logged in?
    created_at, // kung kelan ginawa
    token, // JWT token for Authorization header
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
