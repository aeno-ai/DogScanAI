import React, { useState, useEffect } from "react";
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
  X,
  Key,
  Edit2,
  LogOut
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import TopNav from "../components/ui/TopNav";

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  // State management
  const [loading, setLoading] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  
  // Cooldown data
  const [cooldowns, setCooldowns] = useState({
    username: null,
    email: null,
    password: null
  });
  
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");

  // JSON-like configuration for easy editing
  const cooldownConfig = {
    username: {
      days: 30,
      label: "Username",
      icon: User,
      color: "text-blue-600 bg-blue-100"
    },
    email: {
      days: 30,
      label: "Email",
      icon: Mail,
      color: "text-green-600 bg-green-100"
    },
    password: {
      days: 7,
      label: "Password",
      icon: Lock,
      color: "text-purple-600 bg-purple-100"
    }
  };

  const accountStatsConfig = [
    {
      key: "member_since",
      label: "Member Since",
      icon: Calendar,
      color: "text-blue-600 bg-blue-100",
      value: user?.created_at ? new Date(user.created_at).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric"
      }) : "N/A"
    },
    {
      key: "total_scans",
      label: "Total Scans",
      icon: Shield,
      color: "text-green-600 bg-green-100",
      value: "24" // Replace with actual data
    },
    {
      key: "last_login",
      label: "Last Login",
      icon: Clock,
      color: "text-purple-600 bg-purple-100",
      value: "Today" // Replace with actual data
    }
  ];

  // Mock cooldown data - replace with actual API call
  const mockCooldowns = {
    username: {
      last_changed: "2024-01-15T10:00:00Z",
      can_change_after: "2024-02-14T10:00:00Z"
    },
    email: {
      last_changed: null,
      can_change_after: null
    },
    password: {
      last_changed: "2024-02-08T10:00:00Z",
      can_change_after: "2024-02-15T10:00:00Z"
    }
  };

  // Load user data and cooldowns
  useEffect(() => {
    const fetchUserData = async () => {
      setLoading(true);
      // Replace with actual API call: await fetch('/api/user/profile')
      setTimeout(() => {
        setFormData({
          username: user?.username || "",
          email: user?.email || "",
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        });
        setCooldowns(mockCooldowns);
        setLoading(false);
      }, 500);
    };

    fetchUserData();
  }, [user]);

  // Calculate cooldown status
  const getCooldownStatus = (type) => {
    const cooldown = cooldowns[type];
    if (!cooldown || !cooldown.can_change_after) {
      return { canChange: true, daysLeft: 0 };
    }

    const now = new Date();
    const canChangeDate = new Date(cooldown.can_change_after);
    const canChange = now >= canChangeDate;
    
    if (canChange) {
      return { canChange: true, daysLeft: 0 };
    }

    const diffTime = canChangeDate - now;
    const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return { canChange: false, daysLeft };
  };

  // Handle input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    setErrors(prev => ({
      ...prev,
      [name]: ""
    }));
  };

  // Validate form
  const validateForm = (changeType) => {
    const newErrors = {};

    if (changeType === "username") {
      if (!formData.username.trim()) {
        newErrors.username = "Username is required";
      } else if (formData.username.length < 3) {
        newErrors.username = "Username must be at least 3 characters";
      } else if (formData.username === user?.username) {
        newErrors.username = "New username must be different from current";
      }
    }

    if (changeType === "email") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!formData.email.trim()) {
        newErrors.email = "Email is required";
      } else if (!emailRegex.test(formData.email)) {
        newErrors.email = "Invalid email format";
      } else if (formData.email === user?.email) {
        newErrors.email = "New email must be different from current";
      }
    }

    if (changeType === "password") {
      if (!formData.currentPassword) {
        newErrors.currentPassword = "Current password is required";
      }
      if (!formData.newPassword) {
        newErrors.newPassword = "New password is required";
      } else if (formData.newPassword.length < 8) {
        newErrors.newPassword = "Password must be at least 8 characters";
      }
      if (formData.newPassword !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match";
      }
      if (formData.currentPassword === formData.newPassword) {
        newErrors.newPassword = "New password must be different from current";
      }
    }

    // Always require current password for security
    if (!formData.currentPassword && changeType !== "username") {
      newErrors.currentPassword = "Current password is required to make changes";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle username change
  const handleUsernameChange = async () => {
    if (!validateForm("username")) return;

    const { canChange } = getCooldownStatus("username");
    if (!canChange) {
      setErrors({ username: "You cannot change your username yet" });
      return;
    }

    setLoading(true);
    try {
      // Replace with actual API call
      // await fetch('/api/user/change-username', {
      //   method: 'PUT',
      //   body: JSON.stringify({
      //     username: formData.username,
      //     currentPassword: formData.currentPassword
      //   })
      // });

      setTimeout(() => {
        setSuccessMessage("Username updated successfully!");
        setCooldowns(prev => ({
          ...prev,
          username: {
            last_changed: new Date().toISOString(),
            can_change_after: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          }
        }));
        setFormData(prev => ({ ...prev, currentPassword: "" }));
        setLoading(false);
        
        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(""), 5000);
      }, 1000);
    } catch (error) {
      setErrors({ username: "Failed to update username" });
      setLoading(false);
    }
  };

  // Handle email change
  const handleEmailChange = async () => {
    if (!validateForm("email")) return;

    const { canChange } = getCooldownStatus("email");
    if (!canChange) {
      setErrors({ email: "You cannot change your email yet" });
      return;
    }

    setLoading(true);
    try {
      // Replace with actual API call
      // await fetch('/api/user/change-email', {
      //   method: 'PUT',
      //   body: JSON.stringify({
      //     email: formData.email,
      //     currentPassword: formData.currentPassword
      //   })
      // });

      setTimeout(() => {
        setSuccessMessage("Email updated successfully! Please verify your new email.");
        setCooldowns(prev => ({
          ...prev,
          email: {
            last_changed: new Date().toISOString(),
            can_change_after: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          }
        }));
        setFormData(prev => ({ ...prev, currentPassword: "" }));
        setLoading(false);
        
        setTimeout(() => setSuccessMessage(""), 5000);
      }, 1000);
    } catch (error) {
      setErrors({ email: "Failed to update email" });
      setLoading(false);
    }
  };

  // Handle password change
  const handlePasswordChange = async () => {
    if (!validateForm("password")) return;

    const { canChange } = getCooldownStatus("password");
    if (!canChange) {
      setErrors({ password: "You cannot change your password yet" });
      return;
    }

    setLoading(true);
    try {
      // Replace with actual API call
      // await fetch('/api/user/change-password', {
      //   method: 'PUT',
      //   body: JSON.stringify({
      //     currentPassword: formData.currentPassword,
      //     newPassword: formData.newPassword
      //   })
      // });

      setTimeout(() => {
        setSuccessMessage("Password updated successfully!");
        setCooldowns(prev => ({
          ...prev,
          password: {
            last_changed: new Date().toISOString(),
            can_change_after: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
          }
        }));
        setFormData(prev => ({
          ...prev,
          currentPassword: "",
          newPassword: "",
          confirmPassword: ""
        }));
        setShowPasswordFields(false);
        setLoading(false);
        
        setTimeout(() => setSuccessMessage(""), 5000);
      }, 1000);
    } catch (error) {
      setErrors({ password: "Failed to update password" });
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      logout();
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50">
      <TopNav />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">
            Account Settings
          </h1>
          <p className="text-gray-600">
            Manage your account information and security settings
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-green-700 font-medium">{successMessage}</p>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Sidebar - Account Overview */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6 sticky top-24">
              {/* Profile Avatar */}
              <div className="text-center mb-6">
                <div className="w-24 h-24 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-3xl mx-auto mb-4">
                  {user?.username?.charAt(0).toUpperCase()}
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">
                  {user?.username}
                </h2>
                <p className="text-sm text-gray-600">{user?.email}</p>
              </div>

              {/* Account Stats */}
              <div className="space-y-3 mb-6">
                {accountStatsConfig.map((stat) => {
                  const IconComponent = stat.icon;
                  return (
                    <div
                      key={stat.key}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                    >
                      <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center flex-shrink-0`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-600">{stat.label}</p>
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {stat.value}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors font-medium"
              >
                <LogOut className="w-4 h-4" />
                Log Out
              </button>
            </div>
          </div>

          {/* Main Content - Settings */}
          <div className="lg:col-span-2 space-y-6">
            {/* Username Section */}
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
                {(() => {
                  const { canChange, daysLeft } = getCooldownStatus("username");
                  return !canChange && (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {daysLeft} days left
                    </span>
                  );
                })()}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Username
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Password
                  </label>
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
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
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
                  disabled={loading || !getCooldownStatus("username").canChange}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Update Username
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Email Section */}
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
                {(() => {
                  const { canChange, daysLeft } = getCooldownStatus("email");
                  return !canChange && (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {daysLeft} days left
                    </span>
                  );
                })()}
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    New Email Address
                  </label>
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Current Password
                  </label>
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
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleEmailChange}
                  disabled={loading || !getCooldownStatus("email").canChange}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      Update Email
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Password Section */}
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
                {(() => {
                  const { canChange, daysLeft } = getCooldownStatus("password");
                  return !canChange && (
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {daysLeft} days left
                    </span>
                  );
                })()}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Password
                    </label>
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
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
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
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showNewPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm New Password
                    </label>
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
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
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
                      disabled={loading || !getCooldownStatus("password").canChange}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {loading ? (
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
                        setFormData(prev => ({
                          ...prev,
                          currentPassword: "",
                          newPassword: "",
                          confirmPassword: ""
                        }));
                        setErrors({});
                      }}
                      className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Security Notice */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <Shield className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">
                    Security Information
                  </h3>
                  <ul className="space-y-1 text-sm text-gray-700">
                    <li>• Username can be changed once every 30 days</li>
                    <li>• Email can be changed once every 30 days</li>
                    <li>• Password can be changed once every 7 days</li>
                    <li>• Email verification is required for email changes</li>
                    <li>• You'll be notified of any security changes</li>
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