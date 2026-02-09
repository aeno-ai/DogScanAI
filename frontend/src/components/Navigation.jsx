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

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
      <nav className="max-w-7xl mx-auto flex items-center justify-between h-16 md:h-20 px-4 md:px-6">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Link to="/" className="font-bold text-xl text-gray-900 flex items-center gap-2">
            {/* optional icon */}
            <span>DogScan<span className="text-blue-600">AI</span></span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-gray-500 hover:text-gray-900 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop Auth / CTA */}
        {user ? (
          <div className="hidden md:flex items-center space-x-4">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `px-3 py-2 rounded ${isActive ? "text-blue-600 font-semibold" : "text-gray-700 hover:text-gray-900"}`
              }
            >
              Dashboard
            </NavLink>

            <span className="text-sm text-gray-700">{user.email}</span>

            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-4">
            <Link to="/login" className="text-gray-500 hover:text-gray-900 px-4 py-2">
              Login
            </Link>

            <Link to="/signup" className="text-gray-500 hover:text-gray-900 px-4 py-2">
              Register
            </Link>

            <a href="#app" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
              Get the App
            </a>
          </div>
        )}

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMenuOpen((s) => !s)}
          className="md:hidden p-2 text-gray-600 hover:text-gray-900 transition-colors"
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile Menu Dropdown */}
      <div
        className={`md:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg transition-all duration-200 ease-in-out ${
          isMenuOpen ? "opacity-100 translate-y-0 visible" : "opacity-0 -translate-y-2 invisible"
        }`}
      >
        <div className="px-4 py-4 space-y-1">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setIsMenuOpen(false)}
              className="block px-4 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            >
              {link.label}
            </a>
          ))}

          <hr className="my-3 border-gray-200" />

          {user ? (
            <>
              <NavLink
                to="/dashboard"
                onClick={() => setIsMenuOpen(false)}
                className="block px-4 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Dashboard
              </NavLink>

              <div className="px-4 py-3">
                <div className="text-sm text-gray-700 mb-2">{user.email}</div>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-3 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
                >
                  Logout
                </button>
              </div>
            </>
          ) : (
            <>
              <Link
                to="/login"
                onClick={() => setIsMenuOpen(false)}
                className="block px-4 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Sign In
              </Link>

              <Link
                to="/signup"
                onClick={() => setIsMenuOpen(false)}
                className="block px-4 py-3 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
              >
                Register
              </Link>

              <a
                href="#app"
                onClick={() => setIsMenuOpen(false)}
                className="block px-4 py-3 bg-blue-600 text-white text-center rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Get the App
              </a>
            </>
          )}
        </div>
      </div>

      {/* Overlay for mobile menu */}
      {isMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/20"
          onClick={() => setIsMenuOpen(false)}
          aria-hidden
        />
      )}
    </header>
  );
};

export default Navigation;
