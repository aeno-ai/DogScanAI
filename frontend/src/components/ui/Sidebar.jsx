import { useState } from "react";
import { NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";

const Sidebar = ({ onLogout, user }) => {
  const [open, setOpen] = useState(false);

  const navBase = "block px-3 py-2 rounded transition-colors text-sm";
  const navActive = "bg-blue-100 text-blue-700 font-semibold";
  const navInactive = "hover:bg-gray-100 text-gray-700";

  const truncateEmail = (email) => {
    if (!email) return "";
    return email.length > 14 ? `${email.substring(0, 14)}...` : email;
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-2 rounded-md hover:bg-gray-100 text-gray-600 md:hidden"
        aria-label="Open menu"
      >
        <Menu />
      </button>

      {open && (
        <div className="fixed inset-0 z-30" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black opacity-40" />
        </div>
      )}

      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-40 transform transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b flex justify-between items-center">
          <h4 className="font-semibold">Menu</h4>
          <p className="text-sm text-gray-600 truncate max-w-[120px]" title={user?.email}>
            {truncateEmail(user?.email)}
          </p>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded hover:bg-gray-100 flex-shrink-0"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="p-4 space-y-2 bg-white h-screen">
          <NavLink
            to="/dashboard"
            end
            onClick={() => setOpen(false)}
            className={({ isActive }) => `${navBase} ${isActive ? navActive : navInactive}`}
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/profile"
            onClick={() => setOpen(false)}
            className={({ isActive }) => `${navBase} ${isActive ? navActive : navInactive}`}
          >
            Profile
          </NavLink>

          <NavLink
            to="/dashboard?scan=1"
            onClick={() => setOpen(false)}
            className={({ isActive }) => `${navBase} ${isActive ? navActive : navInactive}`}
          >
            Scans
          </NavLink>

          <NavLink
            to="/settings"
            onClick={() => setOpen(false)}
            className={({ isActive }) => `${navBase} ${isActive ? navActive : navInactive}`}
          >
            Settings
          </NavLink>

          <button
            onClick={onLogout}
            className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-gray-700 text-sm"
          >
            Logout
          </button>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;
