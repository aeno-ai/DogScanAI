import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Loader2, Search, XCircle } from "lucide-react";
import api from "../../services/api";
import { useToast } from "../../components/Toast";

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "all", label: "All" },
];

const AdminContributionsPage = () => {
  const toast = useToast();
  const [status, setStatus] = useState("pending");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);

  const [selectedId, setSelectedId] = useState(null);
  const [selected, setSelected] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const [breedOptions, setBreedOptions] = useState([]);
  const [finalBreedId, setFinalBreedId] = useState("");
  const [approveNote, setApproveNote] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [acting, setActing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total, pageSize]);

  useEffect(() => {
    let mounted = true;

    const fetchBreeds = async () => {
      try {
        const { data } = await api.get("/api/breeds");
        if (!mounted) return;
        setBreedOptions(Array.isArray(data) ? data : []);
      } catch {
        if (!mounted) return;
        setBreedOptions([]);
      }
    };

    fetchBreeds();
    return () => {
      mounted = false;
    };
  }, []);

  const fetchList = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/api/admin/contributions", {
        params: {
          status,
          search,
          page,
          page_size: pageSize,
        },
      });
      setItems(Array.isArray(data?.data) ? data.data : []);
      setTotal(Number(data?.pagination?.total || 0));
    } catch {
      setItems([]);
      setTotal(0);
      toast.error("Failed to load contributions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, search, page, pageSize]);

  useEffect(() => {
    if (!selectedId) {
      setSelected(null);
      return;
    }

    let mounted = true;
    const fetchDetail = async () => {
      setLoadingDetail(true);
      try {
        const { data } = await api.get(`/api/admin/contributions/${selectedId}`);
        if (!mounted) return;
        setSelected(data);
        setFinalBreedId(
          data?.final_breed_id ? String(data.final_breed_id) : data?.model_top1_breed_id ? String(data.model_top1_breed_id) : ""
        );
        setApproveNote(data?.review_reason || "");
        setRejectReason(data?.review_reason || "");
      } catch {
        if (!mounted) return;
        setSelected(null);
        toast.error("Failed to load contribution detail.");
      } finally {
        if (mounted) setLoadingDetail(false);
      }
    };

    fetchDetail();
    return () => {
      mounted = false;
    };
  }, [selectedId, toast]);

  const onApprove = async () => {
    if (!selected?.id || acting) return;
    if (!finalBreedId) {
      toast.warning("Pick a final breed before approving.");
      return;
    }

    setActing(true);
    try {
      await api.post(`/api/admin/contributions/${selected.id}/approve`, {
        final_breed_id: Number(finalBreedId),
        note: approveNote,
      });
      toast.success("Contribution approved.");
      await fetchList();
      setSelectedId(selected.id);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to approve contribution.");
    } finally {
      setActing(false);
    }
  };

  const onReject = async () => {
    if (!selected?.id || acting) return;
    if (!rejectReason.trim()) {
      toast.warning("Reject reason is required.");
      return;
    }

    setActing(true);
    try {
      await api.post(`/api/admin/contributions/${selected.id}/reject`, {
        reason: rejectReason.trim(),
      });
      toast.success("Contribution rejected.");
      await fetchList();
      setSelectedId(selected.id);
    } catch (err) {
      toast.error(err?.response?.data?.error || "Failed to reject contribution.");
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Contribution Review</h1>
        <p className="text-slate-600">Review user-consented breed scans and accept or reject them.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by user or predicted breed"
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
            {STATUS_OPTIONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-6">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-200">
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Prediction</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr>
                      <td className="py-8 px-4 text-slate-500" colSpan={4}>
                        No contributions found.
                      </td>
                    </tr>
                  )}
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedId(item.id)}
                      className={`border-b border-slate-100 cursor-pointer ${
                        selectedId === item.id ? "bg-blue-50" : "hover:bg-slate-50"
                      }`}
                    >
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-900">{item.username}</p>
                        <p className="text-slate-500">{item.email}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{item.model_top1_display_name}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            item.status === "approved"
                              ? "bg-emerald-100 text-emerald-700"
                              : item.status === "rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500">
                        {item.submitted_at ? new Date(item.submitted_at).toLocaleString() : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
            <p className="text-sm text-slate-500">
              Page {page} of {totalPages} ({total} total)
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
        </div>

        <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-6">
          {!selectedId ? (
            <p className="text-sm text-slate-500">Select a contribution to inspect and review.</p>
          ) : loadingDetail ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-7 h-7 text-blue-600 animate-spin" />
            </div>
          ) : !selected ? (
            <p className="text-sm text-slate-500">Failed to load selected contribution.</p>
          ) : (
            <div className="space-y-4">
              <div className="aspect-[4/3] rounded-xl bg-slate-100 overflow-hidden">
                <img src={selected.source_image_url} alt="Contribution" className="w-full h-full object-cover" />
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Model top prediction</p>
                <p className="font-semibold text-slate-900">
                  {selected.model_top1_display_name} ({Number(selected.model_top1_confidence || 0).toFixed(1)}%)
                </p>
              </div>

              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500 mb-2">Original predictions</p>
                <div className="space-y-2 max-h-40 overflow-auto pr-1">
                  {(Array.isArray(selected.original_predictions) ? selected.original_predictions : []).map((pred) => (
                    <div key={`${pred.rank}-${pred.class_name}`} className="bg-slate-50 rounded-lg p-2 text-sm">
                      <p className="font-medium text-slate-900">
                        #{pred.rank} {pred.display_name || pred.class_name}
                      </p>
                      <p className="text-slate-500">{Number(pred.confidence || 0).toFixed(1)}%</p>
                    </div>
                  ))}
                </div>
              </div>

              {selected.status === "pending" ? (
                <div className="space-y-3 pt-2 border-t border-slate-200">
                  <label className="block text-sm text-slate-700">
                    Final breed
                    <select
                      value={finalBreedId}
                      onChange={(e) => setFinalBreedId(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                    >
                      <option value="">Select breed</option>
                      {breedOptions.map((breed) => (
                        <option key={breed.breed_id} value={breed.breed_id}>
                          {breed.display_name}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block text-sm text-slate-700">
                    Approve note (optional)
                    <textarea
                      value={approveNote}
                      onChange={(e) => setApproveNote(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg"
                      rows={2}
                    />
                  </label>

                  <label className="block text-sm text-slate-700">
                    Reject reason
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-lg"
                      rows={2}
                    />
                  </label>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={onApprove}
                      disabled={acting}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium disabled:opacity-40"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={onReject}
                      disabled={acting}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium disabled:opacity-40"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              ) : (
                <div className="pt-2 border-t border-slate-200 text-sm text-slate-700 space-y-1">
                  <p>Status: <span className="font-semibold capitalize">{selected.status}</span></p>
                  {selected.review_reason && <p>Review note: {selected.review_reason}</p>}
                  {selected.reviewed_at && <p>Reviewed at: {new Date(selected.reviewed_at).toLocaleString()}</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminContributionsPage;
