import { describe, expect, it } from "vitest";
import { RateLimiter, type RateLimits } from "@/lib/alphavantage/rate-limiter";

/** A fake clock: time only moves when the limiter sleeps or the test advances it. */
function fakeClock() {
  let time = 1_000_000;
  return {
    now: () => time,
    sleep: async (ms: number) => {
      time += ms;
    },
    advance: (ms: number) => {
      time += ms;
    },
  };
}

const LIMITS: RateLimits = { perDay: 25, perMinute: 5, minSpacingMs: 1100 };
const NO_WAIT = 0;
const LONG_WAIT = 10 * 60_000;

describe("RateLimiter", () => {
  it("grants the first request immediately", async () => {
    const clock = fakeClock();
    const limiter = new RateLimiter(LIMITS, clock.now, clock.sleep);
    expect(await limiter.acquire(NO_WAIT)).toBe(true);
  });

  it("spaces requests at least 1.1 seconds apart", async () => {
    const clock = fakeClock();
    const limiter = new RateLimiter(LIMITS, clock.now, clock.sleep);
    const start = clock.now();
    await limiter.acquire(LONG_WAIT);
    await limiter.acquire(LONG_WAIT);
    expect(clock.now() - start).toBe(1100);
  });

  it("refuses when the wait would be longer than the caller allows", async () => {
    const clock = fakeClock();
    const limiter = new RateLimiter(LIMITS, clock.now, clock.sleep);
    await limiter.acquire(NO_WAIT);
    expect(await limiter.acquire(1000)).toBe(false); // needs 1100 ms
    expect(await limiter.acquire(3000)).toBe(true);
  });

  it("allows 5 requests in a minute, then makes the 6th wait for the window", async () => {
    const clock = fakeClock();
    const limiter = new RateLimiter(LIMITS, clock.now, clock.sleep);
    const start = clock.now();
    for (let i = 0; i < 5; i++) {
      expect(await limiter.acquire(3000)).toBe(true);
    }
    // The 6th would have to wait until the first is a minute old: refused at 3 s.
    expect(await limiter.acquire(3000)).toBe(false);
    // With enough patience it goes through exactly one minute after the first.
    expect(await limiter.acquire(LONG_WAIT)).toBe(true);
    expect(clock.now() - start).toBe(60_000);
  });

  it("stops after 25 requests in a day", async () => {
    const clock = fakeClock();
    const limiter = new RateLimiter(LIMITS, clock.now, clock.sleep);
    for (let i = 0; i < 25; i++) {
      expect(await limiter.acquire(LONG_WAIT)).toBe(true);
    }
    expect(await limiter.acquire(LONG_WAIT)).toBe(false);
    clock.advance(24 * 60 * 60_000); // a day after the first request
    expect(await limiter.acquire(LONG_WAIT)).toBe(true);
  });

  it("grants nothing while paused, then resumes", async () => {
    const clock = fakeClock();
    const limiter = new RateLimiter(LIMITS, clock.now, clock.sleep);
    limiter.pauseFor(60_000);
    expect(await limiter.acquire(3000)).toBe(false);
    clock.advance(60_000);
    expect(await limiter.acquire(NO_WAIT)).toBe(true);
  });

  it("never gives two waiting callers the same slot", async () => {
    const clock = fakeClock();
    const startTimes: number[] = [];
    // Record when each caller is released instead of moving the clock.
    const limiter = new RateLimiter(LIMITS, clock.now, async (ms) => {
      startTimes.push(clock.now() + ms);
    });
    await Promise.all([
      limiter.acquire(LONG_WAIT),
      limiter.acquire(LONG_WAIT),
      limiter.acquire(LONG_WAIT),
    ]);
    // The first goes immediately (no sleep); the others are spaced 1.1 s apart.
    expect(startTimes).toEqual([clock.now() + 1100, clock.now() + 2200]);
  });
});
