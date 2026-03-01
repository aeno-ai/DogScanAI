import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Search, ShieldBan, ShieldCheck } from "lucide-react";
import api from "../../services/api";
import { useToast } from "../../components/Toast";
import { useAuth } from "../../context/AuthContext";

const STATUS_FILTERS = [
  { value: "all", label: "All users" },
  { value: "active", label: "Active" },
  { value: "banned", label: "Banned" },
];

function toLocalDatetimeValue(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

function buildDefaultBanUntil() {
  const oneHour = 1000 * 60 * 60;
  return toLocalDatetimeValue(new Date(Date.now() + oneHour));
}

const AdminUsersPage = () => {
  const toast = useToast();
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const [banTarget, setBanTarget] = useState(null);
  const [banReason, setBanReason] = useState("");
  const [banUntil, setBanUntil] = useState(buildDefaultBanUntil());
  const [unbanTarget, setUnbanTarget] = useState(null);
  const [unbanReason, setUnbanReason] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  const fetchUsers = useCallback(
    async (withLoader = true) => {
      if (withLoader) setLoading(true);
      try {
        const { data } = await api.get("/api/admin/users", {
          params: {
            search,
            status,
            page,
            page_size: pageSize,
          },
        });
        setUsers(Array.isArray(data?.data) ? data.data : []);
        setTotal(Number(data?.pagination?.total || 0));
      } catch {
        setUsers([]);
        setTotal(0);
        toast.error("Failed to load users.");
      } finally {
        if (withLoader) setLoading(false);
      }
    },
    [search, status, page, pageSize, toast]
  );

  useEffect(() => {
    fetchUsers(true);
  }, [fetchUsers]);

  const canManage = (target) => {
    if (!target) return false;
    if (currentUser?.id === target.id) return false;
    if (target.is_superadmin) return false;
    if (target.is_admin && !currentUser?.is_superadmin) return false;
    return true;
  };

  const runAction = async (targetId, action, payload, successMessage) => {
    setActingId(targetId);
    try {
      await api.post(`/api/admin/users/${targetId}/${action}`, payload);
      toast.success(successMessage);
      await fetchUsers(false);
    } catch (err) {
      const message = err?.response?.data?.error || `Failed to ${action} user.`;
      toast.error(message);
    } finally {
      setActingId(null);
    }
  };

  const handleBanSubmit = async () => {
    if (!banTarget || actingId) return;
    const trimmedReason = banReason.trim();
    if (!trimmedReason) {
      toast.warning("Ban reason is required.");
      return;
    }
    if (!banUntil) {
      toast.warning("Ban until date/time is required.");
      return;
    }

    const untilDate = new Date(banUntil);
    if (Number.isNaN(untilDate.getTime())) {
      toast.warning("Please provide a valid ban end date/time.");
      return;
    }
    if (untilDate.getTime() <= Date.now()) {
      toast.warning("Ban end date/time must be in the future.");
      return;
    }

    await runAction(
      banTarget.id,
      "ban",
      { reason: trimmedReason, until: untilDate.toISOString() },
      "User banned successfully."
    );
    setBanTarget(null);
    setBanReason("");
    setBanUntil(buildDefaultBanUntil());
  };

  const handleUnbanConfirm = async () => {
    if (!unbanTarget || actingId) return;

    await runAction(
      unbanTarget.id,
      "unban",
      { reason: unbanReason.trim() || null },
      "User unbanned successfully."
    );
    setUnbanTarget(null);
    setUnbanReason("");
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">User Management</h1>
        <p className="text-slate-600">Search users, then ban or unban accounts.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by email or username"
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 border border-slate-300 rounded-lg bg-white"
          >
            {STATUS_FILTERS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[880px] w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Scans</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 && (
                  <tr>
                    <td className="py-8 px-4 text-slate-500" colSpan={6}>
                      No users found.
                    </td>
                  </tr>
                )}

                {users.map((item) => {
                  const effectiveBanned = Boolean(item.is_banned_effective);
                  const disabled = actingId === item.id || !canManage(item);
                  return (
                    <tr key={item.id} className="border-b border-slate-100 align-top">
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-900">{item.username}</p>
                        <p className="text-slate-500">{item.email}</p>
                      </td>
                      <td className="py-3 px-4">
                        {item.is_superadmin ? (
                          <span className="px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-700">
                            Superadmin
                          </span>
                        ) : item.is_admin ? (
                          <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                            Admin
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-700">
                            User
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {effectiveBanned ? (
                          <span className="px-2 py-1 rounded-full text-xs bg-red-100 text-red-700">
                            Banned
                          </span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs bg-emerald-100 text-emerald-700">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700">{item.scan_count ?? 0}</td>
                      <td className="py-3 px-4 text-slate-500">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : "-"}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-end gap-2">
                          {effectiveBanned ? (
                            <button
                              onClick={() => {
                                setUnbanTarget(item);
                                setUnbanReason("");
                              }}
                              disabled={disabled}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-100 text-emerald-700 disabled:opacity-40"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              Unban
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setBanTarget(item);
                                setBanReason("");
                                setBanUntil(buildDefaultBanUntil());
                              }}
                              disabled={disabled}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-red-100 text-red-700 disabled:opacity-40"
                            >
                              <ShieldBan className="w-3.5 h-3.5" />
                              Ban
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Page {page} of {totalPages} ({total} users)
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm disabled:opacity-40"
          >
            Prev
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>

      {banTarget && (
        <div className="fixed inset-0 z-[120] bg-black/40 p-4 flex items-center justify-center">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-5">
            <h2 className="text-lg font-semibold text-slate-900">Ban User</h2>
            <p className="text-sm text-slate-600 mt-2">
              Set a reason and end time for <span className="font-medium">{banTarget.username}</span>.
            </p>
            <label className="block text-sm text-slate-700 mt-4">
              Reason
              <textarea
                value={banReason}
                onChange={(e) => setBanReason(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg"
                rows={2}
              />
            </label>
            <label className="block text-sm text-slate-700 mt-3">
              Ban until
              <input
                type="datetime-local"
                value={banUntil}
                onChange={(e) => setBanUntil(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setBanTarget(null);
                  setBanReason("");
                  setBanUntil(buildDefaultBanUntil());
                }}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleBanSubmit}
                disabled={actingId === banTarget.id}
                className="px-3 py-2 bg-red-600 text-white rounded-lg text-sm disabled:opacity-40"
              >
                Confirm Ban
              </button>
            </div>
          </div>
        </div>
      )}

      {unbanTarget && (
        <div className="fixed inset-0 z-[120] bg-black/40 p-4 flex items-center justify-center">
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-5">
            <h2 className="text-lg font-semibold text-slate-900">Confirm Unban</h2>
            <p className="text-sm text-slate-600 mt-2">
              Unban <span className="font-medium">{unbanTarget.username}</span> and restore account access?
            </p>
            <label className="block text-sm text-slate-700 mt-4">
              Reason (optional)
              <textarea
                value={unbanReason}
                onChange={(e) => setUnbanReason(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg"
                rows={2}
              />
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setUnbanTarget(null);
                  setUnbanReason("");
                }}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleUnbanConfirm}
                disabled={actingId === unbanTarget.id}
                className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm disabled:opacity-40"
              >
                Confirm Unban
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
