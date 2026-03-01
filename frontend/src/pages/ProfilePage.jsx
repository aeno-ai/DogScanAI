import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  User,
  Mail,
  Lock,
  Calendar,
  Shield,
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
    email: buildEmptyCooldown(),
    password: buildEmptyCooldown(),
  });

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");

  const loadProfile = useCallback(async () => {
    setInitialLoading(true);
    try {
      const { data } = await api.get("/api/profile");
      const nextUser = data?.user || {};
      setFormData((prev) => ({
        ...prev,
        username: nextUser.username || "",
        email: nextUser.email || "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      }));
      setStats({
        total_scans: Number(data?.stats?.total_scans || 0),
      });
      setCooldowns({
        username: data?.cooldowns?.username || buildEmptyCooldown(),
        email: data?.cooldowns?.email || buildEmptyCooldown(),
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
        color: "text-blue-600 bg-blue-100",
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
        color: "text-green-600 bg-green-100",
        value: String(stats.total_scans),
      },
      {
        key: "role",
        label: "Role",
        icon: User,
        color: "text-purple-600 bg-purple-100",
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
      email: "email",
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

  const handleEmailChange = async () => {
    const email = formData.email.trim().toLowerCase();
    if (!email) return setFieldError("email", "Email is required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return setFieldError("email", "Invalid email format.");
    }
    if (email === String(user?.email || "").toLowerCase()) {
      return setFieldError("email", "New email must be different from current.");
    }
    if (!isCurrentPasswordValid()) return;

    const cooldown = getCooldownStatus("email");
    if (!cooldown.canChange) {
      return setFieldError(
        "email",
        `Email is on cooldown until ${formatDateTime(cooldown.canChangeAfter)}.`
      );
    }

    setSubmittingType("email");
    try {
      const { data } = await api.put("/api/profile/email", {
        email,
        current_password: formData.currentPassword,
      });

      if (data?.requires_relogin) {
        await logout();
        navigate("/login?notice=Email%20updated.%20Please%20log%20in%20again.", { replace: true });
        return;
      }

      setSuccessMessage("Email updated successfully.");
      setFormData((prev) => ({ ...prev, currentPassword: "" }));
      await refreshUser();
      await loadProfile();
    } catch (err) {
      handleApiError(err, "Failed to update email.");
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
    if (formData.currentPassword === formData.newPassword) {
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
        <TopNav />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <TopNav />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">Account Settings</h1>
          <p className="text-gray-600">Manage your account information and security settings</p>
        </div>

        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-green-700 font-medium">{successMessage}</p>
          </div>
        )}
        {errors.general && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-red-700 font-medium">{errors.general}</p>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
              <div className="text-center mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4">
                  {user?.username?.charAt(0).toUpperCase() || "U"}
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">{user?.username}</h2>
                <p className="text-sm text-gray-600">{user?.email}</p>
              </div>

              <div className="space-y-3 mb-6">
                {accountStats.map((stat) => {
                  const IconComponent = stat.icon;
                  return (
                    <div key={stat.key} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <div
                        className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center flex-shrink-0`}
                      >
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-600">{stat.label}</p>
                        <p className="text-sm font-semibold text-gray-900 truncate">{stat.value}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium"
              >
                <LogOut className="w-4 h-4" />
                Log Out
              </button>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Username</h3>
                    <p className="text-sm text-gray-600">Change your username</p>
                  </div>
                </div>
                {!getCooldownStatus("username").canChange && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {getCooldownStatus("username").daysLeft} days left
                  </span>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Username</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
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

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12 ${
                        errors.currentPassword ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
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

                <button
                  onClick={handleUsernameChange}
                  disabled={submittingType === "username" || !getCooldownStatus("username").canChange}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {submittingType === "username" ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" />Update Username</>}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Mail className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Email Address</h3>
                    <p className="text-sm text-gray-600">Change your email address</p>
                  </div>
                </div>
                {!getCooldownStatus("email").canChange && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {getCooldownStatus("email").daysLeft} days left
                  </span>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.email ? "border-red-500" : "border-gray-300"
                    }`}
                    placeholder="Enter new email"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4" />
                      {errors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPassword ? "text" : "password"}
                      name="currentPassword"
                      value={formData.currentPassword}
                      onChange={handleChange}
                      className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12 ${
                        errors.currentPassword ? "border-red-500" : "border-gray-300"
                      }`}
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
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

                <button
                  onClick={handleEmailChange}
                  disabled={submittingType === "email" || !getCooldownStatus("email").canChange}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {submittingType === "email" ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" />Update Email</>}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Lock className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Password</h3>
                    <p className="text-sm text-gray-600">Change your password</p>
                  </div>
                </div>
                {!getCooldownStatus("password").canChange && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {getCooldownStatus("password").daysLeft} days left
                  </span>
                )}
              </div>

              {!showPasswordFields ? (
                <button
                  onClick={() => setShowPasswordFields(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  <Key className="w-5 h-5" />
                  Change Password
                </button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Current Password</label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        name="currentPassword"
                        value={formData.currentPassword}
                        onChange={handleChange}
                        className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12 ${
                          errors.currentPassword ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
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

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        name="newPassword"
                        value={formData.newPassword}
                        onChange={handleChange}
                        className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12 ${
                          errors.newPassword ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Enter new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className={`w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12 ${
                          errors.confirmPassword ? "border-red-500" : "border-gray-300"
                        }`}
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
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
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {submittingType === "password" ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Save className="w-5 h-5" />
                          Update Password
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
                      className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <Shield className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Security Information</h3>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>- Username can be changed once every 30 days</li>
                    <li>- Email can be changed once every 30 days</li>
                    <li>- Password can be changed once every 7 days</li>
                    <li>- Current password is required for all updates</li>
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
