"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils/cn";
import { useSubmitReview } from "@/features/rentals/hooks/useSubmitReview";

export function ReviewForm({ bookingId, onDone }: { bookingId: string; onDone: () => void }) {
  const { submit, pendingId, error } = useSubmitReview();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const isSubmitting = pendingId === bookingId;

  async function handleSubmit() {
    if (rating < 1) return;
    const ok = await submit(bookingId, { rating, comment: comment.trim() || undefined });
    if (ok) onDone();
  }

  return (
    <div className="mt-3 flex flex-col gap-2 rounded-xl border border-border p-3">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onMouseEnter={() => setHoverRating(n)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(n)}
          >
            <Star
              className={cn(
                "size-5 transition-colors",
                (hoverRating || rating) >= n ? "fill-primary text-primary" : "text-muted-foreground"
              )}
            />
          </button>
        ))}
      </div>

      <Textarea
        placeholder="How did it go? (optional)"
        className="min-h-16 text-sm"
        value={comment}
        onChange={(e) => setComment(e.target.value)}
      />

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="flex items-center gap-2">
        <Button size="sm" disabled={rating < 1 || isSubmitting} onClick={handleSubmit}>
          {isSubmitting ? "Submitting..." : "Submit review"}
        </Button>
        <Button size="sm" variant="outline" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
