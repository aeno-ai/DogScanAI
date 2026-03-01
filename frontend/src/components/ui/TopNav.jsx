import { useNavigate } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIContext";
import Sidebar from "./Sidebar";

const TopNav = ({ centerContent }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const {
    isUserSidebarOpen,
    openUserSidebar,
    closeUserSidebar,
    toggleUserSidebar,
  } = useUI();

  const handleLogout = async () => {
    await logout();
    closeUserSidebar();
    navigate("/");
  };

  return (
    <>
      <Sidebar
        open={isUserSidebarOpen}
        onOpen={openUserSidebar}
        onClose={closeUserSidebar}
        onLogout={handleLogout}
      />
      <header className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
        <div className="flex items-center justify-between gap-4">
          {/* Left: hamburger */}
          <button
            onClick={toggleUserSidebar}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors flex-shrink-0"
            aria-label={isUserSidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {isUserSidebarOpen
              ? <X className="w-5 h-5 text-slate-700" />
              : <Menu className="w-5 h-5 text-slate-700" />}
          </button>

          {/* Center: optional injected content */}
          {centerContent && (
            <div className="flex-1 min-w-0 justify-center">
              {centerContent}
            </div>
          )}

          {/* Right: user info + logout */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <span className="hidden sm:inline text-sm text-slate-600">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>
    </>
  );
};

export default TopNav;
