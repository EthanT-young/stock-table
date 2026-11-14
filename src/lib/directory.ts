/**
 * Search and sector filtering for the homepage's company collection.
 * Pure functions, so the rules are easy to test and reason about.
 */

/** One company as the homepage shows it. */
export interface DirectoryEntry {
  symbol: string;
  displayName: string;
  /** Sector label as displayed (e.g. "Information technology"), or null if unknown. */
  sector: string | null;
}

/** "All" plus each sector that appears, in the order the companies list them. */
export interface SectorOption {
  sector: string;
  count: number;
}

/** Selecting this shows every company. */
export const ALL_SECTORS = "all";

/**
 * The sector filter options with how many companies each has, in order of first
 * appearance in the list. Companies with an unknown sector only appear under "All".
 */
export function sectorOptions(
  entries: readonly DirectoryEntry[],
): SectorOption[] {
  const counts = new Map<string, number>(); // a Map remembers insertion order
  for (const entry of entries) {
    if (entry.sector !== null) {
      counts.set(entry.sector, (counts.get(entry.sector) ?? 0) + 1);
    }
  }
  return [...counts].map(([sector, count]) => ({ sector, count }));
}

/**
 * Companies matching the search text and the selected sector.
 *
 * The search ignores case and surrounding spaces, and matches anywhere in the company
 * name or the ticker: "apple", "AAPL" and "pl" all find Apple. An empty search matches
 * everything.
 */
export function filterEntries(
  entries: readonly DirectoryEntry[],
  query: string,
  sector: string,
): DirectoryEntry[] {
  const needle = query.trim().toLowerCase();
  return entries.filter((entry) => {
    const inSector = sector === ALL_SECTORS || entry.sector === sector;
    const matchesQuery =
      needle === "" ||
      entry.displayName.toLowerCase().includes(needle) ||
      entry.symbol.toLowerCase().includes(needle);
    return inSector && matchesQuery;
  });
}
