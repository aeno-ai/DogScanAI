import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, FileCheck, Loader2, ShieldCheck } from "lucide-react";

export default function AuthPolicyModal({
  isOpen,
  policy,
  loading = false,
  submitting = false,
  confirmLabel = "Agree and Continue",
  onClose,
  onAccept,
}) {
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setAccepted(false);
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setAccepted(false);
    }
  }, [isOpen, policy?.policy_version]);

  const ruleList = useMemo(
    () => (Array.isArray(policy?.rules) ? policy.rules : []),
    [policy?.rules]
  );

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-policy-title"
      onClick={submitting ? undefined : onClose}
    >
      <div
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-200 bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-5 text-white dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <h2 id="auth-policy-title" className="text-xl font-bold">
                {policy?.title || "Account Agreement"}
              </h2>
              <p className="mt-1 text-sm text-blue-100">
                {policy?.summary || "Review the scanning rules before creating your account."}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5 px-6 py-6">
          {loading && !policy ? (
            <div className="flex min-h-[220px] items-center justify-center text-slate-500 dark:text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 dark:border-blue-900/60 dark:bg-blue-950/40">
                <div className="flex items-start gap-3">
                  <FileCheck className="mt-0.5 h-5 w-5 text-blue-600 dark:text-blue-300" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Before creating your account
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      Please confirm that your scanning and contribution activity will follow these platform rules.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                {ruleList.map((rule, index) => (
                  <div
                    key={`${policy?.policy_version || "policy"}-${index}`}
                    className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                      {index + 1}
                    </span>
                    <p className="text-sm text-slate-700 dark:text-slate-200">{rule}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-900/60 dark:bg-amber-950/30">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600 dark:text-amber-300" />
                  <p className="text-sm text-amber-900 dark:text-amber-100">
                    {policy?.consequence_text ||
                      "Violations may lead to rejected submissions, restrictions, or bans."}
                  </p>
                </div>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
                <input
                  type="checkbox"
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900"
                  checked={accepted}
                  onChange={(event) => setAccepted(event.target.checked)}
                  disabled={submitting}
                />
                <span className="text-sm text-slate-700 dark:text-slate-200">
                  {policy?.checkbox_label ||
                    "I understand these scanning rules and agree that violations may result in account restrictions or bans."}
                </span>
              </label>
            </>
          )}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end dark:border-slate-800 dark:bg-slate-950/60">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onAccept}
            disabled={!accepted || loading || submitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
