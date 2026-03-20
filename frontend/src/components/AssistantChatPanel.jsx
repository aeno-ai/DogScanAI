import React, { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, MessageCircle, Send } from "lucide-react";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { useToast } from "./Toast";

function normalizeMessages(payload) {
  if (!Array.isArray(payload)) return [];
  return payload
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      id: item.id,
      role: item.role === "assistant" ? "assistant" : "user",
      content: String(item.content ?? ""),
      created_at: item.created_at ?? null,
    }));
}

export default function AssistantChatPanel({
  mode = "general",
  scanContext = null,
  title = "Ask Casper",
  subtitle = "Ask dog questions and get practical guidance.",
}) {
  const { token } = useAuth();
  const toast = useToast();
  const listRef = useRef(null);

  const [threadId, setThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const contextKey = useMemo(
    () => (scanContext ? JSON.stringify(scanContext) : "general"),
    [scanContext],
  );

  const requestConfig = useMemo(() => {
    if (!token) return undefined;
    return { headers: { Authorization: `Bearer ${token}` } };
  }, [token]);

  useEffect(() => {
    let mounted = true;

    const initThread = async () => {
      setLoading(true);
      setMessages([]);
      setThreadId(null);

      try {
        let threadData;
        if (mode === "scan") {
          if (!scanContext || typeof scanContext !== "object") {
            if (mounted) setLoading(false);
            return;
          }
          const res = await api.post(
            "/api/assistant/threads/scan",
            { scan_context: scanContext },
            requestConfig,
          );
          threadData = res.data;
        } else {
          const res = await api.post(
            "/api/assistant/threads/general",
            scanContext ? { scan_context: scanContext } : {},
            requestConfig,
          );
          threadData = res.data;
        }

        if (!mounted) return;
        const nextThreadId = Number(threadData?.id);
        if (!Number.isInteger(nextThreadId)) {
          throw new Error("Invalid assistant thread.");
        }
        setThreadId(nextThreadId);

        const list = await api.get(
          `/api/assistant/threads/${nextThreadId}/messages`,
          requestConfig,
        );
        if (!mounted) return;
        setMessages(normalizeMessages(list.data?.messages));
      } catch (err) {
        if (!mounted) return;
        setMessages([]);
        toast.error(
          err?.response?.data?.error || "Failed to load assistant chat.",
        );
      } finally {
        if (mounted) setLoading(false);
      }
    };

    initThread();
    return () => {
      mounted = false;
    };
  }, [mode, contextKey, requestConfig, scanContext, toast]);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, loading, sending]);

  const handleSend = async (e) => {
    e.preventDefault();
    const content = input.trim();
    if (!content || !threadId || sending) return;

    const tempId = `temp-${Date.now()}`;
    setInput("");
    setSending(true);
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        role: "user",
        content,
        created_at: new Date().toISOString(),
      },
    ]);

    try {
      const res = await api.post(
        `/api/assistant/threads/${threadId}/messages`,
        { message: content },
        requestConfig,
      );
      const userMessage = res.data?.user_message;
      const assistantMessage = res.data?.assistant_message;

      setMessages((prev) => {
        const withoutTemp = prev.filter((msg) => msg.id !== tempId);
        const next = [...withoutTemp];
        if (userMessage) next.push(userMessage);
        if (assistantMessage) next.push(assistantMessage);
        return normalizeMessages(next);
      });
    } catch (err) {
      setMessages((prev) => prev.filter((msg) => msg.id !== tempId));
      toast.error(err?.response?.data?.error || "Assistant failed to respond.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="px-4 sm:px-5 py-4 border-b border-slate-200 bg-slate-50">
        <h3 className="text-base sm:text-lg font-semibold text-slate-900 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-blue-600" />
          {title}
        </h3>
        <p className="text-sm text-slate-600 mt-1">{subtitle}</p>
      </div>

      <div
        ref={listRef}
        className="h-72 overflow-y-auto px-4 sm:px-5 py-4 space-y-3 bg-white"
      >
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <p className="text-sm text-slate-600">
              Start a conversation about this scan or ask for dog care guidance.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === "assistant"
                  ? "bg-slate-100 text-slate-800 text-left mr-auto"
                  : "bg-blue-600 text-white text-right ml-auto"
              }`}
            >
              {msg.content}
            </div>
          ))
        )}
      </div>

      <form
        onSubmit={handleSend}
        className="border-t border-slate-200 p-3 sm:p-4 flex items-center gap-2 bg-white"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading || sending || !threadId}
          placeholder="Ask about your scan result..."
          className="flex-1 px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading || sending || !threadId}
          className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          Send
        </button>
      </form>
    </section>
  );
}
