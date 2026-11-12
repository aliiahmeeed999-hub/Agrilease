import { useEffect } from "react";

// Lets a card report its own error state upward without lifting its query -
// each card keeps owning its `useQuery` call (so its own "Try again" retries
// only that card's data), while a parent page can still aggregate how many
// independent widgets are currently failing to decide whether to show a
// single "retry all" banner (see RetryAllBanner).
export function useErrorReport(isError: boolean, onErrorChange?: (isError: boolean) => void) {
  useEffect(() => {
    onErrorChange?.(isError);
  }, [isError, onErrorChange]);
}
