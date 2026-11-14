import { loadProfile } from "@/app/stock/[symbol]/data";
import { LogoTile } from "@/components/logo-tile";
import { Skeleton } from "@/components/skeleton";
import { NOT_AVAILABLE, toSentenceCase } from "@/lib/format";

/**
 * The company header: logo, name, "SYMBOL · EXCHANGE · ASSET TYPE", and chips for the
 * sector and (only when OVERVIEW provides it) the country.
 *
 * This is an async server component: it runs on the server, waits for the data, and sends
 * finished HTML. While it waits, the page shows <CompanyIdentitySkeleton /> instead.
 */
export async function CompanyIdentity({ symbol }: { symbol: string }) {
  const { value: profile } = await loadProfile(symbol);
  const name = profile.name ?? NOT_AVAILABLE;

  return (
    <div>
      <div className="flex items-start gap-4">
        <LogoTile symbol={symbol} name={name} size={64} />
        <div className="min-w-0">
          <h1 className="font-display text-[30px] leading-tight text-cream md:text-display">
            {name}
          </h1>
          <p className="mt-1 text-xs font-medium text-muted md:text-small">
            {symbol}&nbsp;&nbsp;·&nbsp;&nbsp;{profile.exchange ?? NOT_AVAILABLE}
            &nbsp;&nbsp;·&nbsp;&nbsp;{profile.assetType ?? NOT_AVAILABLE}
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2.5">
        <p className="rounded-xl bg-raised px-3 py-2 text-xs font-medium text-gold">
          {profile.sector
            ? toSentenceCase(profile.sector)
            : `Sector ${NOT_AVAILABLE}`}
        </p>
        {profile.country && (
          <p className="rounded-xl bg-positive-bg px-3 py-2 text-xs font-medium text-positive">
            {profile.country}
          </p>
        )}
      </div>
    </div>
  );
}

export function CompanyIdentitySkeleton() {
  return (
    <div className="fade-in-late">
      <div className="flex items-start gap-4">
        <Skeleton className="size-16 rounded-2xl" />
        <div className="flex-1">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="mt-3 h-3 w-48" />
        </div>
      </div>
      <Skeleton className="mt-4 h-8 w-32 rounded-xl" />
    </div>
  );
}
