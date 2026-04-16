export type ChatRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id?: string;
  user_id?: string;
  chat_session_id?: string;
  role: ChatRole;
  content: string;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
}

export interface ChatSession {
  id?: string;
  user_id?: string;
  title?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at?: string;
}
