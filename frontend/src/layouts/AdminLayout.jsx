import React, { useState } from "react";
import { NavLink, Outlet, useNavigate, Link } from "react-router-dom";
import {
  Menu,
  X,
  LayoutDashboard,
  Users,
  Database,
  Trophy,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import ThemeToggle from "../components/ui/ThemeToggle";

const navItems = [
  { to: "/admin/overview", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/contributions", label: "Contributions", icon: Database },
  { to: "/admin/contributors", label: "Contributors", icon: Trophy },
];

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const isDesktop = () => window.matchMedia("(min-width: 768px)").matches;

  const handleLogout = async () => {
    await logout();
    setSidebarOpen(false);
    navigate("/");
  };

  return (
      <div className="page-bg">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 overflow-hidden shadow-xl transition-all duration-300 dark:bg-slate-950 dark:border-slate-800 ${
          sidebarOpen ? "w-64" : "w-0 md:w-20"
        }`}
      >
        <div
          className={`border-b border-slate-200 h-16 flex items-center dark:border-slate-800 ${
            sidebarOpen ? "px-4 justify-between" : "justify-center"
          }`}
        >
          {sidebarOpen ? (
            <>
              <Link to="/admin/overview" className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600" />
                <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">Admin Panel</h1>
              </Link>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close sidebar"
              >
                <X className="w-4 h-4 text-slate-700 dark:text-slate-200" />
              </button>
            </>
          ) : (
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Expand sidebar"
            >
              <Menu className="w-5 h-5 text-slate-700 dark:text-slate-200" />
            </button>
          )}
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={(e) => {
                  if (!sidebarOpen && isDesktop()) {
                    e.preventDefault();
                    setSidebarOpen(true);
                    return;
                  }
                  if (!isDesktop()) setSidebarOpen(false);
                }}
                className={({ isActive }) =>
                  `w-full flex items-center py-3 rounded-lg transition-all ${
                    sidebarOpen ? "gap-3 px-4" : "justify-center"
                  } ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                {sidebarOpen && <span className="font-medium">{item.label}</span>}
              </NavLink>
            );
          })}

          <button
            onClick={handleLogout}
            className={`w-full flex items-center py-3 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 ${
              sidebarOpen ? "gap-3 px-4" : "justify-center"
            }`}
            aria-label="Logout"
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </nav>
      </aside>

      <header className="bg-white border-b border-slate-200 px-6 py-4 shrink-0 dark:bg-slate-950 dark:border-slate-800">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => setSidebarOpen((prev) => !prev)}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0 dark:hover:bg-slate-800"
            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {sidebarOpen ? (
              <X className="w-5 h-5 text-slate-700 dark:text-slate-200" />
            ) : (
              <Menu className="w-5 h-5 text-slate-700 dark:text-slate-200" />
            )}
          </button>

          <div className="ml-auto flex items-center gap-4 flex-shrink-0">
            <ThemeToggle compact />
            <div className="hidden sm:block text-right min-w-0">
              <p className="text-sm text-slate-600 truncate dark:text-slate-300">{user?.email}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                {user?.is_superadmin ? "Superadmin" : "Admin"}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="page-container py-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
