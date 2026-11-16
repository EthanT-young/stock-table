# Stock Table

A small stock browser built with React (Next.js) and the
[AlphaVantage](https://www.alphavantage.co/) API. The homepage shows 16 well-known
companies; each one opens a details page with the company profile, a price chart and
100 trading days of price history.

Live demo: https://stock-table-omega.vercel.app

## Running it locally

Requires Node.js 26.

```bash
npm install
npm run dev
```

Then open http://localhost:3000.

No API key is needed to try it. The repo includes a snapshot of real AlphaVantage
responses (`src/data/snapshot.json`), and the app falls back to it whenever it can't or
shouldn't call the API. To use the live API locally, create `.env.local`:

```bash
ALPHAVANTAGE_API_KEY=your_key
AV_LIVE=true
```

Live calls are off by default in development so that page reloads don't use up the
free key's 25 requests per day. They are always on in a production deploy on Vercel
(`VERCEL_ENV=production`).

AlphaVantage adds each day's prices after the market closes (4 PM Eastern), so on
weekends and market holidays the newest row is the last trading day. The app also keeps
prices for up to a day before asking again, so a new close can take up to a day to
appear.

## Where each requirement lives

| Requirement                                                                                                          | Where                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Homepage with 15+ stocks                                                                                             | `src/app/page.tsx`, list in `src/lib/tickers.ts`                                                                            |
| Details page per stock                                                                                               | `src/app/stock/[symbol]/page.tsx` (`/stock/AAPL`, etc.)                                                                     |
| Company overview (symbol, asset type, name, description, exchange, sector, industry, market cap, "N/A" when missing) | `src/components/stock/company-identity.tsx`, `company-overview.tsx`                                                         |
| Daily prices: date, close, volume, % change vs the previous day                                                      | `src/components/stock/price-history.tsx`, math in `src/lib/prices.ts`                                                       |
| Responsive design                                                                                                    | Tailwind breakpoints throughout; on phones the price table uses short dates and hides the volume column                     |
| Logos                                                                                                                | `public/logos/`, downloaded once from AlphaVantage's logo server (`npm run logos`)                                          |
| Loading animation                                                                                                    | Roulette wheel for the chart (`roulette-loader.tsx`), card flip for the other sections (`card-back.tsx`, `flip-reveal.tsx`) |
| Line chart                                                                                                           | `src/components/stock/price-chart.tsx` (Recharts), 5D / 1M / 3M ranges, green or red by the range's change                  |

Extras: search and sector filters on the homepage, a button that picks
a random company with the roulette wheel, a real 404 page for unknown symbols,
and lowercase URLs redirecting to uppercase (`/stock/aapl` → `/stock/AAPL`).

## Free API key constraints

The Company Overview API is premium-only, so I had to pull the company details from other free endpoints.

| Field                      | Free-key source                                                                                                                                                                                                        |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name, exchange, asset type | `LISTING_STATUS`                                                                                                                                                                                                       |
| Sector                     | `ETF_PROFILE` on the eight Select Sector SPDR funds (XLK, XLF, ...): a company's sector is the sector of the fund that holds it                                                                                        |
| Market cap                 | Estimated: shares outstanding (`SHARES_OUTSTANDING`, latest quarter) × latest close. Marked "est." with a popup explaining the calculation. AlphaVantage returns no share count for XOM, so its market cap shows "N/A" |
| Description, industry      | No free source, so shown as "N/A"                                                                                                                                                                                      |

In case the Company Overview API becomes free again, the app checks once a day whether
`OVERVIEW` works for the configured key. With a premium key, every field comes from
`OVERVIEW` and none of the workarounds run.

### Rate limits

The free key allows 25 requests per day and 5 per minute. AlphaVantage reports errors
inside normal HTTP 200 responses (`Note`, `Information` or `Error Message` fields), so
the client checks every response and sorts problems into rate-limit messages,
premium-only messages and other errors.

Three parts of `src/lib/alphavantage/` keep the app inside the limits:

- `cache.ts` keeps each result while it is current: prices for a day, listings for 7
  days, share counts for 30 days. It stores only successful responses, so an error
  message never ends up in the cache.
- `rate-limiter.ts` hands out request slots. A page waits at most 3 seconds for one,
  then uses stored data.
- `client.ts` pauses all calls for a minute after a rate-limit response or a timeout,
  so the app stops sending requests that would fail.

The app looks up each piece of data in this order (`src/lib/stock-data.ts`):

1. the cache, if the stored copy is still current
2. AlphaVantage, if live calls are on and the quota allows
3. the last cached copy, even if old
4. the committed snapshot

If none of them has data, that section shows a "not available right now" message and
the rest of the page still loads.

### The snapshot

`npm run snapshot` fills in `src/data/snapshot.json`. A full snapshot takes 42 requests,
more than one day's quota, so the script saves after every request, stops at 25 and
continues from where it left off on the next run. `--max-age-hours=24` also re-fetches
anything older than a day. The committed snapshot has prices through November 13, 2026.

## How the pages load

The details page renders on the server. Each section (header, overview, chart, table)
is wrapped in React `<Suspense>`, so the page arrives immediately with placeholders, and
each section streams in as soon as its own data is ready. While waiting, the chart shows
a spinning roulette wheel and the other sections show a face-down playing card, which
flips over when the data arrives. With "reduce motion" turned on in the operating
system, all animations are replaced by static versions.

## Accessibility

I checked the app against WCAG 2.2 level AA and fixed the issues I found. Every page
works with only a keyboard, axe (an automated checker) reports no violations, and with
"reduce motion" on, the loading animations are replaced with static versions.

## Project layout

```
src/
  app/                 pages (Next.js App Router)
    page.tsx           homepage
    stock/[symbol]/    details page and its 404
  components/          UI components
    directory/         homepage search, filters and the random-company button
    stock/             details page sections
  lib/
    alphavantage/      API client, rate limiter, cache, response parsers
    stock-data.ts      what the pages call to get data
    prices.ts          daily change, chart ranges, market cap estimate
    tickers.ts         the 16 companies (the only hardcoded company data)
  data/snapshot.json   stored AlphaVantage responses
scripts/               snapshot and logo download scripts
```

## Scripts

| Command                       | What it does                                         |
| ----------------------------- | ---------------------------------------------------- |
| `npm run dev`                 | Development server                                   |
| `npm run build` / `npm start` | Production build and server                          |
| `npm test`                    | Unit tests (Vitest)                                  |
| `npm run lint`                | ESLint                                               |
| `npm run format:check`        | Prettier check                                       |
| `npm run snapshot`            | Fill in the snapshot from AlphaVantage (needs a key) |
| `npm run logos`               | Download the company logos (no key needed)           |

## Notes

- Next.js with the App Router sends the API requests from the server, so the API key
  never reaches the browser and every visitor is served from the same cache.
- TypeScript runs in strict mode. Each API response is parsed into typed objects as
  soon as it arrives, and the rest of the code only sees those types.
- Tailwind CSS keeps the color, type and spacing tokens in one file
  (`src/app/globals.css`).
- Recharts draws the line chart. Vitest runs the unit tests for the data logic:
  parsing, caching, rate limiting, price math and filtering.
- If the app grew, I'd store prices in a database filled by a scheduled job, so visitor
  traffic would never trigger API calls and the history wouldn't depend on a cache that
  can be cleared.
