// Fixed-window in-memory rate limiter, keyed per caller. This is intentionally
// simple (no external dependency) and fits a single-instance Node.js deployment,
// which is what this project targets (see proxy.ts's "Runtime" note). It does NOT
// work correctly across multiple server instances/processes (a serverless/edge
// deployment with several concurrent instances, or a restart-heavy host) since
// each process has its own in-memory Map - a real multi-instance deployment would
// need a shared store (e.g. Redis/Upstash) keyed the same way instead.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Opportunistic cleanup so long-running dev/prod processes don't accumulate an
// unbounded number of stale per-IP entries; cheap enough to check on every call.
function sweepExpired(now: number) {
  if (buckets.size < 5000) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweepExpired(now);

  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return { allowed: false, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSeconds: 0 };
}

export function clientIp(headers: Headers): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "unknown";
}
