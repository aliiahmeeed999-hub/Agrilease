// Minimal server-side client for the Gemini API (generateContent over REST).
//
// Every failure (no key, timeout, rate limit, overload, blocked or empty
// answer, malformed response) comes back as { text: null, failure } with a
// short reason, so callers can fall back to the deterministic, non-LLM path
// and log one line saying why. Nothing here throws or logs, and reasons never
// contain the key or the farmer's data.
//
// The key is read from process.env.GEMINI_API_KEY at call time and sent in a
// header, never in the URL. It must never get a NEXT_PUBLIC_ prefix: that would
// ship it to the browser.

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

// Pinned rather than a "-latest" alias so the behaviour doesn't change under
// us. Override with GEMINI_MODEL.
export const DEFAULT_GEMINI_MODEL = "gemini-3.5-flash-lite";

export interface GeminiTurn {
  role: "user" | "model";
  text: string;
}

export interface GeminiRequest {
  systemInstruction: string;
  contents: GeminiTurn[];
  // When set, Gemini is asked for JSON matching this (OpenAPI-subset) schema.
  responseSchema?: Record<string, unknown>;
  maxOutputTokens?: number;
  timeoutMs?: number;
}

export type GeminiResult = { text: string; failure?: undefined } | { text: null; failure: string };

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

export function geminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL;
}

interface GenerateContentResponse {
  candidates?: {
    content?: { parts?: { text?: string; thought?: boolean }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
}

const fail = (failure: string): GeminiResult => ({ text: null, failure });

function describeHttpStatus(status: number): string {
  if (status === 429) return "Gemini rate limit or quota reached (HTTP 429)";
  if (status === 503) return "Gemini model overloaded (HTTP 503)";
  if (status === 400 || status === 401 || status === 403) return `Gemini rejected the request or key (HTTP ${status})`;
  if (status === 404) return "Gemini model not found (HTTP 404); check GEMINI_MODEL";
  return `Gemini error (HTTP ${status})`;
}

// For a 429: which quota was hit (per minute or per day) and when Google says
// to retry, e.g. "; quota GenerateRequestsPerMinutePerProjectPerModel-FreeTier, retry after 21s".
async function describeQuota(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      error?: { details?: { violations?: { quotaId?: string }[]; retryDelay?: string }[] };
    };
    const details = body.error?.details ?? [];
    const quotaId = details.flatMap((d) => d.violations ?? []).find((v) => v.quotaId)?.quotaId;
    const retryDelay = details.find((d) => d.retryDelay)?.retryDelay;
    return [quotaId && `; quota ${quotaId}`, retryDelay && `, retry after ${retryDelay}`].filter(Boolean).join("");
  } catch {
    return "";
  }
}

export async function generateWithGemini(request: GeminiRequest): Promise<GeminiResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return fail("no GEMINI_API_KEY set");

  // The abort signal below covers the request; this hard deadline also covers
  // a stalled response body, so a caller never waits much past timeoutMs.
  const timeoutMs = request.timeoutMs ?? 10_000;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<GeminiResult>((resolve) => {
    timer = setTimeout(() => resolve(fail(`Gemini timed out after ${timeoutMs} ms`)), timeoutMs + 1_000);
  });
  try {
    return await Promise.race([callGemini(request, apiKey, timeoutMs), deadline]);
  } finally {
    clearTimeout(timer);
  }
}

