/**
 * Keeps our AlphaVantage calls inside the free-tier limits:
 *   - 25 requests per day
 *   - 5 requests per minute
 *   - at least ~1 second between requests (burst limit)
 *
 * Callers ask for a "slot" before each request. If a slot is free soon enough they wait
 * for it; if the wait would be too long (e.g. a page should not hang for a minute) they
 * get `false` back and use cached or snapshot data instead.
 *
 * Limitation: the counts live in this server process's memory. On Vercel several
 * instances may run at once, each with its own counts (accepted in Q39; AlphaVantage's
 * own rate-limit response is still detected and handled).
 */

export interface RateLimits {
  perDay: number;
  perMinute: number;
  minSpacingMs: number;
}

export const FREE_TIER_LIMITS: RateLimits = {
  perDay: 25,
  perMinute: 5,
  minSpacingMs: 1100,
};

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

// Functions for reading the clock and waiting. Passing them in (instead of calling
// Date.now and setTimeout directly) lets the tests use a fake clock: the same idea as
// injecting a java.time.Clock.
export type Clock = () => number;
export type Sleep = (ms: number) => Promise<void>;

const realSleep: Sleep = (ms) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export class RateLimiter {
  /** Start times of granted requests (past and reserved future ones), oldest first. */
  private grantedAt: number[] = [];

  constructor(
    private readonly limits: RateLimits = FREE_TIER_LIMITS,
    private readonly now: Clock = Date.now,
    private readonly sleep: Sleep = realSleep,
  ) {}

  /**
   * Earliest time (ms since epoch) a new request may start, given the requests
   * already granted. Returns Infinity when the daily allowance is used up.
   */
  private nextAllowedTime(currentTime: number): number {
    // Forget requests older than a day; they no longer count against any limit.
    this.grantedAt = this.grantedAt.filter((t) => t > currentTime - DAY_MS);

    const { perDay, perMinute, minSpacingMs } = this.limits;
    if (this.grantedAt.length >= perDay) {
      return Infinity; // assume the day is rolling: wait for the oldest to expire
    }

    let earliest = currentTime;
    const last = this.grantedAt[this.grantedAt.length - 1];
    if (last !== undefined) {
      earliest = Math.max(earliest, last + minSpacingMs);
    }
    // Rolling minute: if `perMinute` requests started within the last minute, the next
    // one must wait until the oldest of those is a minute old.
    if (this.grantedAt.length >= perMinute) {
      const oldestInWindow = this.grantedAt[this.grantedAt.length - perMinute];
      earliest = Math.max(earliest, oldestInWindow + MINUTE_MS);
    }
    return earliest;
  }

  /**
   * Waits for a request slot. Returns true once the caller may send its request, or
   * false immediately if no slot opens within `maxWaitMs`.
   *
   * The slot is reserved before waiting, so two callers can never get the same slot.
   * (JavaScript runs this code on a single thread, so no locking is needed.)
   */
  async acquire(maxWaitMs: number): Promise<boolean> {
    const currentTime = this.now();
    const startAt = this.nextAllowedTime(currentTime);
    const waitMs = startAt - currentTime;
    if (waitMs > maxWaitMs) {
      return false;
    }
    this.grantedAt.push(startAt);
    if (waitMs > 0) {
      await this.sleep(waitMs);
    }
    return true;
  }
}
