import { apiRequest } from "@/services/api-client";
import type {
  AssistantChatMessage,
  AssistantReply,
  ForecastResult,
  TaskRecommendation,
  YieldPrediction,
} from "@/types/ai";

export function getYieldPredictions() {
  return apiRequest<{ fields: YieldPrediction[] }>("/api/ai/yield");
}

export function getEquipmentRecommendations() {
  return apiRequest<{ upcoming: TaskRecommendation[]; completedReview: TaskRecommendation[] }>(
    "/api/ai/recommendations"
  );
}

export function getDemandForecast() {
  return apiRequest<ForecastResult>("/api/ai/forecast");
}

export function sendAssistantMessage(message: string, history?: AssistantChatMessage[]) {
  return apiRequest<AssistantReply>("/api/ai/assistant", {
    method: "POST",
    body: JSON.stringify({ message, history }),
  });
}

// Gemini-written explanation of the yield or recommendation results, in the
// given locale. `summary` is null when Gemini is unavailable.
export function getAiSummary(kind: "yield" | "recommendations", locale: string) {
  return apiRequest<{ summary: string | null }>(`/api/ai/${kind}/summary?locale=${encodeURIComponent(locale)}`);
}
