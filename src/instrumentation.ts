import { geminiModel, isGeminiConfigured } from "@/lib/ai/gemini";

// Runs once when the server starts. Says whether the Gemini key was loaded
// (never the key itself), so a missing or misnamed variable shows up at
// startup instead of as unexplained template answers.
export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (isGeminiConfigured()) {
    console.log(`[gemini] GEMINI_API_KEY loaded; assistant and summaries use ${geminiModel()}`);
  } else {
    console.warn("[gemini] GEMINI_API_KEY not set; the assistant uses template answers and no summaries are shown");
  }
}
