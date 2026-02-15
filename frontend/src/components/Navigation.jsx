import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    setIsMenuOpen(false);
    navigate("/", { replace: true });
  };

  const navLinks = [
    { href: "#features", label: "Features" },
    { href: "#how-it-works", label: "How it Works" },
    { href: "#gallery", label: "Gallery" },
  ];

  // Truncate email to max 18 characters for the panel
  const truncateEmail = (email) => {
    if (!email) return "";
    return email.length > 18 ? email.substring(0, 18) + "..." : email;
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
      <nav className="max-w-7xl mx-auto flex items-center justify-between h-16 md:h-20 px-4 md:px-6">
        {/* Left Section: Mobile Menu + Logo */}
        <div className="flex items-center gap-3">
          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen((s) => !s)}
            className="md:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>

          {/* Logo */}
          <Link
            to="/"
            className="font-bold text-lg md:text-xl text-gray-900 flex items-center whitespace-nowrap"
          >
            DogScan<span className="text-blue-600">AI</span>
          </Link>
        </div>

        {/* Center Section: Desktop Navigation */}
        <div className="hidden md:flex items-center gap-6 lg:gap-8 absolute left-1/2 -translate-x-1/2">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm lg:text-base text-gray-600 hover:text-gray-900 transition-colors font-medium whitespace-nowrap"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right Section: Desktop Auth / CTA */}
        <div className="flex items-center">
          {user ? (
            <div className="hidden md:flex items-center gap-3 lg:gap-4">
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-sm lg:text-base font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? "text-blue-600 bg-blue-50"
                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  }`
                }
              >
                Dashboard
              </NavLink>

              <span className="text-sm text-gray-600 max-w-[120px] lg:max-w-[160px] truncate" title={user.email}>
                {user.email}
              </span>

              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors whitespace-nowrap"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2 lg:gap-3">
              <Link
                to="/login"
                className="text-gray-600 hover:text-gray-900 px-3 lg:px-4 py-2 text-sm lg:text-base font-medium transition-colors whitespace-nowrap"
              >
                Login
              </Link>

              <Link
                to="/signup"
                className="text-gray-600 hover:text-gray-900 px-3 lg:px-4 py-2 text-sm lg:text-base font-medium transition-colors whitespace-nowrap"
              >
                Register
              </Link>

              <a
                href="#app"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm lg:text-base font-medium hover:bg-blue-700 transition-colors whitespace-nowrap shadow-sm hover:shadow-md"
              >
                Get the App
              </a>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Side Panel */}
      <aside
        className={`h-screen md:hidden fixed inset-y-0 left-0 w-64 bg-white shadow-xl z-40 transform transition-transform duration-300 ease-in-out ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!isMenuOpen}
      >
        {/* Panel Header */}
        <div className="h-16 px-4 border-b border-gray-200 flex items-center justify-between">
          <h4 className="font-semibold text-gray-900">Menu</h4>

          <div className="flex items-center gap-2 min-w-0 flex-1 justify-end">
            {user && (
              <p
                className="text-xs text-gray-600 truncate max-w-[120px]"
                title={user?.email}
              >
                {truncateEmail(user?.email)}
              </p>
            )}
            <button
              onClick={() => setIsMenuOpen(false)}
              className="p-1.5 rounded-md hover:bg-gray-100 flex-shrink-0 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Panel Content */}
        <nav className="p-4 space-y-1 bg-white h-[calc(100vh-4rem)] overflow-y-auto">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setIsMenuOpen(false)}
              className="block px-4 py-3 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors font-medium"
            >
              {link.label}
            </a>
          ))}

          <hr className="my-4 border-gray-200" />

          {user ? (
            <div className="space-y-1">
              <NavLink
                to="/dashboard"
                onClick={() => setIsMenuOpen(false)}
                className={({ isActive }) =>
                  `block px-4 py-3 rounded-lg transition-colors font-medium ${
                    isActive
                      ? "text-blue-600 bg-blue-50"
                      : "text-gray-700 hover:text-gray-900 hover:bg-gray-50"
                  }`
                }
              >
                Dashboard
              </NavLink>

              <div className="px-4 py-3 space-y-3">
                <div className="text-sm text-gray-600 break-words">{user.email}</div>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 active:bg-red-800 transition-colors"
                >
                  Logout
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <Link
                to="/login"
                onClick={() => setIsMenuOpen(false)}
                className="block px-4 py-3 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors font-medium"
              >
                Sign In
              </Link>

              <Link
                to="/signup"
                onClick={() => setIsMenuOpen(false)}
                className="block px-4 py-3 text-gray-700 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors font-medium"
              >
                Register
              </Link>

              <a
                href="#app"
                onClick={() => setIsMenuOpen(false)}
                className="block px-4 py-3 bg-blue-600 text-white text-center rounded-lg font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors mt-2"
              >
                Get the App
              </a>
            </div>
          )}
        </nav>
      </aside>

      {/* Overlay for mobile side panel */}
      {isMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/30 z-30 transition-opacity duration-300"
          onClick={() => setIsMenuOpen(false)}
          aria-hidden
        />
      )}
    </header>
  );
};

export default Navigation;