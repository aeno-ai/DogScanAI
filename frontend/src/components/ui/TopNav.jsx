import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, BookOpen, Clock, Users, User } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import Sidebar from "./Sidebar";

const navItems = [
  { path: "/dashboard", label: "Home", icon: Home },
  { path: "/doglibrary", label: "Library", icon: BookOpen },
  { path: "/history", label: "History", icon: Clock },
  { path: "/community", label: "Community", icon: Users },
  { path: "/profile", label: "Profile", icon: User },
];

const TopNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4">
        {/* nav */}
        <nav className="flex items-center h-16 md:h-20"> 
          <div className="flex items-center gap-3 shrink-0">
            <Sidebar onLogout={handleLogout} user={user} />
            <Link to="/" className="flex items-baseline gap-1">
              <span className="font-bold text-lg leading-none">
                DogScan<span className="text-blue-600">AI</span>
              </span>
            </Link>
          </div>

          {/* CENTER: nav items - centered and hidden on small screens */}
          <div className="flex-1 hidden md:flex justify-center">
            <div className="flex items-center gap-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                      isActive
                        ? "text-primary bg-primary-100 font-semibold"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-md font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* RIGHT: user / logout - hidden on small screens */}
          <div className="ml-auto hidden md:flex items-center gap-4">
            <span className="hidden lg:block text-sm text-gray-700">
              {user?.email}
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </nav>
      </div>
    </header>
  );
};

export default TopNav;
