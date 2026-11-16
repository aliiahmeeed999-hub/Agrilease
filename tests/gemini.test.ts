import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTranslator } from "use-intl/core";
import messages from "../messages/en.json";
import { prisma } from "@/lib/prisma";
import { generateWithGemini, findUnsupportedNumbers, cleanModelText } from "@/lib/ai/gemini";
import { buildGeminiAssistantReply } from "@/lib/ai/gemini-assistant";
import { summarizeModelOutput, clearSummaryCache } from "@/lib/ai/gemini-summary";
import type { AssistantContext, Translate } from "@/lib/ai/assistant";
import type { YieldPrediction } from "@/types/ai";
import { POST as postAssistant } from "@/app/api/ai/assistant/route";
import { GET as getYieldSummary } from "@/app/api/ai/yield/summary/route";
import { createTestUser, jsonRequest, loginAs } from "./helpers";

// Gemini is never called for real here: fetch is stubbed, and vitest.config.ts
// blanks GEMINI_API_KEY so other test files can't reach it either.

const t = createTranslator({ locale: "en", messages, namespace: "ai" }) as unknown as Translate;

const FAKE_KEY = "test-gemini-key";

function geminiResponse(text: string, finishReason = "STOP") {
  return new Response(
    JSON.stringify({ candidates: [{ content: { parts: [{ text }] }, finishReason }] }),
    { status: 200, headers: { "content-type": "application/json" } }
  );
}

