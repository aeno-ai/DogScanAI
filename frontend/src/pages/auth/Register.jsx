import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import Paw from "../../assets/foot.png";
import GoogleAuthButton from "../../components/auth/GoogleAuthButton";
import AuthPolicyModal from "../../components/auth/AuthPolicyModal";
import { useToast } from "../../components/Toast";

const TERMS_ACCEPTANCE_REQUIRED = "TERMS_ACCEPTANCE_REQUIRED";
const PASSWORD_REQUIREMENTS = [
  {
    key: "length",
    label: "At least 8 characters",
    test: (value) => value.length >= 8,
  },
  {
    key: "uppercase",
    label: "At least 1 uppercase letter",
    test: (value) => /[A-Z]/.test(value),
  },
  {
    key: "number",
    label: "At least 1 number",
    test: (value) => /\d/.test(value),
  },
  {
    key: "special",
    label: "At least 1 special character",
    test: (value) => /[^A-Za-z0-9]/.test(value),
  },
];

function getPasswordValidationMessage(password) {
  if (password.length < 8) {
    return "Password must be at least 8 characters and include at least 1 uppercase letter, 1 number, and 1 special character.";
  }
  if (!/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return "Password must include at least 1 uppercase letter, 1 number, and 1 special character.";
  }
  return "";
}

