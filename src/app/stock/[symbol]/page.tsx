import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  CompanyIdentity,
  CompanyIdentitySkeleton,
} from "@/components/stock/company-identity";
import {
  CompanyOverview,
  CompanyOverviewSkeleton,
} from "@/components/stock/company-overview";
import { PricePerformance } from "@/components/stock/price-performance";
import {
  PriceHistory,
  PriceHistorySkeleton,
} from "@/components/stock/price-history";
import { RouletteLoader } from "@/components/stock/roulette-loader";
import { findTicker } from "@/lib/tickers";

// Render on every request: prices change daily and our own cache (src/lib/alphavantage)
// decides when to call AlphaVantage, so Next.js shouldn't store finished pages.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: PageProps<"/stock/[symbol]">): Promise<Metadata> {
  const { symbol } = await params;
  const ticker = findTicker(symbol);
  return {
    title: ticker
      ? `${ticker.symbol} · Test Design`
      : "Not found · Test Design",
  };
}

/**
 * The details page for one company, at /stock/AAPL etc.
 *
 * `params` holds the parts of the URL in [brackets]; here, the symbol. Each section is
 * wrapped in <Suspense>: React sends the page straight away with the section's
 * placeholder, then streams in the real section as soon as its data is ready. Sections
 * don't wait for each other.
 */
export default async function StockPage({
  params,
}: PageProps<"/stock/[symbol]">) {
  const { symbol } = await params;
  const ticker = findTicker(symbol);
  if (!ticker) {
    notFound(); // shows not-found.tsx with HTTP status 404
  }
  if (symbol !== ticker.symbol) {
    redirect(`/stock/${ticker.symbol}`); // e.g. /stock/aapl -> /stock/AAPL
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-[1440px] px-5 pb-12 md:px-16">
        <div className="mt-5 flex items-center justify-between md:mt-8">
          <Link href="/" className="text-sm font-medium text-crimson">
            ←&nbsp;&nbsp;All companies
          </Link>
          <p className="hidden text-small text-muted md:block">
            Explore&nbsp;&nbsp;/&nbsp;&nbsp;{ticker.symbol}
          </p>
        </div>

        <div className="mt-6 md:mt-9">
          <Suspense fallback={<CompanyIdentitySkeleton />}>
            <CompanyIdentity symbol={ticker.symbol} />
          </Suspense>
        </div>

        {/* Phones stack chart, history, overview; wide screens put the overview beside
            the chart and the history below both. `order-*` sets the visual order. */}
        <div className="mt-6 grid gap-6 md:mt-9 lg:grid-cols-[1fr_422px]">
          <div className="order-1">
            <Suspense fallback={<RouletteLoader symbol={ticker.symbol} />}>
              <PricePerformance symbol={ticker.symbol} />
            </Suspense>
          </div>

          <div className="order-3 lg:order-2">
            <Suspense fallback={<CompanyOverviewSkeleton />}>
              <CompanyOverview symbol={ticker.symbol} />
            </Suspense>
          </div>

          <div className="order-2 lg:order-3 lg:col-span-2">
            <Suspense fallback={<PriceHistorySkeleton />}>
              <PriceHistory symbol={ticker.symbol} />
            </Suspense>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
