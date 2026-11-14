import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Skeleton } from "@/components/skeleton";
import {
  CompanyIdentity,
  CompanyIdentitySkeleton,
} from "@/components/stock/company-identity";
import {
  CompanyOverview,
  CompanyOverviewSkeleton,
} from "@/components/stock/company-overview";
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
          <Link href="/" className="text-sm font-medium text-gold">
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
          <section className="order-1 min-h-[374px] rounded-xl border border-border bg-surface p-6 lg:min-h-[408px]">
            <p className="text-label font-semibold text-muted">
              PRICE PERFORMANCE
            </p>
            <Skeleton className="mt-6 h-10 w-40" />
            <Skeleton className="mt-8 h-48 w-full" />
          </section>

          <div className="order-3 lg:order-2">
            <Suspense fallback={<CompanyOverviewSkeleton />}>
              <CompanyOverview symbol={ticker.symbol} />
            </Suspense>
          </div>

          <section className="order-2 rounded-xl border border-border bg-surface p-6 lg:order-3 lg:col-span-2">
            <h2 className="font-display text-h3 text-cream">Daily history</h2>
            <div className="mt-6 space-y-3">
              {[0, 1, 2, 3, 4].map((row) => (
                <Skeleton key={row} className="h-4 w-full" />
              ))}
            </div>
          </section>
        </div>

        <section className="mt-8 rounded-xl bg-burgundy p-5 text-cream">
          <h2 className="text-lg font-semibold">
            A focused window, not a live feed.
          </h2>
          <p className="mt-2 text-xs">
            Prices are the latest 100 trading days from AlphaVantage. 1M, 3M and
            100D filter this same data in your browser. Not financial advice.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
