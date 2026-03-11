import { NavLink, Link } from "react-router-dom";
import { Home, BookOpen, Clock, User, X, LogOut, Menu, ShieldCheck, MessageCircle, Trophy } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const Sidebar = ({ open, onOpen, onClose, onLogout }) => {
  const { user } = useAuth();
  const isDesktop = () => window.matchMedia("(min-width: 768px)").matches;
  const navItems = [
    { path: "/dashboard", label: "Home", icon: Home },
    { path: "/assistant", label: "Assistant", icon: MessageCircle },
    { path: "/doglibrary", label: "Library", icon: BookOpen },
    { path: "/contributors", label: "Contributors", icon: Trophy },
    { path: "/history", label: "History", icon: Clock },
    { path: "/profile", label: "Profile", icon: User },
    ...(user?.is_admin
      ? [{ path: "/admin/overview", label: "Admin", icon: ShieldCheck }]
      : []),
  ];

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200 overflow-hidden shadow-xl transition-all duration-300 ${
          open ? "w-64" : "w-0 md:w-20"
        }`}
      >
        <div className={`border-b border-slate-200 h-16 flex items-center ${open ? "px-4 justify-between" : "justify-center"}`}>
          {open ? (
            <>
              <Link to={'/'}>
              <h1 className="text-lg font-bold text-slate-800">
                DogScan<span className="text-blue-600">AI</span>
              </h1></Link>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-100"
                aria-label="Close sidebar"
              >
                <X className="w-4 h-4 text-slate-700" />
              </button>
            </>
          ) : (
            <button
              onClick={onOpen}
              className="p-2 rounded-lg hover:bg-slate-100"
              aria-label="Expand sidebar"
            >
              <Menu className="w-5 h-5 text-slate-700" />
            </button>
          )}
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={(e) => {
                  if (!open && isDesktop()) {
                    e.preventDefault();
                    onOpen();
                    return;
                  }
                  if (!isDesktop()) onClose();
                }}
                className={({ isActive }) =>
                  `w-full flex items-center py-3 rounded-lg transition-all ${
                    open ? "gap-3 px-4" : "justify-center"
                  } ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-slate-600 hover:bg-slate-100"
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                {open && <span className="font-medium">{item.label}</span>}
              </NavLink>
            );
          })}

          <button
            onClick={onLogout}
            className={`w-full flex items-center py-3 rounded-lg text-slate-600 hover:bg-slate-100 ${
              open ? "gap-3 px-4" : "justify-center"
            }`}
            aria-label="Logout"
          >
            <LogOut className="w-5 h-5" />
            {open && <span>Logout</span>}
          </button>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
