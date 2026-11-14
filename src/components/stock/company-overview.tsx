import { loadPrices, loadProfile } from "@/app/stock/[symbol]/data";
import { BackupLabel } from "@/components/backup-label";
import { CornerBrackets } from "@/components/corner-brackets";
import { Skeleton } from "@/components/skeleton";
import { MarketCapValue } from "@/components/stock/market-cap-value";
import { NOT_AVAILABLE, toSentenceCase } from "@/lib/format";

/** One label/value pair in the card, e.g. SECTOR / Information technology. */
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-micro font-semibold text-muted">{label}</dt>
      <dd className="mt-1 text-body font-medium text-ink">{children}</dd>
    </div>
  );
}

/**
 * The "Behind the ticker" card: description, sector, industry and market cap, each "N/A"
 * when unavailable. With a free key, a note explains why description and industry are N/A.
 */
export async function CompanyOverview({ symbol }: { symbol: string }) {
  const { value: profile, backupFrom } = await loadProfile(symbol);
  const prices = await loadPrices(symbol);
  const latestClose = prices?.value[0]?.close ?? null;

  return (
    <section className="relative flex h-full flex-col rounded-md border border-border bg-ivory-gradient p-5 md:p-6">
      <CornerBrackets size={10} inset={7} opacity={0.42} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-h4 text-crimson">Behind the ticker</h2>
        <BackupLabel backupFrom={backupFrom} />
      </div>

      <dl className="mt-5 space-y-4">
        <Field label="DESCRIPTION">
          {profile.description ? (
            <span className="font-normal">{profile.description}</span>
          ) : (
            NOT_AVAILABLE
          )}
        </Field>
        <Field label="SECTOR">
          {profile.sector ? toSentenceCase(profile.sector) : NOT_AVAILABLE}
        </Field>
        <Field label="INDUSTRY">
          {profile.industry ? toSentenceCase(profile.industry) : NOT_AVAILABLE}
        </Field>
        <Field label="MARKET CAP">
          {profile.marketCap ? (
            <MarketCapValue
              marketCap={profile.marketCap}
              latestClose={latestClose}
              id={`${symbol}-market-cap`}
            />
          ) : (
            NOT_AVAILABLE
          )}
        </Field>
      </dl>

      {profile.overviewPremium && (
        <p className="mt-6 rounded-xl bg-surface p-4 text-xs text-muted">
          Description and industry come from AlphaVantage&rsquo;s Company
          Overview, which became a premium-only endpoint in October 2026. They
          will appear automatically with a premium key.
        </p>
      )}

      <p className="mt-auto pt-5 text-label text-muted">
        {profile.overviewPremium
          ? "Sources  ·  LISTING_STATUS  ·  ETF_PROFILE  ·  SHARES_OUTSTANDING"
          : "Source  ·  OVERVIEW"}
      </p>
    </section>
  );
}

export function CompanyOverviewSkeleton() {
  return (
    <section className="fade-in-late relative h-full rounded-md border border-border bg-ivory-gradient p-5 md:p-6">
      <Skeleton className="h-7 w-48" />
      <div className="mt-6 space-y-5">
        {["w-3/4", "w-1/2", "w-2/3", "w-1/3"].map((width) => (
          <div key={width}>
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className={`mt-2 h-4 ${width}`} />
          </div>
        ))}
      </div>
    </section>
  );
}
