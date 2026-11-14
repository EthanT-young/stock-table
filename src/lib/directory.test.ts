import { describe, expect, it } from "vitest";
import {
  ALL_SECTORS,
  filterEntries,
  sectorOptions,
  type DirectoryEntry,
} from "@/lib/directory";

const entries: DirectoryEntry[] = [
  { symbol: "AAPL", displayName: "Apple", sector: "Information technology" },
  {
    symbol: "GOOGL",
    displayName: "Alphabet",
    sector: "Communication services",
  },
  {
    symbol: "AMD",
    displayName: "Advanced Micro Devices",
    sector: "Information technology",
  },
  { symbol: "TSLA", displayName: "Tesla", sector: null },
];

describe("sectorOptions", () => {
  it("counts companies per sector, in order of first appearance", () => {
    expect(sectorOptions(entries)).toEqual([
      { sector: "Information technology", count: 2 },
      { sector: "Communication services", count: 1 },
    ]);
  });

  it("leaves out companies with an unknown sector", () => {
    expect(sectorOptions([entries[3]])).toEqual([]);
  });
});

describe("filterEntries", () => {
  const symbols = (list: DirectoryEntry[]) => list.map((e) => e.symbol);

  it("returns everything for an empty search and all sectors", () => {
    expect(symbols(filterEntries(entries, "", ALL_SECTORS))).toEqual([
      "AAPL",
      "GOOGL",
      "AMD",
      "TSLA",
    ]);
  });

  it("matches company names and tickers, ignoring case and spaces", () => {
    expect(symbols(filterEntries(entries, "apple", ALL_SECTORS))).toEqual([
      "AAPL",
    ]);
    expect(symbols(filterEntries(entries, "  googl ", ALL_SECTORS))).toEqual([
      "GOOGL",
    ]);
    expect(symbols(filterEntries(entries, "MICRO", ALL_SECTORS))).toEqual([
      "AMD",
    ]);
  });

  it("matches anywhere in the name or ticker", () => {
    expect(symbols(filterEntries(entries, "pl", ALL_SECTORS))).toEqual([
      "AAPL",
    ]);
  });

  it("filters by sector", () => {
    expect(
      symbols(filterEntries(entries, "", "Information technology")),
    ).toEqual(["AAPL", "AMD"]);
  });

  it("combines search and sector", () => {
    expect(
      symbols(filterEntries(entries, "a", "Communication services")),
    ).toEqual(["GOOGL"]);
  });

  it("returns nothing when nothing matches", () => {
    expect(filterEntries(entries, "zzz", ALL_SECTORS)).toEqual([]);
  });
});
