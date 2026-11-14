/**
 * The fixed collection of 16 companies shown on the homepage.
 *
 * This is the only hardcoded company data in the app: the ticker symbol, a short
 * display name for the homepage card, and the decorative playing-card suit.
 * Everything else about a company (official name, exchange, sector, prices...)
 * comes from AlphaVantage.
 */

/** The four playing-card suits used as decoration on the cards. */
export type Suit = "spade" | "heart" | "club" | "diamond";

export interface Ticker {
  /** Stock symbol, always uppercase, e.g. "AAPL". */
  symbol: string;
  /** Short name for the homepage card, e.g. "Apple". */
  displayName: string;
  /** Decorative suit. Assigned in list order: spade, heart, club, diamond, repeat. */
  suit: Suit;
}

// `readonly Ticker[]` is like an unmodifiable List<Ticker> in Java:
// the compiler rejects any code that tries to add, remove or replace entries.
export const TICKERS: readonly Ticker[] = [
  { symbol: "AAPL", displayName: "Apple", suit: "spade" },
  { symbol: "AMD", displayName: "Advanced Micro Devices Inc", suit: "heart" },
  { symbol: "NVDA", displayName: "NVIDIA", suit: "club" },
  { symbol: "GOOGL", displayName: "Alphabet", suit: "diamond" },
  { symbol: "AMZN", displayName: "Amazon", suit: "spade" },
  { symbol: "META", displayName: "Meta Platforms", suit: "heart" },
  { symbol: "TSLA", displayName: "Tesla", suit: "club" },
  { symbol: "JPM", displayName: "JPMorgan Chase", suit: "diamond" },
  { symbol: "V", displayName: "Visa", suit: "spade" },
  { symbol: "JNJ", displayName: "Johnson & Johnson", suit: "heart" },
  { symbol: "WMT", displayName: "Walmart", suit: "club" },
  { symbol: "KO", displayName: "Coca-Cola", suit: "diamond" },
  { symbol: "DIS", displayName: "Walt Disney", suit: "spade" },
  { symbol: "NFLX", displayName: "Netflix", suit: "heart" },
  { symbol: "XOM", displayName: "Exxon Mobil", suit: "club" },
  { symbol: "BA", displayName: "Boeing", suit: "diamond" },
];

/**
 * Looks up a ticker by symbol, ignoring case ("aapl" finds AAPL).
 * Returns undefined for symbols outside the collection; the details page
 * turns that into a 404.
 */
export function findTicker(symbol: string): Ticker | undefined {
  const wanted = symbol.toUpperCase();
  return TICKERS.find((ticker) => ticker.symbol === wanted);
}
