/**
 * Working out each company's sector from free AlphaVantage data.
 *
 * Sector normally comes from OVERVIEW, which is premium. Instead we use ETF_PROFILE
 * (free) on the eight "Select Sector" ETFs. Each of those funds holds the companies of
 * one sector, so a company's sector is the main sector of the fund that holds it.
 * The sector names themselves come from AlphaVantage; we only choose which funds to ask.
 */

import {
  AlphaVantageError,
  isRecord,
  throwIfProblem,
} from "@/lib/alphavantage/parse";

/** The Select Sector SPDR ETFs that together cover all 16 companies. */
export const SECTOR_ETFS: readonly string[] = [
  "XLK", // technology
  "XLC", // communication services
  "XLY", // consumer discretionary
  "XLF", // financials
  "XLV", // health care
  "XLP", // consumer staples
  "XLE", // energy
  "XLI", // industrials
];

export interface Holding {
  symbol: string;
  /** Share of the fund, 0.1436 means 14.36%. */
  weight: number;
}

export interface EtfProfile {
  /** The fund's largest sector as AlphaVantage names it, e.g. "INFORMATION TECHNOLOGY". */
  topSector: string | null;
  holdings: Holding[];
}

/** Reads a decimal string like "0.993" (anything unreadable counts as 0). */
function weightOf(value: unknown): number {
  const parsed = typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Reads an ETF_PROFILE response:
 *
 *   { "sectors":  [ { "sector": "INFORMATION TECHNOLOGY", "weight": "0.993" }, ... ],
 *     "holdings": [ { "symbol": "NVDA", "description": "NVIDIA CORP", "weight": "0.1492" }, ... ] }
 *
 * The top sector is the one with the highest weight. We don't require a minimum: the
 * financials fund reports only 0.852 for FINANCIALS. Holdings without a real symbol
 * (futures, cash funds) are listed as "n/a" and skipped.
 */
export function parseEtfProfile(body: unknown): EtfProfile {
  throwIfProblem(body);
  if (!isRecord(body) || !Array.isArray(body["holdings"])) {
    throw new AlphaVantageError({
      kind: "error",
      message: 'ETF_PROFILE response is missing "holdings".',
    });
  }

  let topSector: string | null = null;
  let topWeight = 0;
  const sectors = Array.isArray(body["sectors"]) ? body["sectors"] : [];
  for (const entry of sectors.filter(isRecord)) {
    const weight = weightOf(entry["weight"]);
    if (typeof entry["sector"] === "string" && weight > topWeight) {
      topSector = entry["sector"];
      topWeight = weight;
    }
  }

  const holdings: Holding[] = body["holdings"]
    .filter(isRecord)
    .filter((h) => typeof h["symbol"] === "string" && h["symbol"] !== "n/a")
    .map((h) => ({
      symbol: String(h["symbol"]),
      weight: weightOf(h["weight"]),
    }));

  return { topSector, holdings };
}

/**
 * Builds a lookup from company symbol to sector name, for the given symbols only.
 *
 * If a company appears in more than one fund, the fund where it has the largest weight
 * wins. Companies not found in any fund are left out, and the page shows "N/A".
 */
export function buildSectorMap(
  profiles: readonly EtfProfile[],
  symbols: readonly string[],
): Record<string, string> {
  const wanted = new Set(symbols);
  const best: Record<string, { sector: string; weight: number }> = {};

  for (const profile of profiles) {
    if (profile.topSector === null) {
      continue;
    }
    for (const holding of profile.holdings) {
      const current = best[holding.symbol];
      if (
        wanted.has(holding.symbol) &&
        (!current || holding.weight > current.weight)
      ) {
        best[holding.symbol] = {
          sector: profile.topSector,
          weight: holding.weight,
        };
      }
    }
  }

  const sectorBySymbol: Record<string, string> = {};
  for (const [symbol, choice] of Object.entries(best)) {
    sectorBySymbol[symbol] = choice.sector;
  }
  return sectorBySymbol;
}
