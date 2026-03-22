import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Lock,
  Calendar,
  Shield,
  Link2,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  Save,
  Key,
  LogOut,
} from "lucide-react";
import TopNav from "../components/ui/TopNav";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";

const ROLE_LABEL = {
  user: "User",
  admin: "Admin",
  superadmin: "Superadmin",
};

const AUTH_PROVIDER_META = {
  password: {
    label: "Password",
    tone: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/15 dark:text-blue-300 dark:border-blue-400/40",
  },
  google: {
    label: "Google",
    tone: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-400/40",
  },
};

function getRole(user) {
  if (user?.is_superadmin) return ROLE_LABEL.superadmin;
  if (user?.is_admin) return ROLE_LABEL.admin;
  return ROLE_LABEL.user;
}

function buildEmptyCooldown() {
  return {
    last_changed: null,
    can_change_after: null,
    can_change: true,
    seconds_left: 0,
  };
}

function formatDateTime(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function toDaysLeft(secondsLeft) {
  const value = Number(secondsLeft || 0);
  return Math.max(0, Math.ceil(value / 86400));
}

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, logout, refreshUser } = useAuth();

  const [initialLoading, setInitialLoading] = useState(true);
  const [submittingType, setSubmittingType] = useState(null);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [stats, setStats] = useState({ total_scans: 0 });
  const [cooldowns, setCooldowns] = useState({
    username: buildEmptyCooldown(),
    password: buildEmptyCooldown(),
  });

  const [formData, setFormData] = useState({
    username: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");

  const authProviders = useMemo(() => {
    const values = Array.isArray(user?.auth_providers) ? user.auth_providers : [];
    return Array.from(
      new Set(values.map((item) => String(item).toLowerCase()).filter(Boolean))
    );
  }, [user?.auth_providers]);

  const hasPasswordProvider = authProviders.includes("password");

  const providerBadges = useMemo(
    () =>
      authProviders.map((provider) => ({
        key: provider,
        label: AUTH_PROVIDER_META[provider]?.label || provider,
        tone:
          AUTH_PROVIDER_META[provider]?.tone ||
          "bg-slate-100 text-slate-700 border-slate-200",
      })),
    [authProviders]
  );

  const loadProfile = useCallback(async () => {
    setInitialLoading(true);
    try {
      const { data } = await api.get("/api/profile");
      const nextUser = data?.user || {};
      setFormData((prev) => ({
        ...prev,
        username: nextUser.username || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
      setStats({
        total_scans: Number(data?.stats?.total_scans || 0),
      });
      setCooldowns({
        username: data?.cooldowns?.username || buildEmptyCooldown(),
        password: data?.cooldowns?.password || buildEmptyCooldown(),
      });
      setErrors({});
    } catch {
      setErrors({ general: "Failed to load profile details." });
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const accountStats = useMemo(
    () => [
      {
        key: "member_since",
        label: "Member Since",
        icon: Calendar,
        color: "text-blue-600 bg-blue-100 dark:text-blue-300 dark:bg-blue-500/15",
        value: user?.created_at
          ? new Date(user.created_at).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })
          : "N/A",
      },
      {
        key: "total_scans",
        label: "Total Scans",
        icon: Shield,
        color: "text-green-600 bg-green-100 dark:text-green-300 dark:bg-green-500/15",
        value: String(stats.total_scans),
      },
      {
        key: "role",
        label: "Role",
        icon: User,
        color: "text-blue-600 bg-blue-100 dark:text-blue-300 dark:bg-blue-500/15",
        value: getRole(user),
      },
    ],
    [stats.total_scans, user]
  );

  const getCooldownStatus = (type) => {
    const cooldown = cooldowns[type] || buildEmptyCooldown();
    return {
      canChange: Boolean(cooldown.can_change),
      daysLeft: toDaysLeft(cooldown.seconds_left),
      canChangeAfter: cooldown.can_change_after,
    };
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "", general: "" }));
    if (successMessage) setSuccessMessage("");
  };

  const setFieldError = (field, message) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  };

  const isCurrentPasswordValid = () => {
    if (!hasPasswordProvider) return true;
    if (!formData.currentPassword) {
      setFieldError("currentPassword", "Current password is required.");
      return false;
    }
    return true;
  };

  const handleApiError = (err, fallbackMessage) => {
    const payload = err?.response?.data || {};
    const fieldMap = {
      username: "username",
      current_password: "currentPassword",
      new_password: "newPassword",
    };

    const uiField = fieldMap[payload.field];
    if (uiField) setFieldError(uiField, payload.error || fallbackMessage);
    else setErrors((prev) => ({ ...prev, general: payload.error || fallbackMessage }));
  };

  const handleUsernameChange = async () => {
    const username = formData.username.trim();
    if (!username) return setFieldError("username", "Username is required.");
    if (username.length < 3) return setFieldError("username", "Username must be at least 3 characters.");
    if (username === user?.username) {
      return setFieldError("username", "New username must be different from current.");
    }
    if (!isCurrentPasswordValid()) return;

    const cooldown = getCooldownStatus("username");
    if (!cooldown.canChange) {
      return setFieldError(
        "username",
        `Username is on cooldown until ${formatDateTime(cooldown.canChangeAfter)}.`
      );
    }

    setSubmittingType("username");
    try {
      const { data } = await api.put("/api/profile/username", {
        username,
        current_password: formData.currentPassword,
      });

      setCooldowns((prev) => ({
        ...prev,
        username: data?.cooldown || prev.username,
      }));
      setFormData((prev) => ({ ...prev, currentPassword: "" }));
      setSuccessMessage("Username updated successfully.");
      await refreshUser();
      await loadProfile();
    } catch (err) {
      handleApiError(err, "Failed to update username.");
    } finally {
      setSubmittingType(null);
    }
  };

  const handlePasswordChange = async () => {
    if (!isCurrentPasswordValid()) return;
    if (!formData.newPassword) return setFieldError("newPassword", "New password is required.");
    if (formData.newPassword.length < 8) {
      return setFieldError("newPassword", "New password must be at least 8 characters.");
    }
    if (hasPasswordProvider && formData.currentPassword === formData.newPassword) {
      return setFieldError("newPassword", "New password must be different from current.");
    }
    if (formData.newPassword !== formData.confirmPassword) {
      return setFieldError("confirmPassword", "Passwords do not match.");
    }

    const cooldown = getCooldownStatus("password");
    if (!cooldown.canChange) {
      return setFieldError(
        "newPassword",
        `Password is on cooldown until ${formatDateTime(cooldown.canChangeAfter)}.`
      );
    }

    setSubmittingType("password");
    try {
      const { data } = await api.put("/api/profile/password", {
        current_password: formData.currentPassword,
        new_password: formData.newPassword,
      });

      if (data?.requires_relogin) {
        await logout();
        navigate("/login?notice=Password%20updated.%20Please%20log%20in%20again.", {
          replace: true,
        });
        return;
      }

      setSuccessMessage("Password updated successfully.");
      setFormData((prev) => ({
        ...prev,
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
      setShowPasswordFields(false);
      await loadProfile();
    } catch (err) {
      handleApiError(err, "Failed to update password.");
    } finally {
      setSubmittingType(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  if (initialLoading) {
    return (
      <div className="page-bg">
        <TopNav />
        <div className="page-container pt-24 pb-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="page-bg">
      <TopNav />

      <div className="page-container pt-24 pb-12">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900 dark:text-slate-100 sm:text-4xl">Account Settings</h1>
          <p className="text-gray-600 dark:text-slate-400">Manage your account information and security settings</p>
        </div>

        {successMessage && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900/60 dark:bg-green-950/30">
            <CheckCircle className="h-5 w-5 shrink-0 text-green-600 dark:text-green-300" />
            <p className="font-medium text-green-700 dark:text-green-200">{successMessage}</p>
          </div>
        )}
        {errors.general && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/30">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-300" />
            <p className="font-medium text-red-700 dark:text-red-200">{errors.general}</p>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-xl bg-white p-6 shadow-sm dark:border dark:border-slate-800 dark:bg-slate-900">
              <div className="text-center mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4">
                  {user?.username?.charAt(0).toUpperCase() || "U"}
                </div>
                <h2 className="mb-1 text-xl font-bold text-gray-900 dark:text-slate-100">{user?.username}</h2>
                <p className="text-sm text-gray-600 dark:text-slate-400">{user?.email}</p>
              </div>

              <div className="space-y-3 mb-6">
                {accountStats.map((stat) => {
                  const IconComponent = stat.icon;
                  return (
                    <div key={stat.key} className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 dark:bg-slate-800/80">
                      <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center flex-shrink-0`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-600 dark:text-slate-400">{stat.label}</p>
                        <p className="truncate text-sm font-semibold text-gray-900 dark:text-slate-100">{stat.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/70">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300">
                    <Link2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-slate-100">Sign-in Methods</h3>
                    <p className="text-sm text-gray-600 dark:text-slate-400">
                      Connected ways to access your account
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {providerBadges.map((provider) => (
                    <span
                      key={provider.key}
                      className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${provider.tone}`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      {provider.label}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                  Linked sign-in methods are shown here for clarity. Unlinking is not available yet.
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-red-50 px-4 py-2.5 font-medium text-red-600 transition-colors hover:bg-red-100 dark:bg-red-950/30 dark:text-red-200 dark:hover:bg-red-950/50"
              >
                <LogOut className="w-4 h-4" />
                Log Out
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {/* Username */}
            <div className="rounded-xl bg-white p-6 shadow-sm dark:border dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-slate-100">Username</h3>
                    <p className="text-sm text-gray-600 dark:text-slate-400">Change your username</p>
                  </div>
                </div>
                {!getCooldownStatus("username").canChange && (
                  <span className="flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300">
                    <Clock className="w-3 h-3" />
                    {getCooldownStatus("username").daysLeft} days left
                  </span>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">New Username</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className={`w-full rounded-lg border px-4 py-2.5 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 ${
                      errors.username ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Enter new username"
                  />
                  {errors.username && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.username}
                    </p>
                  )}
                </div>

                {hasPasswordProvider ? (
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        name="currentPassword"
                        value={formData.currentPassword}
                        onChange={handleChange}
                        className={`w-full rounded-lg border px-4 py-2.5 pr-12 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 ${
                          errors.currentPassword ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                      >
                        {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.currentPassword && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.currentPassword}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
                    No password is required for this change because your account currently signs in with Google only.
                  </div>
                )}

                <button
                  onClick={handleUsernameChange}
                  disabled={submittingType === "username" || !getCooldownStatus("username").canChange}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {submittingType === "username" ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <><Save className="w-5 h-5" />Update Username</>
                  )}
                </button>
              </div>
            </div>

            {/* Password */}
            <div className="rounded-xl bg-white p-6 shadow-sm dark:border dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Lock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-slate-100">Password</h3>
                    <p className="text-sm text-gray-600 dark:text-slate-400">
                      {hasPasswordProvider
                        ? "Change your password"
                        : "Set a password for sign-in alongside Google"}
                    </p>
                  </div>
                </div>
                {!getCooldownStatus("password").canChange && (
                  <span className="flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300">
                    <Clock className="w-3 h-3" />
                    {getCooldownStatus("password").daysLeft} days left
                  </span>
                )}
              </div>

              {!showPasswordFields ? (
                <button
                  onClick={() => setShowPasswordFields(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  <Key className="w-5 h-5" />
                  {hasPasswordProvider ? "Change Password" : "Set Password"}
                </button>
              ) : (
                <div className="space-y-4">
                  {hasPasswordProvider ? (
                    <div>
                      <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">Current Password</label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          name="currentPassword"
                          value={formData.currentPassword}
                          onChange={handleChange}
                          className={`w-full rounded-lg border px-4 py-2.5 pr-12 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 ${
                            errors.currentPassword ? "border-red-500" : "border-gray-300"
                          }`}
                          placeholder="Enter current password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword((prev) => !prev)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                        >
                          {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {errors.currentPassword && (
                        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.currentPassword}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
                      No current password is required. Adding one here will let you sign in with both Google and email/password.
                    </div>
                  )}

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">New Password</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleChange}
                        className={`w-full rounded-lg border px-4 py-2.5 pr-12 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 ${
                          errors.newPassword ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Enter new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                      >
                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.newPassword && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.newPassword}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-slate-300">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className={`w-full rounded-lg border px-4 py-2.5 pr-12 focus:border-transparent focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500 ${
                          errors.confirmPassword ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
                      >
                        {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handlePasswordChange}
                      disabled={submittingType === "password" || !getCooldownStatus("password").canChange}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {submittingType === "password" ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          {hasPasswordProvider ? "Update Password" : "Set Password"}
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setShowPasswordFields(false);
                        setFormData((prev) => ({
                          ...prev,
                          newPassword: "",
                          confirmPassword: "",
                        }));
                        setErrors((prev) => ({
                          ...prev,
                          newPassword: "",
                          confirmPassword: "",
                        }));
                      }}
                      className="rounded-lg bg-gray-100 px-4 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Security Info */}
            <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-6 dark:border-amber-900/60 dark:from-amber-950/40 dark:to-orange-950/30">
              <div className="flex items-start gap-4">
                <Shield className="mt-0.5 h-6 w-6 flex-shrink-0 text-amber-600 dark:text-amber-300" />
                <div>
                  <h3 className="mb-2 font-semibold text-gray-900 dark:text-amber-50">Security Information</h3>
                  <ul className="space-y-1 text-sm text-gray-700 dark:text-amber-100/85">
                    <li>- Username can be changed once every 30 days</li>
                    <li>- Password can be changed once every 7 days</li>
                    <li>
                      -{" "}
                      {hasPasswordProvider
                        ? "Current password is required for sensitive account updates"
                        : "Your account currently uses Google sign-in, so you can set a password from this page"}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;