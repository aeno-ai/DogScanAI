import { NavLink } from "react-router-dom";

const Sidebar = ({ open, onClose, onLogout }) => {
  const navBase =
    "block px-3 py-2 rounded transition-colors text-sm";
  const navActive = "bg-blue-100 text-blue-700 font-semibold";
  const navInactive = "hover:bg-gray-100 text-gray-700";

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-30"
          onClick={onClose}
        >
          <div className="absolute inset-0 bg-black opacity-40" />
        </div>
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-white shadow-lg z-40 transform transition-transform duration-300 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4 border-b flex justify-between items-center">
          <h4 className="font-semibold">Menu</h4>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100"
          >
            ✕
          </button>
        </div>

        <nav className="p-4 space-y-2">
          <NavLink
            to="/dashboard"
            end
            onClick={onClose}
            className={({ isActive }) =>
              `${navBase} ${isActive ? navActive : navInactive}`
            }
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/profile"
            onClick={onClose}
            className={({ isActive }) =>
              `${navBase} ${isActive ? navActive : navInactive}`
            }
          >
            Profile
          </NavLink>

          <NavLink
            to="/scans"
            onClick={onClose}
            className={({ isActive }) =>
              `${navBase} ${isActive ? navActive : navInactive}`
            }
          >
            Scans
          </NavLink>

          <NavLink
            to="/settings"
            onClick={onClose}
            className={({ isActive }) =>
              `${navBase} ${isActive ? navActive : navInactive}`
            }
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