// Answers Gemini calls with `onGemini`; every other external call (weather,
// soil, NASA POWER) fails, so the app's own non-network fallbacks are used.
function stubFetch(onGemini: (body: Record<string, unknown>) => Response | Promise<Response>) {
  const calls: { url: string; headers: Headers; body: Record<string, unknown> }[] = [];
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes("generativelanguage.googleapis.com")) {
      const body = JSON.parse(String(init?.body ?? "{}"));
      calls.push({ url, headers: new Headers(init?.headers), body });
      return onGemini(body);
    }
    return new Response("unavailable", { status: 503 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return calls;
}

const yieldPrediction: YieldPrediction = {
  fieldId: "field-db-id-123",
  fieldName: "North Field",
  cropType: "WHEAT",
  areaHectares: 10,
  predictedTotalTons: 30,
  predictedPerHectare: 3,
  priorSeasonTotalTons: 28,
  trendPct: 7,
  confidenceRangeTons: [27, 33],
  confidenceLevel: "MEDIUM",
  daysToHarvest: 40,
  modelBacked: true,
};

const context: AssistantContext = {
  fullName: "Khalid Test",
  yields: [yieldPrediction],
  recommendations: { upcoming: [], completedReview: [] },
  forecast: { weeks: [], topType: "TRACTOR", totalHoursNext8Weeks: 0, platformSeasonalTrend: [] },
  weather: null,
  soil: null,
};

beforeEach(() => {
  process.env.GEMINI_API_KEY = FAKE_KEY;
  clearSummaryCache();
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  process.env.GEMINI_API_KEY = "";
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("generateWithGemini", () => {
  const request = { systemInstruction: "s", contents: [{ role: "user" as const, text: "q" }] };

  it("does nothing without a key, and says why", async () => {
    process.env.GEMINI_API_KEY = "";
    const calls = stubFetch(() => geminiResponse("hi"));
    expect(await generateWithGemini(request)).toEqual({ text: null, failure: "no GEMINI_API_KEY set" });
    expect(calls).toHaveLength(0);
  });

  it("sends the key in a header, never in the URL", async () => {
    const calls = stubFetch(() => geminiResponse("hello"));
    expect(await generateWithGemini(request)).toEqual({ text: "hello" });
    expect(calls[0].headers.get("x-goog-api-key")).toBe(FAKE_KEY);
    expect(calls[0].url).not.toContain(FAKE_KEY);
  });

  it.each([
    ["rate limit", () => new Response("quota", { status: 429 }), /rate limit.*429/],
    ["overload", () => new Response("busy", { status: 503 }), /overloaded.*503/],
    ["cut-off answer", () => geminiResponse("partial", "MAX_TOKENS"), /incomplete \(MAX_TOKENS\)/],
    ["empty answer", () => new Response(JSON.stringify({ candidates: [] }), { status: 200 }), /no text/],
    ["network error", () => Promise.reject(new TypeError("fetch failed")), /network error/],
    ["timeout", () => Promise.reject(Object.assign(new Error("timed out"), { name: "TimeoutError" })), /timed out/],
  ])("returns no text on %s, with the reason", async (_name, respond, reason) => {
    stubFetch(respond as () => Response);
    const result = await generateWithGemini(request);
    expect(result.text).toBeNull();
    expect(result.failure).toMatch(reason);
    expect(result.failure).not.toContain(FAKE_KEY);
  });

  it("names the quota and retry delay on a rate limit", async () => {
    stubFetch(
      () =>
        new Response(
          JSON.stringify({
            error: {
              code: 429,
              details: [
                { violations: [{ quotaId: "GenerateRequestsPerMinutePerProjectPerModel-FreeTier" }] },
                { retryDelay: "21s" },
              ],
            },
          }),
          { status: 429 }
        )
    );
    expect((await generateWithGemini(request)).failure).toBe(
      "Gemini rate limit or quota reached (HTTP 429); quota GenerateRequestsPerMinutePerProjectPerModel-FreeTier, retry after 21s"
    );
  });

  it("gives up at the deadline even if the request ignores its abort signal", async () => {
    stubFetch(() => new Promise<Response>(() => {}));
    const started = Date.now();
    const result = await generateWithGemini({ ...request, timeoutMs: 50 });
    expect(result).toEqual({ text: null, failure: "Gemini timed out after 50 ms" });
    expect(Date.now() - started).toBeLessThan(3_000);
  });
});

describe("findUnsupportedNumbers", () => {
  it("accepts numbers from the data, rounded, with decimal commas or Arabic digits", () => {
    const data = JSON.stringify({ tons: 30.47, pct: -7 });
    expect(findUnsupportedNumbers("About 30,5 t, 30 t, up 7%", [data])).toEqual([]);
    expect(findUnsupportedNumbers("حوالي ٣٠ طنًا", [data])).toEqual([]);
  });

  it("flags numbers that are not in the data", () => {
    expect(findUnsupportedNumbers("Expect 45 tons", [JSON.stringify({ tons: 30 })])).toEqual(["45"]);
  });
});

describe("cleanModelText", () => {
  it("decodes HTML entities, including ones missing their semicolon", () => {
    expect(cleanModelText("t&acirc;ches pr&eacutevues, **demain**")).toBe("tâches prévues, demain");
  });

  it("returns null when unknown entities would leave garbled text", () => {
    expect(cleanModelText("pr&zzzz;vu")).toBeNull();
  });

  it("rejects mixed-alphabet text but keeps Latin field names inside Arabic", () => {
    expect(cleanModelText("تشir الحисات по 4 حقول")).toBeNull();
    expect(cleanModelText("حقل القمح في North Field سيحقق 32.3 طنا")).toBe("حقل القمح في North Field سيحقق 32.3 طنا");
  });
});

const pages = { farms: "Farms", tasks: "Tasks" };

// A Gemini response in the assistant's JSON format.
function answer(parts: {
  topic: "farm" | "general" | "mixed" | "off_topic";
  generalAnswer?: string;
  farmAnswer?: string;
  caution?: string;
  references?: string[];
}) {
  return geminiResponse(
    JSON.stringify({ generalAnswer: "", farmAnswer: "", caution: "", references: [], ...parts })
  );
}

describe("buildGeminiAssistantReply", () => {
  it("uses Gemini's farm answer and maps its reference keys to in-app links", async () => {
    stubFetch(() => answer({ topic: "farm", farmAnswer: "North Field should give about 30 tons.", references: ["F1", "X9"] }));
    const { reply } = await buildGeminiAssistantReply("rendement?", [], context, t, pages);
    expect(reply?.reply).toBe("North Field should give about 30 tons.");
    // The unknown key "X9" is dropped rather than turned into a broken link.
    expect(reply?.references).toEqual([
      { type: "field", id: "field-db-id-123", label: "North Field", href: "/ai/yield" },
    ]);
  });

  it("sends field data but not database ids, and states both answer modes", async () => {
    const calls = stubFetch(() => answer({ topic: "general", generalAnswer: "ok" }));
    await buildGeminiAssistantReply("hello", [], context, t, pages);
    const sent = JSON.stringify(calls[0].body);
    expect(sent).toContain("North Field");
    expect(sent).not.toContain("field-db-id-123");
    expect(sent).toContain("Answer ONLY from FARM_CONTEXT");
    expect(sent).toContain("Answer from your own knowledge");
  });

  it("answers a general question from Gemini's knowledge, numbers included", async () => {
    stubFetch(() =>
      answer({
        topic: "general",
        generalAnswer: "Sow durum wheat 3 to 5 cm deep, at about 250 to 350 seeds per m2, from mid-November.",
      })
    );
    const { reply } = await buildGeminiAssistantReply("How deep should I sow wheat?", [], context, t, pages);
    expect(reply?.reply).toBe("Sow durum wheat 3 to 5 cm deep, at about 250 to 350 seeds per m2, from mid-November.");
  });

  it("puts general advice first, then the farm part, then the caution note", async () => {
    stubFetch(() =>
      answer({
        topic: "mixed",
        farmAnswer: "On your farm: North Field is wheat, 10 ha.",
        generalAnswer: "Against rust, a triazole fungicide is usually applied at 0.5 to 1 L/ha.",
        caution: "Check the product label or ask a local agronomist before spraying.",
        references: ["F1"],
      })
    );
    const { reply } = await buildGeminiAssistantReply("Rust on my wheat, what should I spray?", [], context, t, pages);
    expect(reply?.reply).toBe(
      "Against rust, a triazole fungicide is usually applied at 0.5 to 1 L/ha.\n\n" +
        "On your farm: North Field is wheat, 10 ha.\n\n" +
        "Check the product label or ask a local agronomist before spraying."
    );
  });

  it("says when farm data is missing, links the right page, and names nothing internal", async () => {
    stubFetch(() =>
      answer({
        topic: "farm",
        farmAnswer: "I don't have tomorrow's forecast for your farm.",
        references: ["page:farms"],
      })
    );
    const { reply } = await buildGeminiAssistantReply("Will it rain on my farm tomorrow?", [], context, t, pages);
    expect(reply?.reply).toBe("I don't have tomorrow's forecast for your farm.");
    expect(reply?.reply).not.toMatch(/FARM_CONTEXT|currentWeatherAtMainFarm|page:/);
    expect(reply?.references).toEqual([{ type: "field", id: "page-farms", label: "Farms", href: "/farms" }]);
  });

  it.each([
    ["FARM_CONTEXT", "FARM_CONTEXT has no weather for your farm."],
    ["a data field name", "Your currentWeatherAtMainFarm value is empty."],
    ["a reference key", "F1 is your best field."],
    ["a page key", "See page:farms for details."],
  ])("rejects an answer that mentions %s", async (_name, farmAnswer) => {
    stubFetch(() => answer({ topic: "farm", farmAnswer }));
    const result = await buildGeminiAssistantReply("weather?", [], context, t, pages);
    expect(result.reply).toBeNull();
    expect(result.fallbackReason).toMatch(/^internal-name check/);
  });

  it("still rejects a made-up farm number", async () => {
    stubFetch(() => answer({ topic: "farm", farmAnswer: "North Field will give 55 tons this year." }));
    const result = await buildGeminiAssistantReply("yield?", [], context, t, pages);
    expect(result.reply).toBeNull();
    expect(result.fallbackReason).toBe("number check: Gemini's farm answer had 1 number(s) not in the farm data");
  });

  it("does not check general advice for farm numbers", async () => {
    stubFetch(() =>
      answer({
        topic: "mixed",
        generalAnswer: "Drip lines are usually spaced 1.2 to 1.5 m apart in orchards.",
        farmAnswer: "On your farm: North Field covers 10 ha.",
      })
    );
    const { reply } = await buildGeminiAssistantReply("drip spacing for my field?", [], context, t, pages);
    expect(reply?.reply).toContain("1.2 to 1.5 m");
  });

  it("steers an off-topic question back to farming, without links", async () => {
    stubFetch(() =>
      answer({
        topic: "off_topic",
        generalAnswer: "I can't help with football results, but I can help with your crops, irrigation or equipment.",
        references: ["F1"],
      })
    );
    const { reply } = await buildGeminiAssistantReply("Who won the match yesterday?", [], context, t, pages);
    expect(reply?.reply).toMatch(/can help with your crops/);
    expect(reply?.references).toEqual([]);
  });

  it("rejects an empty answer or one that is not the expected JSON, with the reason", async () => {
    stubFetch(() => answer({ topic: "general" }));
    expect(await buildGeminiAssistantReply("hi", [], context, t, pages)).toEqual({
      reply: null,
      fallbackReason: "Gemini's answer had no text (topic: general)",
    });
    stubFetch(() => geminiResponse("Sure! Your yield is fine."));
    expect(await buildGeminiAssistantReply("yield?", [], context, t, pages)).toEqual({
      reply: null,
      fallbackReason: "Gemini's answer was not the expected JSON",
    });
  });

  it("shows an answer that Gemini put entirely in the caution field", async () => {
    stubFetch(() => answer({ topic: "general", caution: "Follow the dose on the product label." }));
    const { reply } = await buildGeminiAssistantReply("dose?", [], context, t, pages);
    expect(reply?.reply).toBe("Follow the dose on the product label.");
  });
});

describe("summarizeModelOutput", () => {
  it("returns Gemini's explanation and caches it", async () => {
    const calls = stubFetch(() => geminiResponse("North Field is on track, a little above last season."));
    expect(await summarizeModelOutput("yield", "en", [yieldPrediction])).toBe(
      "North Field is on track, a little above last season."
    );
    await summarizeModelOutput("yield", "en", [yieldPrediction]);
    expect(calls).toHaveLength(1);
    expect(JSON.stringify(calls[0].body)).toContain("Write in English");
  });

  it("drops a summary that invents a figure", async () => {
    stubFetch(() => geminiResponse("Yield should reach 42 tons."));
    expect(await summarizeModelOutput("yield", "fr", [yieldPrediction])).toBeNull();
  });

  it("does not call Gemini when there is nothing to summarise", async () => {
    const calls = stubFetch(() => geminiResponse("x"));
    expect(await summarizeModelOutput("yield", "en", [])).toBeNull();
    expect(calls).toHaveLength(0);
  });
});

describe("POST /api/ai/assistant with Gemini", () => {
  async function farmerWithField() {
    const { user } = await createTestUser({ role: "FARMER" });
    const farm = await prisma.farm.create({
      data: { ownerId: user.id, name: "Ferme Test", region: "Souss", sizeHectares: 10, latitude: 30.4, longitude: -9.5 },
    });
    await prisma.field.create({
      data: {
        farmId: farm.id,
        name: "Champ Nord",
        cropType: "WHEAT",
        areaHectares: 5,
        centerLat: 30.4,
        centerLng: -9.5,
        polygon: [],
        status: "GROWING",
        expectedHarvestAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });
    await loginAs(user);
    return user;
  }

  it("answers with Gemini and sends Gemini none of the account's private data", async () => {
    const user = await farmerWithField();
    const calls = stubFetch(() =>
      answer({ topic: "farm", farmAnswer: "Champ Nord est en croissance.", references: ["F1"] })
    );

    const res = await postAssistant(jsonRequest("/api/ai/assistant", "POST", { message: "Comment va mon champ ?" }));
    expect(res.status).toBe(200);
    const body = (await res.json()).data;
    expect(body.reply).toBe("Champ Nord est en croissance.");
    expect(body.references[0]).toMatchObject({ label: "Champ Nord", href: "/ai/yield" });

    const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    const sent = JSON.stringify(calls[0].body);
    expect(sent).toContain("Champ Nord");
    expect(sent).not.toContain(dbUser.email);
    expect(sent).not.toContain(dbUser.passwordHash);
    expect(sent).not.toContain(dbUser.id);
  });

  it("falls back to the template answer when Gemini is rate limited, logging one line with the reason", async () => {
    await farmerWithField();
    stubFetch(() => new Response("quota", { status: 429 }));

    const res = await postAssistant(jsonRequest("/api/ai/assistant", "POST", { message: "what's my yield outlook" }));
    expect(res.status).toBe(200);
    const body = (await res.json()).data;
    expect(body.reply).toContain("Champ Nord");

    const lines = vi.mocked(console.warn).mock.calls.map((args) => String(args[0])).filter((l) => l.startsWith("[assistant]"));
    expect(lines).toEqual(["[assistant] template fallback: Gemini rate limit or quota reached (HTTP 429)"]);
    expect(lines[0]).not.toContain(FAKE_KEY);
    expect(lines[0]).not.toContain("yield outlook");
  });

  it("logs the reason when the number check rejects the answer", async () => {
    await farmerWithField();
    stubFetch(() => answer({ topic: "farm", farmAnswer: "On your farm: Champ Nord will give 999 tons." }));

    const res = await postAssistant(jsonRequest("/api/ai/assistant", "POST", { message: "rendement ?" }));
    expect(res.status).toBe(200);
    expect(console.warn).toHaveBeenCalledWith(
      "[assistant] template fallback: number check: Gemini's farm answer had 1 number(s) not in the farm data"
    );
  });

  it("uses the template answer without calling Gemini when no key is set", async () => {
    process.env.GEMINI_API_KEY = "";
    await farmerWithField();
    const calls = stubFetch(() => geminiResponse("never"));

    const res = await postAssistant(jsonRequest("/api/ai/assistant", "POST", { message: "hello" }));
    expect(res.status).toBe(200);
    expect(calls).toHaveLength(0);
    expect(console.warn).toHaveBeenCalledWith("[assistant] template fallback: no GEMINI_API_KEY set");
  });
});

describe("GET /api/ai/yield/summary", () => {
  it("returns a null summary when Gemini is not configured", async () => {
    process.env.GEMINI_API_KEY = "";
    const { user } = await createTestUser({ role: "FARMER" });
    await loginAs(user);
    const res = await getYieldSummary(jsonRequest("/api/ai/yield/summary?locale=fr", "GET"));
    expect(res.status).toBe(200);
    expect((await res.json()).data).toEqual({ summary: null });
  });

  it("requires a signed-in farmer", async () => {
    const res = await getYieldSummary(jsonRequest("/api/ai/yield/summary", "GET"));
    expect(res.status).toBe(401);
  });
});
