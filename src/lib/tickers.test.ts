import { describe, expect, it } from "vitest";
import { TICKERS, findTicker, type Suit } from "@/lib/tickers";

describe("TICKERS", () => {
  it("has 16 unique uppercase symbols", () => {
    const symbols = TICKERS.map((ticker) => ticker.symbol);
    expect(symbols).toHaveLength(16);
    expect(new Set(symbols).size).toBe(16);
    for (const symbol of symbols) {
      expect(symbol).toBe(symbol.toUpperCase());
    }
  });

  it("assigns suits in the repeating order spade, heart, club, diamond", () => {
    const order: Suit[] = ["spade", "heart", "club", "diamond"];
    TICKERS.forEach((ticker, index) => {
      expect(ticker.suit).toBe(order[index % 4]);
    });
  });
});

describe("findTicker", () => {
  it("finds a ticker regardless of case", () => {
    expect(findTicker("AAPL")?.displayName).toBe("Apple");
    expect(findTicker("aapl")?.displayName).toBe("Apple");
  });

  it("returns undefined for symbols outside the collection", () => {
    expect(findTicker("IBM")).toBeUndefined();
    expect(findTicker("")).toBeUndefined();
  });
});
