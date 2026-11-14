import Image from "next/image";
import { DecoPanel } from "@/components/deco-panel";
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
 *
 * Phones and tablets get the crimson hero above the discovery bar; desktops show only the
 * bar, as in the design.
 */
export default function HomePage() {
  // Everything the browser-side directory needs, prepared here on the server.
  const items: DirectoryItem[] = TICKERS.map((ticker) => {
    const sector = snapshot.sector(ticker.symbol);
    return {
      ticker,
      symbol: ticker.symbol,
      displayName: ticker.displayName,
      sector: sector ? toSentenceCase(sector) : null,
    };
  });

  return (
    <>
      <SiteHeader showTagline />
      <main className="mx-auto w-full max-w-[1440px] px-5 md:px-16">
        <DecoPanel
          tone="crimson"
          className="mt-4 p-6 md:mt-6 md:p-10 lg:hidden"
        >
          <p className="text-xs font-medium tracking-[1.2px] text-ivory">
            CURATED. NOT COMPLICATED.
          </p>
          <Image
            src="/suits/hero-spade.svg"
            alt=""
            aria-hidden
            width={34}
            height={34}
            className="absolute top-0 right-0"
          />
          <h1 className="mt-8 font-display text-display leading-[49px] text-hero-heading md:text-hero md:leading-tight">
            Big companies.{" "}
            <span className="block text-hero-italic italic md:inline">
              A clearer view.
            </span>
          </h1>
          <p className="mt-6 max-w-[520px] text-sm text-ivory md:text-lead">
            Explore 16 familiar names. Get the company story, then follow the
            numbers.
          </p>
          <Image
            src="/ornaments/diamond-divider.svg"
            alt=""
            aria-hidden
            width={298}
            height={12}
            className="mt-8"
          />
        </DecoPanel>

        <StockDirectory items={items} />
      </main>
      <SiteFooter note="Fixed collection · No live data on this page" />
    </>
  );
}
