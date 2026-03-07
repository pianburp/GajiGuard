/**
 * Simple in-memory sliding-window rate limiter for server actions.
 * Keyed by user ID to prevent an authenticated user from hammering actions.
 *
 * Note: This is per-process. In a multi-instance deployment, consider
 * switching to a Redis-backed limiter (e.g. @upstash/ratelimit).
 */

interface Window {
  count: number;
  resetAt: number;
}

const store = new Map<string, Window>();

// Cleanup stale entries every 5 minutes
setInterval(
  () => {
    const now = Date.now();
    for (const [key, w] of store) {
      if (now > w.resetAt) store.delete(key);
    }
  },
  5 * 60 * 1000,
).unref?.();

/**
 * Check whether the caller may proceed.
 * @param key    Unique key (usually `userId:actionName`)
 * @param max    Maximum calls allowed in the window (default 30)
 * @param windowMs  Window duration in ms (default 60 000 = 1 min)
 * @throws Error if the rate limit is exceeded.
 */
export function rateLimit(
  key: string,
  max = 30,
  windowMs = 60_000,
): void {
  const now = Date.now();
  let entry = store.get(key);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    store.set(key, entry);
  }

  entry.count++;

  if (entry.count > max) {
    throw new Error("Too many requests. Please try again later.");
  }
}
