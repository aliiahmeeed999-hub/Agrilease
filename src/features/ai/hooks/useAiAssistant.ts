import { useState } from "react";
import { sendAssistantMessage } from "@/services/ai.service";
import { ApiError } from "@/services/api-client";
import type { AiReference, AssistantChatMessage } from "@/types/ai";

export interface ChatMessage extends AssistantChatMessage {
  id: string;
  references?: AiReference[];
}

export function useAiAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    const history: AssistantChatMessage[] = messages.map(({ role, content }) => ({ role, content }));
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMessage]);
    setError(null);
    setIsSending(true);

    try {
      const { reply, references } = await sendAssistantMessage(trimmed, history);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", content: reply, references },
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSending(false);
    }
  }

  return { messages, isSending, error, sendMessage };
}
