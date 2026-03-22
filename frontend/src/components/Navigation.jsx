import React, { useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, X, Zap } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useUI } from "../context/UIContext";
import ThemeToggle from "./ui/ThemeToggle";

const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { user, logout } = useAuth();
  const { isDarkModeAvailable } = useUI();
  const navigate = useNavigate();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  const truncateEmail = (email) => {
    if (!email) return "";
    return email.length > 18 ? email.substring(0, 18) + "..." : email;
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-slate-950/85 backdrop-blur-xl border-b border-blue-500/10 shadow-lg shadow-blue-900/10"
          : "bg-transparent"
      }`}
    >
      <nav className="max-w-7xl mx-auto flex items-center justify-between h-16 md:h-20 px-4 md:px-6">

        {/* Left: Mobile toggle + Logo */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMenuOpen((s) => !s)}
            className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <Link to="/" className="flex items-center gap-2 group">
            
            <span className="font-bold text-lg text-white tracking-tight">
              DogScan<span className="text-blue-400">AI</span>
            </span>
          </Link>
        </div>

        {/* Center: Desktop nav links */}
        <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="relative text-sm text-slate-400 hover:text-white transition-colors font-medium group py-1"
            >
              {link.label}
              <span className="absolute bottom-0 left-0 w-0 h-px bg-blue-400 group-hover:w-full transition-all duration-300" />
            </a>
          ))}
        </div>

        {/* Right: Auth / CTA */}
        <div className="flex items-center">
          {isDarkModeAvailable && (
            <ThemeToggle
              compact
              className="mr-3 border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
            />
          )}
          {user ? (
            <div className="hidden md:flex items-center gap-3">
              <NavLink
                to="/dashboard"
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? "text-blue-400 bg-blue-500/10 border border-blue-500/20"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  }`
                }
              >
                Dashboard
              </NavLink>
              <span className="text-xs text-slate-500 max-w-[120px] truncate border border-slate-700 px-2 py-1 rounded-md" title={user.email}>
                {user.email}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-1.5 text-sm font-medium text-red-400 border border-red-500/30 hover:bg-red-500/10 rounded-lg transition-all"
              >
                Logout
              </button>
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2">
              <Link
                to="/login"
                className="text-slate-400 hover:text-white px-3 py-2 text-sm font-medium transition-colors"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="text-slate-400 hover:text-white px-3 py-2 text-sm font-medium transition-colors"
              >
                Register
              </Link>
              <a
                href="#app"
                className="relative inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white rounded-lg overflow-hidden group"
              >
                {/* Animated glowing border */}
                <span className="absolute inset-0 rounded-lg border border-blue-500/60 group-hover:border-blue-400 transition-colors" />
                <span className="absolute inset-0 rounded-lg bg-blue-600/20 group-hover:bg-blue-600/30 transition-colors" />
                <span className="absolute -inset-1 rounded-xl bg-blue-500/10 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative">Get the App</span>
              </a>
            </div>
          )}
        </div>
      </nav>

      {/* Mobile Side Panel */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 w-64 bg-slate-950/95 backdrop-blur-xl border-r border-white/5 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-hidden={!isMenuOpen}
      >
        {/* Panel Header */}
        <div className="h-16 px-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
              <Zap className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-bold text-white">DogScan<span className="text-blue-400">AI</span></span>
          </div>
          <div className="flex items-center gap-2">
            {user && (
              <p className="text-xs text-slate-500 truncate max-w-[100px]" title={user?.email}>
                {truncateEmail(user?.email)}
              </p>
            )}
            <button
              onClick={() => setIsMenuOpen(false)}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Panel Content */}
        <nav className="p-4 space-y-1 h-[calc(100vh-4rem)] overflow-y-auto">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setIsMenuOpen(false)}
              className="flex items-center px-3 py-2.5 text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-all font-medium text-sm group"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500/50 mr-3 group-hover:bg-blue-400 transition-colors" />
              {link.label}
            </a>
          ))}

          {isDarkModeAvailable && (
            <>
              <hr className="my-3 border-white/5" />

              <div className="px-3 py-2">
                <ThemeToggle
                  className="w-full justify-center border-white/10 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10"
                />
              </div>

              <hr className="my-3 border-white/5" />
            </>
          )}

          {user ? (
            <div className="space-y-1">
              <NavLink
                to="/dashboard"
                onClick={() => setIsMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center px-3 py-2.5 rounded-lg transition-all font-medium text-sm ${
                    isActive
                      ? "text-blue-400 bg-blue-500/10"
                      : "text-slate-300 hover:text-white hover:bg-white/5"
                  }`
                }
              >
                Dashboard
              </NavLink>
              <div className="px-3 py-2 space-y-3">
                <div className="text-xs text-slate-500 break-words">{user.email}</div>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-2 text-sm text-red-400 border border-red-500/20 hover:bg-red-500/10 rounded-lg font-medium transition-all"
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
                className="flex items-center px-3 py-2.5 text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-all font-medium text-sm"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center px-3 py-2.5 text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-all font-medium text-sm"
              >
                Register
              </Link>
              <a
                href="#app"
                onClick={() => setIsMenuOpen(false)}
                className="block px-3 py-2.5 mt-2 bg-blue-600/20 border border-blue-500/30 text-blue-300 text-center rounded-lg font-medium text-sm hover:bg-blue-600/30 transition-all"
              >
                Get the App
              </a>
            </div>
          )}
        </nav>
      </aside>

      {/* Overlay */}
      {isMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-30 transition-opacity duration-300"
          onClick={() => setIsMenuOpen(false)}
          aria-hidden
        />
      )}
    </header>
  );
};

export default Navigation;
