"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { useUserData } from "@/lib/context/user-data";
import { useChat, ChatMsg } from "@/lib/context/chat";
import FallbackImage from "@/components/ui/FallbackImage";

type Msg = ChatMsg;

export default function AssistantChatModal({ onClose }: { onClose: () => void }) {
  const { messages, addMessage, setMessages, sessionId, saveToCache } = useChat();
  // local input/loading/error/ui refs
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const userData = useUserData();
  function makeGreeting(fullName?: string | null): Msg {
    const greeting: Msg = {
      role: "assistant",
      content: `Hello ${fullName ?? "there"}! I'm your Noura personal assistant! I can help with recipe ideas, ingredient swaps, meal planning tips, tracking against your goals, and any general questions you may have. Ask me anything!`,
      created_at: new Date().toISOString(),
    };
    return greeting;
  }

  function handleClear() {
    try {
      const greeting = makeGreeting(userData.full_name);
      setMessages([greeting]);
      saveToCache([greeting], sessionId);
      // also remove raw cache key for compatibility
      try { localStorage.removeItem("chat_cache"); } catch (e) {}
    } catch (e) {
      // ignore
    }
  }

  // Ensure a single greeting message exists (deterministic initializer)
  useEffect(() => {
    if (!messages || messages.length === 0) {
      const greeting = makeGreeting(userData.full_name);
      setMessages([greeting]);
      try { saveToCache([greeting], sessionId); } catch (e) {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData.full_name]);

  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);

  async function handleSend() {
    if (!input.trim()) return;
    setError(null);

    const userMsg: Msg = { role: "user", content: input.trim(), created_at: new Date().toISOString() };
    // use functional updates via context
    addMessage(userMsg);
    setInput("");
    setLoading(true);

    try {
      const payload: any = { messages: [userMsg] };
      if (sessionId) payload.session_id = sessionId;

      const res = await fetch("/api/chat/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error ?? "Failed to get a response");
        setLoading(false);
        return;
      }
      const assistant = body?.assistant_message ?? "Sorry, I couldn't generate a response.";
      const assistantMsg: Msg = { role: "assistant", content: String(assistant), created_at: new Date().toISOString() };
      addMessage(assistantMsg);
    } catch (err: any) {
      setError(err?.message ?? "Unexpected error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(6,54,67,0.65)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="presentation"
    >
      <div className="w-full max-w-xl overflow-hidden rounded-3xl shadow-2xl" style={{ background: "rgba(255,255,255,0.96)", border: "1px solid rgba(61,132,137,0.18)" }}>
        <div className="relative flex items-center justify-between px-6 py-5" style={{ background: "#0D2D35" }}>
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-xl" style={{ background: "rgba(61,132,137,0.20)" }}>
                <FallbackImage src="/dashboard/robot.png" alt="AI" className="h-4 w-4" />
              </div>
              <span className="text-[10px] font-black tracking-[0.22em]" style={{ color: "rgba(255,255,255,0.45)" }}>AI ASSISTANT</span>
            </div>
            <h2 className="mt-0.5 text-2xl font-bold text-white">AI Assistant</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleClear} className="rounded-md px-3 py-1 text-xs font-medium text-white/90 hover:bg-white/10">Clear</button>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-white/15" style={{ color: "rgba(255,255,255,0.60)" }} aria-label="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex flex-col gap-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'assistant' ? 'justify-start' : 'justify-end'}`}>
                <div className={`max-w-[78%] rounded-2xl px-4 py-3 ${m.role === 'assistant' ? 'bg-[#f0f6f6] text-[#0d2e38]' : 'bg-[#063643] text-white'}`}>
                  <div className="text-sm whitespace-pre-wrap">
                    <span>{m.content}</span>
                  </div>
                  <div className="text-[10px] mt-1 text-[#6a7f87]">{m.created_at ? new Date(m.created_at).toLocaleTimeString() : ''}</div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="px-5 pb-5 pt-2">
          {error && <div className="mb-2 rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
          <div className="flex gap-2">
            <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Ask about recipes, swaps, or your goals" className="flex-1 rounded-full px-4 py-2 text-sm outline-none" />
            <button onClick={handleSend} disabled={loading} className="rounded-full bg-[#0D2D35] px-4 py-2 text-xs font-bold text-white">{loading ? 'Thinking…' : 'Send'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
