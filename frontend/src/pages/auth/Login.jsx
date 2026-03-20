import React, { useState, useEffect, useMemo } from "react";
import {
  useNavigate,
  Link,
  useLocation,
  useSearchParams,
} from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import DogEyeTracker from "../../components/dog-eye-tracker";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { login, user } = useAuth();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [infoNotice, setInfoNotice] = useState("");
  const [banNotice, setBanNotice] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const redirectPath = useMemo(() => {
    const stateFrom = location.state?.from;
    const stateRedirect = stateFrom
      ? `${stateFrom.pathname || ""}${stateFrom.search || ""}`
      : "";
    const queryRedirect = searchParams.get("redirect") || "";

    if (stateRedirect.startsWith("/")) return stateRedirect;
    if (queryRedirect.startsWith("/")) return queryRedirect;
    return user?.is_admin ? "/admin/overview" : "/dashboard";
  }, [location.state, searchParams, user?.is_admin]);

  useEffect(() => {
    if (user) navigate(redirectPath, { replace: true });
  }, [user, navigate, redirectPath]);

  useEffect(() => {
    const notice = searchParams.get("notice");
    if (notice) setInfoNotice(notice);

    const bannedFromQuery = searchParams.get("banned") === "1";
    if (bannedFromQuery) {
      setBanNotice({
        reason: searchParams.get("ban_reason") || "No reason provided.",
        until: searchParams.get("banned_until") || null,
      });
    }
  }, [searchParams]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
    if (infoNotice) setInfoNotice("");
    if (banNotice) setBanNotice(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBanNotice(null);
    if (!formData.email || !formData.password) {
      setError("Please fill in all fields");
      return;
    }
    setLoading(true);
    try {
      const result = await login(formData.email, formData.password);
      if (result.success) {
        const explicitRedirect = location.state?.from
          ? `${location.state.from.pathname || ""}${location.state.from.search || ""}`
          : searchParams.get("redirect") || "";
        const nextPath = explicitRedirect.startsWith("/")
          ? explicitRedirect
          : result?.user?.is_admin
          ? "/admin/overview"
          : "/dashboard";

        navigate(nextPath, { replace: true });
      } else {
        if (result.code === "ACCOUNT_BANNED") {
          setBanNotice({
            reason: result.ban_reason || "No reason provided.",
            until: result.banned_until || null,
          });
          setError("");
        } else {
          setError(result.error);
        }
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const formatBanUntil = (value) => {
    if (!value) return "Unknown";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4">
      <div className="w-full max-w-5xl min-h-[560px] bg-white rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-[30%_70%]">
        <div className="bg-blue-600 flex flex-col items-center justify-center px-6 py-12 text-white">
            <h1 className="text-2xl font-extrabold tracking-wide">
              DOGSCAN AI
            </h1>{" "}
          
          <div className="w-44 h-44 rounded-full bg-white flex items-center justify-center shadow-lg overflow-hidden">
            <DogEyeTracker showPassword={showPassword} />
          </div>
        </div>

        <div className="p-12 flex flex-col justify-center">
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-gray-800 tracking-wide">
              LOGIN
            </h1>
            <p className="text-gray-600 mt-1 text-sm">
              Login to access your DogScanAI account
            </p>
          </div>

          {infoNotice && (
            <div className="mb-6 bg-blue-50 border border-blue-200 text-blue-800 px-4 py-3 rounded-lg">
              <p className="text-sm">{infoNotice}</p>
            </div>
          )}

          {banNotice && (
            <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg">
              <p className="text-sm font-semibold">Your account is temporarily banned.</p>
              <p className="text-sm mt-1">
                <span className="font-medium">Reason:</span> {banNotice.reason}
              </p>
              <p className="text-sm mt-1">
                <span className="font-medium">Banned until:</span> {formatBanUntil(banNotice.until)}
              </p>
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="mt-2 text-right">
                <Link
                  to="/forgot-password"
                  className="text-sm text-blue-600 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Logging in..." : "Login"}
            </button>

            <div className="flex items-center justify-between text-sm text-gray-600">
              <Link
                to="/"
                className="flex items-center gap-1 hover:text-blue-600"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Back to Home
              </Link>
              <p>
                Don&apos;t have an account?{" "}
                <Link
                  to="/signup"
                  className="font-semibold text-blue-600 hover:underline"
                >
                  Sign up
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
