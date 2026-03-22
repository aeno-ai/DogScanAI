import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useUI } from "../../context/UIContext";

const GOOGLE_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

let googleScriptPromise = null;

function loadGoogleScript() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google sign-in is only available in the browser."));
  }

  if (window.google?.accounts?.id) {
    return Promise.resolve(window.google);
  }

  if (!googleScriptPromise) {
    googleScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`);
      if (existing) {
        existing.addEventListener("load", () => resolve(window.google), { once: true });
        existing.addEventListener(
          "error",
          () => reject(new Error("Failed to load Google sign-in.")),
          { once: true }
        );
        return;
      }

      const script = document.createElement("script");
      script.src = GOOGLE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve(window.google);
      script.onerror = () => reject(new Error("Failed to load Google sign-in."));
      document.head.appendChild(script);
    });
  }

  return googleScriptPromise;
}

const GoogleAuthButton = ({ onCredential, disabled = false }) => {
  const { resolvedTheme } = useUI();
  const buttonRef = useRef(null);
  const callbackRef = useRef(onCredential);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const clientId = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();

  useEffect(() => {
    callbackRef.current = onCredential;
  }, [onCredential]);

  useEffect(() => {
    let cancelled = false;

    if (!clientId) {
      setLoading(false);
      setError("Google sign-in is not configured yet.");
      return () => {
        cancelled = true;
      };
    }

    const renderButton = async () => {
      setLoading(true);
      setError("");

      try {
        await loadGoogleScript();
        if (cancelled) return;
        if (!window.google?.accounts?.id || !buttonRef.current) {
          throw new Error("Google sign-in is unavailable right now.");
        }

        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: (response) => callbackRef.current?.(response),
        });

        buttonRef.current.innerHTML = "";
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: "standard",
          shape: "pill",
          text: "continue_with",
          theme: resolvedTheme === "dark" ? "filled_black" : "outline",
          size: "large",
          width: Math.min(buttonRef.current.offsetWidth || 360, 360),
        });
      } catch (nextError) {
        if (!cancelled) {
          setError(nextError.message || "Google sign-in is unavailable right now.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    renderButton();

    return () => {
      cancelled = true;
    };
  }, [clientId, resolvedTheme]);

  return (
    <div className="space-y-2">
      <div className="relative flex items-center gap-3 py-1">
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
          Or continue with
        </span>
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
      </div>

      <div
        className={`rounded-xl border border-slate-200 bg-white/90 p-2 shadow-sm dark:border-slate-700 dark:bg-slate-950/70 ${
          disabled ? "opacity-60 pointer-events-none" : ""
        }`}
      >
        {loading && (
          <div className="flex min-h-[44px] items-center justify-center text-slate-500 dark:text-slate-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}
        <div
          ref={buttonRef}
          className={`${loading ? "hidden" : "flex"} min-h-[44px] items-center justify-center`}
        />
      </div>

      {error && (
        <p className="text-sm text-slate-500 dark:text-slate-400">{error}</p>
      )}
    </div>
  );
};

export default GoogleAuthButton;