const SignUpPage = () => {
  const navigate = useNavigate();
  const { register, loginWithGoogle, getAuthPolicy, user } = useAuth();
  const toast = useToast();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [policy, setPolicy] = useState(null);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policySubmitting, setPolicySubmitting] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const passwordChecks = PASSWORD_REQUIREMENTS.map((rule) => ({
    ...rule,
    passed: rule.test(formData.password),
  }));

  const validateForm = () => {
    if (
      !formData.username ||
      !formData.email ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError("Please fill in all fields");
      return false;
    }

    if (formData.username.length < 3) {
      setError("Username must be at least 3 characters");
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email");
      return false;
    }

    const passwordValidationMessage = getPasswordValidationMessage(formData.password);
    if (passwordValidationMessage) {
      setError(passwordValidationMessage);
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    return true;
  };

  const loadPolicy = async () => {
    if (policy) {
      return policy;
    }

    setPolicyLoading(true);
    try {
      const nextPolicy = await getAuthPolicy();
      setPolicy(nextPolicy);
      return nextPolicy;
    } catch {
      setError("Failed to load the account agreement. Please try again.");
      return null;
    } finally {
      setPolicyLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!validateForm()) return;

    const nextPolicy = await loadPolicy();
    if (!nextPolicy) {
      return;
    }

    setPendingAction({
      type: "register",
      email: formData.email.trim().toLowerCase(),
      password: formData.password,
      username: formData.username.trim(),
    });
    setPolicyOpen(true);
  };

  const handleGoogleCredential = async (response) => {
    const credential = response?.credential;
    if (!credential) {
      setError("Google sign-in did not return a credential.");
      return;
    }

    setError("");
    setGoogleLoading(true);

    try {
      const result = await loginWithGoogle(credential);
      if (result.success) {
        if (
          result.google_auth_status === "linked_existing" ||
          result.google_auth_status === "created_new"
        ) {
          toast.success(result.google_auth_message || "Signed in with Google.");
        }

        navigate(result?.user?.is_admin ? "/admin/overview" : "/dashboard", {
          replace: true,
        });
        return;
      }

      if (result.code === TERMS_ACCEPTANCE_REQUIRED) {
        const nextPolicy = await loadPolicy();
        if (nextPolicy) {
          setPendingAction({ type: "google", credential });
          setPolicyOpen(true);
        }
      } else {
        setError(result.error || "Google sign-in failed.");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handlePolicyAccept = async () => {
    if (!policy || !pendingAction) return;

    setPolicySubmitting(true);
    setError("");

    const policyAcceptance = {
      policy_key: policy.policy_key,
      policy_version: policy.policy_version,
      accept_terms: true,
    };

    try {
      if (pendingAction.type === "register") {
        setLoading(true);
        const result = await register(
          pendingAction.email,
          pendingAction.password,
          pendingAction.username,
          policyAcceptance
        );

        if (result.success) {
          navigate("/dashboard");
          return;
        }

        setError(result.error || "Registration failed.");
        return;
      }

      setGoogleLoading(true);
      const result = await loginWithGoogle(pendingAction.credential, policyAcceptance);
      if (result.success) {
        if (
          result.google_auth_status === "linked_existing" ||
          result.google_auth_status === "created_new"
        ) {
          toast.success(result.google_auth_message || "Signed in with Google.");
        }

        navigate(result?.user?.is_admin ? "/admin/overview" : "/dashboard", {
          replace: true,
        });
        return;
      }

      setError(result.error || "Google sign-in failed.");
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
      setGoogleLoading(false);
      setPolicySubmitting(false);
      setPolicyOpen(false);
      setPendingAction(null);
    }
  };

  const closePolicyModal = () => {
    if (policySubmitting) return;
    setPolicyOpen(false);
    setPendingAction(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 px-4 py-12 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-full max-w-5xl min-h-[560px] bg-white rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-[30%_70%] dark:border dark:border-slate-800 dark:bg-slate-900">
        <div className="bg-blue-600 flex flex-col items-center justify-center px-6 py-12 text-white">
          <h1 className="text-2xl font-extrabold tracking-wide">DOGSCAN AI</h1>
          <div className="w-44 h-44 rounded-full bg-white flex items-center justify-center shadow-lg">
            <img src={Paw} alt="foot paw" />
          </div>
        </div>

        <div className="p-12 flex flex-col justify-center">
          <div className="mb-6">
            <h1 className="text-2xl font-extrabold text-gray-800 tracking-wide dark:text-slate-100">
              REGISTER
            </h1>
            <p className="text-gray-600 mt-1 text-sm dark:text-slate-400">
              Create your account to get started
            </p>
          </div>

          {error && (
            <div className="mb-5 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200">
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 mb-2 dark:text-slate-300"
              >
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={formData.username}
                onChange={handleChange}
                placeholder="johndoe"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                Pick a public username with at least 3 characters.
              </p>
            </div>

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
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                Use an email address you can access for login, recovery, and Google account linking.
              </p>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2 dark:text-slate-300"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500 dark:text-slate-400"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/70">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600 dark:text-slate-300">
                  Password Requirements
                </p>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {passwordChecks.map((rule) => (
                    <div
                      key={rule.key}
                      className={`rounded-md px-3 py-2 text-xs font-medium ${
                        rule.passed
                          ? "bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300"
                          : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                      }`}
                    >
                      {rule.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-700 mb-2 dark:text-slate-300"
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm password"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-gray-500 dark:text-slate-400"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="mt-2 text-xs text-gray-500 dark:text-slate-400">
                Re-enter the exact same password to confirm it.
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>

            <GoogleAuthButton
              onCredential={handleGoogleCredential}
              disabled={loading || googleLoading}
            />

            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-slate-400">
              <Link
                to="/"
                className="flex items-center gap-1 hover:text-blue-600 dark:hover:text-blue-400"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                Already have an account?{" "}
                <Link
                  to="/login"
                  className="font-semibold text-blue-600 hover:underline dark:text-blue-400"
                >
                  Login
                </Link>
              </p>
            </div>
          </form>
        </div>
      </div>

      <AuthPolicyModal
        isOpen={policyOpen}
        policy={policy}
        loading={policyLoading}
        submitting={policySubmitting}
        confirmLabel="Agree and Create Account"
        onClose={closePolicyModal}
        onAccept={handlePolicyAccept}
      />
    </div>
  );
};

export default SignUpPage;
