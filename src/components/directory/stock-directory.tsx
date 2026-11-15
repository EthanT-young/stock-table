"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { DealButton } from "@/components/directory/deal-button";
import { StockCard } from "@/components/stock-card";
import { ALL_SECTORS, filterEntries, sectorOptions } from "@/lib/directory";
import { NOT_AVAILABLE } from "@/lib/format";
import type { Ticker } from "@/lib/tickers";

/**
 * The keyboard shortcut label for this computer: "⌘ K" on Apple devices, "Ctrl K"
 * elsewhere. useSyncExternalStore reads a browser-only value safely: the server (which
 * has no browser) renders the design's "⌘ K", and the browser then shows the right one.
 */
function useShortcutLabel(): string {
  return useSyncExternalStore(
    () => () => {}, // the value never changes, so there is nothing to subscribe to
    () => (/Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘ K" : "Ctrl K"),
    () => "⌘ K",
  );
}

/**
 * One company card's data: the ticker (symbol, name, suit) plus its displayed sector.
 * It also has every field filterEntries needs (symbol, displayName, sector), so it can be
 * filtered directly.
 */
export interface DirectoryItem extends Ticker {
  /** Sector label as displayed (e.g. "Information technology"), or null if unknown. */
  sector: string | null;
}

/** A sector filter chip. `aria-pressed` tells screen readers whether it is selected. */
function SectorChip({
  label,
  count,
  selected,
  onSelect,
}: {
  label: string;
  count: number;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`h-9 shrink-0 rounded-chip px-3 text-label font-medium whitespace-nowrap transition-colors ${
        selected
          ? "bg-chip-active-bg text-crimson"
          : "border border-chip-border bg-chip-bg text-ivory hover:bg-crimson"
      }`}
    >
      {label}&nbsp;&nbsp;{count}
    </button>
  );
}

/**
 * The homepage's discovery bar and the company collection it filters.
 *
 * It runs in the browser because it reacts to typing and clicks: `query` and `sector`
 * are its state, and every change re-renders the list with filterEntries(). No request is
 * made; all 16 companies are already on the page.
 */
export function StockDirectory({ items }: { items: DirectoryItem[] }) {
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState(ALL_SECTORS);
  const shortcut = useShortcutLabel();
  // useRef holds a reference to the search box element so the shortcut can focus it.
  const searchRef = useRef<HTMLInputElement>(null);

  // ⌘K (Mac) or Ctrl+K (Windows, Linux) jumps to the search box from anywhere on the page.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault(); // stop the browser's own shortcut
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown); // clean up on unmount
  }, []);

  const sectors = sectorOptions(items);
  const shown = filterEntries(items, query, sector);
  const filtered = query.trim() !== "" || sector !== ALL_SECTORS;

  function clearFilters() {
    setQuery("");
    setSector(ALL_SECTORS);
    // The button disappears once the cards are back, which would drop keyboard focus to
    // the top of the page; put it in the search box the user was just using instead.
    searchRef.current?.focus();
  }

  return (
    <>
      <section
        aria-labelledby="discovery-heading"
        className="mt-4 rounded-md border border-border-strong bg-crimson-gradient p-5 md:mt-6 md:px-6"
      >
        <div className="flex flex-col gap-4 xl:grid xl:grid-cols-[1fr_minmax(0,566px)_292px] xl:items-start">
          <div>
            {/* The homepage's main heading (h1); the collection below is an h2 under it. */}
            <h1
              id="discovery-heading"
              className="font-display text-[24px] text-ivory md:text-[27px]"
            >
              Find your next company.
            </h1>
          </div>

          <div className="relative xl:mt-0.5">
            <label htmlFor="company-search" className="sr-only">
              Search by company or ticker
            </label>
            <Image
              src="/icons/search.svg"
              alt=""
              aria-hidden
              width={20}
              height={20}
              className="pointer-events-none absolute top-3 left-3.5"
            />
            <input
              id="company-search"
              ref={searchRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.key === "Escape" && setQuery("")}
              placeholder="Search by company or ticker"
              autoComplete="off"
              className="h-11 w-full rounded-md border border-input-border bg-white pr-3 pl-11 text-small text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ivory sm:pr-16"
            />
            <kbd className="pointer-events-none absolute top-2.5 right-2.5 hidden rounded bg-kbd px-1.5 py-1 font-sans text-micro font-medium text-muted sm:block">
              {shortcut}
            </kbd>
          </div>

          <DealButton />
        </div>

        <p className="mt-5 text-micro font-semibold tracking-[0.8px] text-ivory">
          BROWSE BY SECTOR
        </p>
        {/* On phones the chips scroll sideways; on wider screens they wrap. */}
        <div
          role="group"
          aria-label="Browse by sector"
          className="-mx-5 mt-3 flex gap-3 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0"
        >
          <SectorChip
            label="All"
            count={items.length}
            selected={sector === ALL_SECTORS}
            onSelect={() => setSector(ALL_SECTORS)}
          />
          {sectors.map((option) => (
            <SectorChip
              key={option.sector}
              label={option.sector}
              count={option.count}
              selected={sector === option.sector}
              onSelect={() => setSector(option.sector)}
            />
          ))}
        </div>
      </section>

      {/* scroll-mt keeps the heading visible when "Explore stocks" jumps here */}
      <section id="collection" className="mt-7 scroll-mt-6 pb-12 md:mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          {/* tabIndex={-1}: not a Tab stop, but the "Explore stocks" link can move focus here. */}
          <h2
            id="collection-heading"
            tabIndex={-1}
            className="font-display text-[24px] text-crimson md:text-h2"
          >
            The company collection
          </h2>
          {/* aria-live: screen readers announce the new count after each search or filter */}
          <p aria-live="polite" className="text-small font-medium text-muted">
            {filtered
              ? `Showing ${shown.length} of ${items.length} companies`
              : `${items.length} companies  /  ${sectors.length} sectors`}
          </p>
        </div>

        {shown.length > 0 ? (
          <ul className="mt-6 grid gap-2.5 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
            {shown.map((item) => (
              <li key={item.symbol}>
                <StockCard
                  ticker={item}
                  sector={item.sector ?? NOT_AVAILABLE}
                />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-6 rounded-md border border-border bg-surface p-8 text-center">
            <p className="text-body text-ink">
              No companies match your search.
            </p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-4 rounded-xl bg-crimson px-4 py-2.5 text-sm font-semibold text-on-crimson"
            >
              Clear search and filters
            </button>
          </div>
        )}
      </section>
    </>
  );
}