async function callGemini(request: GeminiRequest, apiKey: string, timeoutMs: number): Promise<GeminiResult> {
  const body = {
    systemInstruction: { parts: [{ text: request.systemInstruction }] },
    contents: request.contents.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: request.maxOutputTokens ?? 600,
      ...(request.responseSchema
        ? { responseMimeType: "application/json", responseSchema: request.responseSchema }
        : {}),
    },
  };

  let response: Response;
  try {
    response = await fetch(`${API_BASE}/${encodeURIComponent(geminiModel())}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
      cache: "no-store",
    });
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    return fail(timedOut ? `Gemini timed out after ${timeoutMs} ms` : "network error reaching Gemini");
  }

  if (!response.ok) {
    const detail = response.status === 429 ? await describeQuota(response) : "";
    return fail(describeHttpStatus(response.status) + detail);
  }

  let data: GenerateContentResponse;
  try {
    data = (await response.json()) as GenerateContentResponse;
  } catch {
    return fail("unreadable response from Gemini");
  }

  if (data.promptFeedback?.blockReason) {
    return fail(`Gemini blocked the prompt (${data.promptFeedback.blockReason})`);
  }

  const candidate = data.candidates?.[0];
  const text = (candidate?.content?.parts ?? [])
    .filter((part) => !part.thought && typeof part.text === "string")
    .map((part) => part.text)
    .join("")
    .trim();

  if (!text) return fail(`Gemini returned no text (${candidate?.finishReason ?? "no candidate"})`);
  if (candidate?.finishReason && candidate.finishReason !== "STOP") {
    // Cut off (MAX_TOKENS) or filtered: a partial answer is worse than the fallback.
    return fail(`Gemini answer incomplete (${candidate.finishReason})`);
  }

  return { text };
}

// Readable words for enum codes sent to Gemini ("IRRIGATION_PUMP" ->
// "irrigation pump"), so the codes don't leak into answers.
export function humanizeCode(code: string): string {
  return code.toLowerCase().replace(/_/g, " ");
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“",
  laquo: "«", raquo: "»", hellip: "…", ndash: "–", mdash: "—", deg: "°", euro: "€",
  agrave: "à", aacute: "á", acirc: "â", auml: "ä", ccedil: "ç", egrave: "è", eacute: "é", ecirc: "ê", euml: "ë",
  icirc: "î", iuml: "ï", ocirc: "ô", ouml: "ö", ugrave: "ù", ucirc: "û", uuml: "ü", oelig: "œ", aelig: "æ",
  Agrave: "À", Acirc: "Â", Ccedil: "Ç", Egrave: "È", Eacute: "É", Ecirc: "Ê", Icirc: "Î", Ocirc: "Ô", Ucirc: "Û",
};

// Plain text for display: strips Markdown bold and decodes HTML entities some
// models emit (sometimes without the closing ";"). Returns null if anything
// entity-like is left, rather than show garbled text.
export function cleanModelText(text: string): string | null {
  const cleaned = text
    .replace(/\*\*/g, "")
    .replace(/&#(\d+);?/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);?/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-zA-Z]+)(;?)/g, (match, letters: string, semicolon: string) => {
      if (semicolon) return NAMED_ENTITIES[letters] ?? match;
      // No ";": the entity name may run into the next word ("&eacutee").
      for (let length = letters.length; length > 1; length -= 1) {
        const decoded = NAMED_ENTITIES[letters.slice(0, length)];
        if (decoded) return decoded + letters.slice(length);
      }
      return match;
    })
    .trim();
  if (!cleaned || /&[a-zA-Z#][a-zA-Z0-9]*;?/.test(cleaned)) return null;
  if (hasGarbledScript(cleaned)) return null;
  return cleaned;
}

// Smaller models occasionally degenerate into mixed-alphabet text
// ("تشir الحисات"). Our languages never need Cyrillic or Greek, and no real
// word mixes Arabic letters with Latin ones (Latin field names on their own,
// such as "North Field", are fine).
function hasGarbledScript(text: string): boolean {
  if (/[Ͱ-ϿЀ-ӿ]/.test(text)) return true;
  return text.split(/\s+/).some((word) => /[؀-ۿ]/.test(word) && /[A-Za-z]/.test(word));
}

// Numbers shown to farmers must come from the trained models, not from the
// language model. This checks that every number in Gemini's text appears in
// the data it was given (exactly, or rounded to 0 or 1 decimal places).
// Accepts Arabic-Indic digits and decimal commas.
export function findUnsupportedNumbers(text: string, allowedSources: string[]): string[] {
  const allowed = new Set<string>();
  for (const source of allowedSources) {
    for (const raw of extractNumbers(source)) {
      const value = Number(raw);
      allowed.add(String(value));
      allowed.add(String(Math.round(value)));
      allowed.add(String(Math.round(value * 10) / 10));
      allowed.add(String(Math.abs(value)));
      allowed.add(String(Math.round(Math.abs(value))));
      allowed.add(String(Math.round(Math.abs(value) * 10) / 10));
    }
  }
  return extractNumbers(text).filter((raw) => !allowed.has(String(Number(raw))));
}

function extractNumbers(text: string): string[] {
  const western = text
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/٫/g, "."); // Arabic decimal separator
  return (western.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => n.replace(",", "."));
}
