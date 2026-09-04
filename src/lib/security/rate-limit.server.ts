/**
 * Small application-level burst limiter.
 *
 * This is intentionally a second line of defense, not a distributed quota
 * system. Public deployments should also enforce limits at the reverse proxy
 * or shared datastore. It still prevents one browser session from trivially
 * hammering model/tool execution on a single app instance.
 */

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function intEnv(key: string, fallback: number, min: number, max: number): number {
  const raw = Number(process.env[key] ?? fallback);
  if (!Number.isFinite(raw)) return fallback;
  return Math.max(min, Math.min(max, Math.floor(raw)));
}

export class RateLimitError extends Error {
  readonly status = 429;
  readonly retryAfterSeconds: number;

  constructor(retryAfterSeconds: number) {
    super("Too many agent requests");
    this.name = "RateLimitError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export function enforceAgentRateLimit(userId: string): void {
  const limit = intEnv("HODGEFORM_AGENT_REQUESTS_PER_MINUTE", 12, 1, 600);
  const now = Date.now();
  const key = `agent:${userId}`;
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + 60_000 });
    return;
  }
  if (bucket.count >= limit) {
    throw new RateLimitError(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)));
  }
  bucket.count += 1;

  if (buckets.size > 10_000) {
    for (const [id, value] of buckets) {
      if (value.resetAt <= now) buckets.delete(id);
    }
  }
}
