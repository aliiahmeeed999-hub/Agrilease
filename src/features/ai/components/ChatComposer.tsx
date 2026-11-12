"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ChatComposer({
  onSend,
  isSending,
}: {
  onSend: (message: string) => void;
  isSending: boolean;
}) {
  const [value, setValue] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() || isSending) return;
    onSend(value);
    setValue("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ask about your yield, equipment, or upcoming demand..."
        disabled={isSending}
        className="h-11"
      />
      <Button type="submit" disabled={isSending || !value.trim()} className="h-11 px-4">
        <Send className="size-4" />
      </Button>
    </form>
  );
}
