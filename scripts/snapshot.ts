/**
 * Fills or refreshes the committed snapshot (src/data/snapshot.json).
 *
 *   npm run snapshot                          fill in whatever is missing
 *   npm run snapshot -- --max-age-hours=24    also refetch items older than 24 hours
 *   npm run snapshot -- --max-calls=10        stop after 10 requests (default 25)
 *
 * Needs ALPHAVANTAGE_API_KEY, either in the environment or in .env.local.
 *
 * A full snapshot takes 42 requests and the free key allows 25 a day, so run it on two
 * days. The file is saved after every successful request, so stopping early (quota,
 * Ctrl+C, network) never loses progress; the next run carries on from there.
 */

import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { AlphaVantageError, parseDailySeries } from "@/lib/alphavantage/parse";
import {
  parseListingStatus,
  parseOverview,
  parseSharesOutstanding,
} from "@/lib/alphavantage/parse-company";
import {
  buildSectorMap,
  parseEtfProfile,
  type EtfProfile,
} from "@/lib/alphavantage/sectors";
import { planSnapshotTasks, type SnapshotTask } from "@/lib/snapshot-plan";
import type { Snapshot } from "@/lib/snapshot";
import { TICKERS } from "@/lib/tickers";

const SNAPSHOT_PATH = join(process.cwd(), "src", "data", "snapshot.json");
const SYMBOLS = TICKERS.map((ticker) => ticker.symbol);
// 5 requests per minute means one every 12 seconds; a little extra for safety.
const SECONDS_BETWEEN_REQUESTS = 12.5;

/**
 * Reads `--name=value` from the command line, or returns `fallback` when it is absent.
 * Exits with an error for a value that isn't a positive number (or, with `integer`, a
 * positive whole number). Without this check "--max-calls=abc" would become NaN, and since
 * every comparison with NaN is false, the request limit would silently disappear.
 */
function option(
  name: string,
  fallback: number,
  { integer = false }: { integer?: boolean } = {},
): number {
  const prefix = `--${name}=`;
  const arg = process.argv.find((a) => a.startsWith(prefix));
  if (!arg) {
    return fallback;
  }
  const text = arg.slice(prefix.length).trim();
  const value = Number(text);
  const valid =
    text !== "" &&
    Number.isFinite(value) &&
    value > 0 &&
    (!integer || Number.isInteger(value));
  if (!valid) {
    const expected = integer ? "a positive whole number" : "a positive number";
    console.error(`--${name} must be ${expected}, got "${text}".`);
    process.exit(1);
  }
  return value;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

let requestsMade = 0;

/** Sends one request, waiting first so we stay under 5 requests per minute. */
async function request(
  apiKey: string,
  params: Record<string, string>,
): Promise<string> {
  if (requestsMade > 0) {
    await sleep(SECONDS_BETWEEN_REQUESTS * 1000);
  }
  requestsMade++;
  const url = new URL("https://www.alphavantage.co/query");
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value);
  }
  url.searchParams.set("apikey", apiKey);
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.text();
}

function describe(task: SnapshotTask): string {
  switch (task.kind) {
    case "overview-check":
      return "OVERVIEW check";
    case "listing":
      return "LISTING_STATUS";
    case "sector-etf":
      return `ETF_PROFILE ${task.etf}`;
    case "daily":
      return `TIME_SERIES_DAILY ${task.symbol}`;
    case "shares":
      return `SHARES_OUTSTANDING ${task.symbol}`;
  }
}

/** Runs one task and stores its result in `snapshot`. */
async function runTask(
  task: SnapshotTask,
  snapshot: Snapshot,
  apiKey: string,
  etfProfiles: EtfProfile[],
): Promise<void> {
  const now = Date.now();
  switch (task.kind) {
    case "overview-check": {
      const body = JSON.parse(
        await request(apiKey, { function: "OVERVIEW", symbol: "AAPL" }),
      );
      try {
        parseOverview(body);
        snapshot.overviewPremium = { fetchedAt: now, value: false };
      } catch (error) {
        if (error instanceof AlphaVantageError && error.kind === "premium") {
          snapshot.overviewPremium = { fetchedAt: now, value: true };
        } else {
          throw error;
        }
      }
      return;
    }
    case "listing": {
      const text = await request(apiKey, { function: "LISTING_STATUS" });
      for (const listing of parseListingStatus(text, SYMBOLS)) {
        snapshot.listings[listing.symbol] = { fetchedAt: now, value: listing };
      }
      return;
    }
    case "sector-etf": {
      const body = JSON.parse(
        await request(apiKey, { function: "ETF_PROFILE", symbol: task.etf }),
      );
      etfProfiles.push(parseEtfProfile(body));
      // Merge what this run has learned into the existing sector map.
      snapshot.sectors = {
        fetchedAt: now,
        value: {
          ...snapshot.sectors?.value,
          ...buildSectorMap(etfProfiles, SYMBOLS),
        },
      };
      return;
    }
    case "daily": {
      const body = JSON.parse(
        await request(apiKey, {
          function: "TIME_SERIES_DAILY",
          symbol: task.symbol,
        }),
      );
      snapshot.daily[task.symbol] = {
        fetchedAt: now,
        value: parseDailySeries(body),
      };
      return;
    }
    case "shares": {
      const body = JSON.parse(
        await request(apiKey, {
          function: "SHARES_OUTSTANDING",
          symbol: task.symbol,
        }),
      );
      snapshot.shares[task.symbol] = {
        fetchedAt: now,
        value: parseSharesOutstanding(body),
      };
      return;
    }
  }
}

async function main(): Promise<void> {
  // Check the options first, so a typo stops the script before any request is made.
  const maxCalls = option("max-calls", 25, { integer: true });
  const maxAgeHours = option("max-age-hours", Infinity);

  if (existsSync(".env.local")) {
    process.loadEnvFile(".env.local"); // Node's built-in .env reader
  }
  const apiKey = process.env.ALPHAVANTAGE_API_KEY;
  if (!apiKey) {
    throw new Error("Set ALPHAVANTAGE_API_KEY (for example in .env.local).");
  }

  const snapshot: Snapshot = JSON.parse(await readFile(SNAPSHOT_PATH, "utf8"));
  const tasks = planSnapshotTasks(
    snapshot,
    SYMBOLS,
    Date.now(),
    maxAgeHours * 60 * 60 * 1000,
  );
  console.log(
    `${tasks.length} requests needed; this run will make at most ${maxCalls}.`,
  );

  const etfProfiles: EtfProfile[] = [];
  let completed = 0;
  for (const task of tasks) {
    if (requestsMade >= maxCalls) {
      console.log(`Reached ${maxCalls} requests; run again tomorrow.`);
      break;
    }
    try {
      await runTask(task, snapshot, apiKey, etfProfiles);
      await writeFile(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2) + "\n");
      completed++;
      console.log(`  ok    ${describe(task)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`  fail  ${describe(task)}: ${message}`);
      if (error instanceof AlphaVantageError && error.kind === "rate-limit") {
        console.log("AlphaVantage says the quota is used up; stopping here.");
        break;
      }
    }
  }

  const remaining = planSnapshotTasks(
    snapshot,
    SYMBOLS,
    Date.now(),
    maxAgeHours * 60 * 60 * 1000,
  ).length;
  console.log(
    `Done: ${completed} saved, ${remaining} still needed. ` +
      (remaining > 0 ? "Run again tomorrow." : "Snapshot complete."),
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
