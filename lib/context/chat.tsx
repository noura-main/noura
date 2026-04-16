"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

export type ChatMsg = { id?: string; role: "user" | "assistant" | "system"; content: string; created_at?: string };

type ChatContextValue = {
  messages: ChatMsg[];
  addMessage: (m: ChatMsg) => void;
  setMessages: (updater: React.SetStateAction<ChatMsg[]>) => void;
  sessionId: string | null;
  setSessionId: (id: string | null) => void;
  saveToCache: (msgs?: ChatMsg[], sid?: string | null) => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);

export function ChatProvider({ children }: { children: React.ReactNode }) {
  // lazy initializer from localStorage
  const [messages, setMessages] = useState<ChatMsg[]>(() => {
    try {
      const raw = localStorage.getItem("chat_cache");
      if (raw) {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed.messages) ? parsed.messages : [];
      }
    } catch (e) {
      // ignore
    }
    return [];
  });

  const [sessionId, setSessionId] = useState<string | null>(() => {
    try {
      const raw = localStorage.getItem("chat_cache");
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.sessionId ?? `local-${Date.now()}-${Math.round(Math.random()*10000)}`;
      }
    } catch (e) {}
    return `local-${Date.now()}-${Math.round(Math.random()*10000)}`;
  });

  const saveToCache = useCallback((msgs?: ChatMsg[], sid?: string | null) => {
    try {
      const payload = { sessionId: sid ?? sessionId, messages: msgs ?? messages };
      localStorage.setItem("chat_cache", JSON.stringify(payload));
    } catch (e) {
      // ignore
    }
  }, [messages, sessionId]);

  const addMessage = useCallback((m: ChatMsg) => {
    setMessages((prev) => {
      const next = [...prev, m];
      try { localStorage.setItem("chat_cache", JSON.stringify({ sessionId, messages: next })); } catch (e) {}
      return next;
    });
  }, [sessionId]);

  const value = useMemo(() => ({ messages, addMessage, setMessages, sessionId, setSessionId, saveToCache }), [messages, addMessage, sessionId, saveToCache]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used within ChatProvider");
  return ctx;
}

export default ChatContext;
