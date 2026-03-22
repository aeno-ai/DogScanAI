import React, { useState } from "react";
import { Link } from "react-router-dom";
import DogEyeTracker from "../../components/dog-eye-tracker";
import api from "../../services/api";

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [resetUrl, setResetUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const validateEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    setResetUrl("");

    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !validateEmail(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await api.post("/api/auth/forgot-password", { email: trimmed });
      setSuccess(true);
      if (data?.reset_url) setResetUrl(data.reset_url);
    } catch (err) {
      const message = err?.response?.data?.error || "Unable to request a reset link.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-full max-w-5xl min-h-[560px] bg-white rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-[30%_70%] dark:border dark:border-slate-800 dark:bg-slate-900">
        <div className="bg-blue-600 flex flex-col items-center justify-center px-6 py-12 text-white">
          <h1 className="text-2xl font-extrabold tracking-wide">DOGSCAN AI</h1>
          <div className="w-44 h-44 rounded-full bg-white flex items-center justify-center shadow-lg overflow-hidden">
            <DogEyeTracker showPassword={false} />
          </div>
        </div>

        <div className="p-12 flex flex-col justify-center">
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-gray-800 tracking-wide dark:text-slate-100">
              FORGOT PASSWORD
            </h1>
            <p className="text-gray-600 mt-1 text-sm dark:text-slate-400">
              Enter your email to receive a password reset link.
            </p>
          </div>

          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg dark:border-green-900/60 dark:bg-green-950/40 dark:text-green-200">
              <p className="text-sm">
                If that email exists, we sent a password reset link. Please check your inbox.
              </p>
              {resetUrl && (
                <div className="mt-3 text-sm text-green-900">
                  <p className="font-semibold">Dev reset link:</p>
                  <a
                    href={resetUrl}
                    className="text-blue-700 underline break-all"
                  >
                    {resetUrl}
                  </a>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2 dark:text-slate-300"
              >
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Sending link..." : "Send reset link"}
            </button>

            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-slate-400">
              <Link
                to="/login"
                className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
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
                Back to Login
              </Link>
              <p>
                Need an account?{" "}
                <Link
                  to="/signup"
                  className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
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

export default ForgotPasswordPage;
