import { Link } from "@/i18n/navigation";
import { Bot, User } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TypingIndicator } from "@/features/ai/components/TypingIndicator";
import type { ChatMessage } from "@/features/ai/hooks/useAiAssistant";

export function ChatMessageList({ messages, isSending }: { messages: ChatMessage[]; isSending: boolean }) {
  return (
    <ScrollArea className="h-[52vh] min-h-80 rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-col gap-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
            <span
              className={`flex size-8 shrink-0 items-center justify-center rounded-full ${
                message.role === "user" ? "bg-muted text-muted-foreground" : "bg-primary/15 text-primary"
              }`}
            >
              {message.role === "user" ? <User className="size-4" /> : <Bot className="size-4" />}
            </span>
            <div
              className={`flex max-w-[80%] flex-col gap-2 rounded-2xl px-4 py-2.5 text-sm whitespace-pre-line ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}
            >
              {message.content}
              {message.references && message.references.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {message.references.map((ref) => (
                    <Link
                      key={`${ref.type}-${ref.id}`}
                      href={ref.href}
                      className="rounded-full border border-border/60 bg-background/60 px-2.5 py-1 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {ref.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isSending && (
          <div className="flex gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Bot className="size-4" />
            </span>
            <div className="rounded-2xl bg-muted px-2 py-0.5">
              <TypingIndicator />
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
