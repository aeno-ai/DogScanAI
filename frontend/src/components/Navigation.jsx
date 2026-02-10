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
      <nav className="justify-start md:justify-between max-w-7xl mx-auto flex items-center gap-3 h-16 md:h-20 px-4 md:px-6 ">
        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMenuOpen((s) => !s)}
          className="md:hidden p-2 text-gray-600 hover:text-gray-900 transition-colors"
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
        {/* Logo */}
        <div className="flex items-center gap-2">
          <Link to="/" className="font-bold text-lg text-gray-900 flex items-center gap-2">
            <span>
              DogScan<span className="text-blue-600">AI</span>
            </span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-4 text-md lg:text-lg">
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

            <a
              href="#app"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              Get the App
            </a>
          </div>
        )}

        
      </nav>

      {/* Mobile Side Panel */}
      {/* Panel slides in from left; header retains z-50 so panel sits under the header like your Sidebar file */}
      <aside
        className={`h-screen md:hidden fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-40 transform transition-transform duration-300 ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!isMenuOpen}
      >
        <div className="p-4 border-b flex items-center justify-between">
          <h4 className="font-semibold">Menu</h4>

          <div className="flex items-center gap-2">
            {user && (
              <p
                className="text-sm text-gray-600 truncate max-w-[120px]"
                title={user?.email}
              >
                {truncateEmail(user?.email)}
              </p>
            )}
            <button
              onClick={() => setIsMenuOpen(false)}
              className="p-1 rounded hover:bg-gray-100 flex-shrink-0"
              aria-label="Close menu"
            >
              ✕
            </button>
          </div>
        </div>

        <nav className="p-4 space-y-2 bg-white h-full overflow-auto">
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
        </nav>
      </aside>

      {/* Overlay for mobile side panel */}
      {isMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/20 z-30"
          onClick={() => setIsMenuOpen(false)}
          aria-hidden
        />
      )}
    </header>
  );
};

export default Navigation;
