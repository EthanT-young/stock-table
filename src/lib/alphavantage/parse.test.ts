import { describe, expect, it } from "vitest";
import {
  AlphaVantageError,
  findProblem,
  parseDailySeries,
} from "@/lib/alphavantage/parse";

// The two premium messages are verbatim AlphaVantage responses captured during research
// (2026-11-13). BURST_LIMIT is rebuilt from fragments of a real rate-limit message
// (its full text was not saved), keeping the parts that matter: it mentions both
// "rate limit" and "premium plans".
const PREMIUM_ENDPOINT =
  "Thank you for using Alpha Vantage! This is a premium endpoint. You may subscribe to any of the premium plans at https://www.alphavantage.co/premium/ to instantly unlock all premium endpoints";
const PREMIUM_OUTPUTSIZE =
  "Thank you for using Alpha Vantage! The outputsize=full parameter value is a premium feature for the TIME_SERIES_DAILY endpoint. You may subscribe to any of the premium plans at https://www.alphavantage.co/premium/ to instantly unlock all premium features";
const BURST_LIMIT =
  "Thank you for using Alpha Vantage! Please consider spreading out your free API requests more sparingly (1 request per second). You may subscribe to any of the premium plans at https://www.alphavantage.co/premium/ to lift the free key rate limit (25 requests per day), raise the per-second burst limit, and instantly unlock all premium endpoints";

describe("findProblem", () => {
  it("returns null for a normal data response", () => {
    expect(
      findProblem({ "Meta Data": {}, "Time Series (Daily)": {} }),
    ).toBeNull();
  });

  it("recognises premium-only endpoints and options", () => {
    expect(findProblem({ Information: PREMIUM_ENDPOINT })?.kind).toBe(
      "premium",
    );
    expect(findProblem({ Information: PREMIUM_OUTPUTSIZE })?.kind).toBe(
      "premium",
    );
  });

  it("treats rate-limit messages as rate limits even though they mention premium plans", () => {
    expect(findProblem({ Information: BURST_LIMIT })?.kind).toBe("rate-limit");
    expect(
      findProblem({
        Note: "Our standard API rate limit is 25 requests per day.",
      })?.kind,
    ).toBe("rate-limit");
  });

  it("treats Error Message and unknown notices as errors", () => {
    expect(
      findProblem({ "Error Message": "Invalid API call. Please retry..." })
        ?.kind,
    ).toBe("error");
    expect(
      findProblem({
        Information: "The **demo** API key is for demo purposes only...",
      })?.kind,
    ).toBe("error");
  });

  it("treats non-objects as errors", () => {
    expect(findProblem(null)?.kind).toBe("error");
    expect(findProblem([1, 2])?.kind).toBe("error");
    expect(findProblem("text")?.kind).toBe("error");
  });
});

describe("parseDailySeries", () => {
  // Trimmed from a real AAPL response (2026-11-13). Keys deliberately out of order.
  const aaplDaily = {
    "Meta Data": { "2. Symbol": "AAPL", "3. Last Refreshed": "2026-11-13" },
    "Time Series (Daily)": {
      "2026-11-12": {
        "1. open": "357.8100",
        "2. high": "359.3684",
        "3. low": "354.4100",
        "4. close": "354.8800",
        "5. volume": "31874978",
      },
      "2026-11-13": {
        "1. open": "357.9600",
        "2. high": "360.8300",
        "3. low": "355.7500",
        "4. close": "356.2700",
        "5. volume": "39029552",
      },
    },
  };

  it("reads close and volume, sorted newest first", () => {
    expect(parseDailySeries(aaplDaily)).toEqual([
      { date: "2026-11-13", close: 356.27, volume: 39029552 },
      { date: "2026-11-12", close: 354.88, volume: 31874978 },
    ]);
  });

  it("throws a rate-limit error for a rate-limit body", () => {
    try {
      parseDailySeries({ Information: BURST_LIMIT });
      expect.unreachable("should have thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(AlphaVantageError);
      expect((error as AlphaVantageError).kind).toBe("rate-limit");
    }
  });

  it("throws when the series is missing or a number is malformed", () => {
    expect(() => parseDailySeries({ "Meta Data": {} })).toThrow(
      AlphaVantageError,
    );
    expect(() =>
      parseDailySeries({
        "Time Series (Daily)": {
          "2026-11-13": { "4. close": "abc", "5. volume": "1" },
        },
      }),
    ).toThrow(/close/);
  });
});
