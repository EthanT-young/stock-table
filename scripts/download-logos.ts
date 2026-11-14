/**
 * Downloads the company logos into public/logos/ (run once: `npm run logos`).
 *
 * The logos come from AlphaVantage's logo server (cdn.alphavantage.co). It needs no API
 * key and does not count against the 25-requests-per-day quota. We save copies in the
 * repo so the logos load from our own site: they keep working if that server is slow
 * or down, and pages don't wait on a third-party server. A ticker without a logo file
 * falls back to an initials badge in the UI.
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { TICKERS } from "@/lib/tickers";

const OUTPUT_DIR = join(process.cwd(), "public", "logos");

async function downloadLogo(symbol: string): Promise<boolean> {
  const url = `https://cdn.alphavantage.co/logos/${symbol}.svg`;
  const response = await fetch(url);
  const contentType = response.headers.get("content-type") ?? "";
  // Missing logos come back as HTTP 403 with an XML error page, not an SVG.
  if (!response.ok || !contentType.includes("image/svg+xml")) {
    console.warn(
      `  ${symbol}: no logo (HTTP ${response.status}, ${contentType})`,
    );
    return false;
  }
  await writeFile(join(OUTPUT_DIR, `${symbol}.svg`), await response.text());
  console.log(`  ${symbol}: saved`);
  return true;
}

async function main(): Promise<void> {
  await mkdir(OUTPUT_DIR, { recursive: true });
  console.log(`Downloading ${TICKERS.length} logos to ${OUTPUT_DIR}`);
  let saved = 0;
  for (const ticker of TICKERS) {
    if (await downloadLogo(ticker.symbol)) {
      saved++;
    }
  }
  console.log(`Done: ${saved} of ${TICKERS.length} saved.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
