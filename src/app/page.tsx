import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  StockDirectory,
  type DirectoryItem,
} from "@/components/directory/stock-directory";
import { toSentenceCase } from "@/lib/format";
import { snapshot } from "@/lib/snapshot";
import { TICKERS } from "@/lib/tickers";

/**
 * The homepage: a fixed collection of 16 companies.
 *
 * It makes no API requests. Sectors come from the committed snapshot, the same source the
 * details pages use, so a card and its details page always agree. Next.js renders this
 * page once at build time and serves it as static HTML; the search and sector filters
 * then run in the browser (see StockDirectory).
 */
export default function HomePage() {
  // Everything the browser-side directory needs, prepared here on the server.
  const items: DirectoryItem[] = TICKERS.map((ticker) => {
    const sector = snapshot.sector(ticker.symbol);
    // `...ticker` copies the ticker's fields (symbol, displayName, suit) into the new object.
    return { ...ticker, sector: sector ? toSentenceCase(sector) : null };
  });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1440px] px-5 md:px-16">
        <StockDirectory items={items} />
      </main>
      <SiteFooter />
    </>
  );
}
