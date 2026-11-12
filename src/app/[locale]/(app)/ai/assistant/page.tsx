"use client";

import { Bot } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { useAiAssistant } from "@/features/ai/hooks/useAiAssistant";
import { ChatMessageList } from "@/features/ai/components/ChatMessageList";
import { ChatComposer } from "@/features/ai/components/ChatComposer";
import { SuggestedPrompts } from "@/features/ai/components/SuggestedPrompts";

export default function AssistantPage() {
  const { messages, isSending, error, sendMessage } = useAiAssistant();

  return (
    <PageShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight">AI Assistant</h1>
        <p className="text-sm text-muted-foreground">
          Ask about your yield outlook, equipment recommendations, or upcoming equipment demand.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border py-16 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
              <Bot className="size-6" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">Ask me anything about your farm</p>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                I can summarize your yield outlook, recommend equipment for upcoming tasks, and flag when
                you&apos;ll need more machines.
              </p>
            </div>
            <SuggestedPrompts onSelect={sendMessage} />
          </div>
        ) : (
          <ChatMessageList messages={messages} isSending={isSending} />
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <ChatComposer onSend={sendMessage} isSending={isSending} />

        {messages.length > 0 && <SuggestedPrompts onSelect={sendMessage} />}
      </div>
    </PageShell>
  );
}
