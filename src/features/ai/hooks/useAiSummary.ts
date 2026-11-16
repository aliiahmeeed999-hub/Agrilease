import { useQuery } from "@tanstack/react-query";
import { useLocale } from "next-intl";
import { getAiSummary } from "@/services/ai.service";

// Loaded separately from the figures so they never wait on Gemini. No retries:
// a missing summary is fine, and the page shows nothing in its place.
export function useAiSummary(kind: "yield" | "recommendations") {
  const locale = useLocale();
  return useQuery({
    queryKey: ["ai", "summary", kind, locale],
    queryFn: () => getAiSummary(kind, locale),
    retry: false,
    staleTime: 10 * 60 * 1000,
  });
}
