import { describe, expect, it, vi } from "vitest";
import {
  fetchAlphaVantage,
  liveCallsEnabled,
  type ClientDeps,
  type Env,
} from "@/lib/alphavantage/client";
import { AlphaVantageError } from "@/lib/alphavantage/parse";
import { RateLimiter } from "@/lib/alphavantage/rate-limiter";

const LIVE_ENV = { ALPHAVANTAGE_API_KEY: "test-key", AV_LIVE: "true" };

/** Builds client dependencies around a fake fetch that returns `body`. */
function deps(body: string, env: Env = LIVE_ENV) {
  const fetchMock = vi.fn<typeof fetch>(async () => new Response(body));
  const limiter = new RateLimiter();
  const result: ClientDeps = {
    fetch: fetchMock,
    limiter,
    env,
  };
  return { deps: result, fetchMock, limiter };
}

describe("liveCallsEnabled", () => {
  it("is off without an API key", () => {
    expect(
      liveCallsEnabled({ AV_LIVE: "true", VERCEL_ENV: "production" }),
    ).toBe(false);
  });

  it("is on for the Vercel production site or with AV_LIVE=true", () => {
    expect(
      liveCallsEnabled({ ALPHAVANTAGE_API_KEY: "k", VERCEL_ENV: "production" }),
    ).toBe(true);
    expect(
      liveCallsEnabled({ ALPHAVANTAGE_API_KEY: "k", AV_LIVE: "true" }),
    ).toBe(true);
  });

  it("is off for local development and Vercel previews by default", () => {
    expect(
      liveCallsEnabled({ ALPHAVANTAGE_API_KEY: "k", NODE_ENV: "development" }),
    ).toBe(false);
    expect(
      liveCallsEnabled({ ALPHAVANTAGE_API_KEY: "k", VERCEL_ENV: "preview" }),
    ).toBe(false);
  });
});

describe("fetchAlphaVantage", () => {
  it("sends the parameters and the API key, and returns the body", async () => {
    const { deps: d, fetchMock } = deps('{"ok":true}');
    const text = await fetchAlphaVantage(
      { function: "TIME_SERIES_DAILY", symbol: "AAPL" },
      0,
      d,
    );
    expect(text).toBe('{"ok":true}');
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.origin + url.pathname).toBe("https://www.alphavantage.co/query");
    expect(url.searchParams.get("function")).toBe("TIME_SERIES_DAILY");
    expect(url.searchParams.get("symbol")).toBe("AAPL");
    expect(url.searchParams.get("apikey")).toBe("test-key");
  });

  it("refuses without calling the API when live calls are off", async () => {
    const { deps: d, fetchMock } = deps("{}", { ALPHAVANTAGE_API_KEY: "k" });
    await expect(fetchAlphaVantage({ function: "X" }, 0, d)).rejects.toThrow(
      AlphaVantageError,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports a rate limit when no slot is free in time", async () => {
    const { deps: d, fetchMock, limiter } = deps("{}");
    limiter.pauseFor(60_000);
    await expect(
      fetchAlphaVantage({ function: "X" }, 0, d),
    ).rejects.toMatchObject({
      kind: "rate-limit",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("pauses all calls after AlphaVantage reports a rate limit", async () => {
    const body = JSON.stringify({
      Information: "Our standard API rate limit is 25 requests per day.",
    });
    const { deps: d, limiter } = deps(body);
    const pause = vi.spyOn(limiter, "pauseFor");
    // The body is still returned; the parse step turns it into an error.
    expect(await fetchAlphaVantage({ function: "X" }, 0, d)).toBe(body);
    expect(pause).toHaveBeenCalledWith(60_000);
  });

  it("does not pause for other responses, including CSV", async () => {
    const { deps: d, limiter } = deps("symbol,name\nAAPL,Apple Inc");
    const pause = vi.spyOn(limiter, "pauseFor");
    await fetchAlphaVantage({ function: "LISTING_STATUS" }, 0, d);
    expect(pause).not.toHaveBeenCalled();
  });

  it("throws on a non-200 HTTP status", async () => {
    const { deps: d } = deps("oops");
    d.fetch = (async () =>
      new Response("oops", { status: 503 })) as typeof fetch;
    await expect(fetchAlphaVantage({ function: "X" }, 0, d)).rejects.toThrow(
      /503/,
    );
  });
});
