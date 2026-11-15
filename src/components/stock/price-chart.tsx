"use client";

import { useState, useSyncExternalStore } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import {
  formatDate,
  formatPercent,
  formatShortDate,
  formatUsd,
} from "@/lib/format";
import {
  pricesInRange,
  rangeChangePercent,
  type ChartRange,
  type DailyPrice,
} from "@/lib/prices";

const RANGES: ChartRange[] = ["5D", "1M", "3M"];

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

// React calls this to listen for changes to the setting, and the returned function to stop.
function subscribeToReducedMotion(onChange: () => void): () => void {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/**
 * True when the visitor's system asks for reduced motion (then the chart doesn't animate).
 * The server has no window, so it assumes motion is fine. When the page first loads, the
 * browser renders once with that same value (so its HTML matches the server's), then
 * React switches to the real setting before the chart draws its line, so the line never
 * starts an animation it then has to cancel. After that (and when navigating within the
 * site) the setting is read directly during rendering.
 */
function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

/**
 * The colors and arrow for the range's change: up, down, or flat (exactly 0.00% once
 * rounded). Class names are written out in full so Tailwind keeps every color token.
 */
const TREND_STYLES = {
  up: {
    badge: "bg-positive-bg text-positive",
    arrow: "↗",
    line: "var(--color-positive)",
  },
  down: {
    badge: "bg-negative-bg text-negative",
    arrow: "↘",
    line: "var(--color-negative)",
  },
  flat: {
    badge: "bg-raised text-muted",
    arrow: "→",
    line: "var(--color-muted)",
  },
};

// Y-axis labels show each tick exactly, with no rounding: "70" for whole numbers, "70.25"
// for a step of 0.25. Prices have at most four decimals, so even for a nearly flat stock
// Recharts' smallest step needs six (0.000035); with up to six allowed, two different
// ticks can never print the same label. Normal price moves still show 0 to 2 decimals.
const axisPrice = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 6,
  useGrouping: false,
});

/** The box that appears when hovering over (or tapping) the chart. */
function ChartTooltip({ active, payload }: TooltipContentProps) {
  if (!active || !payload?.length) {
    return null;
  }
  const day = payload[0].payload as DailyPrice;
  return (
    <div className="rounded-xl border border-border bg-surface px-3 py-2 text-xs shadow-lg">
      <p className="text-muted">{formatDate(day.date)}</p>
      <p className="mt-0.5 text-sm font-semibold text-ink">
        {formatUsd(day.close)}
      </p>
    </div>
  );
}

/**
 * The price chart with its 5D / 1M / 3M buttons. All 100 days arrive with the page; the
 * buttons only filter them in the browser, so switching range makes no API request.
 */
export function PriceChart({
  prices,
}: {
  /** Newest first, as stored. */
  prices: DailyPrice[];
}) {
  const [range, setRange] = useState<ChartRange>("5D");
  const reducedMotion = usePrefersReducedMotion();

  const inRange = pricesInRange(prices, range);
  const change = rangeChangePercent(inRange);
  const chartData = [...inRange].reverse(); // charts draw left to right, oldest first
  const latest = prices[0];
  // The chart takes the color of the selected range: green if the price went up over it,
  // red if it went down, grey if flat, with a light tint of the same color under the line.
  // The change is rounded to two decimals first, like the percentage shown, so a -0.001%
  // change reads "0.00%" in grey rather than in red (the history table does the same).
  const rounded = change === null ? 0 : Math.round(change * 100) / 100;
  const trend =
    TREND_STYLES[rounded > 0 ? "up" : rounded < 0 ? "down" : "flat"];
  const lineColor = trend.line;

  return (
    <section className="blur-fade-in flex min-h-[374px] flex-col rounded-md border border-border bg-surface p-5 md:p-6 lg:min-h-[408px]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-label font-semibold text-muted">
            PRICE PERFORMANCE
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <p className="text-[34px] leading-none font-semibold text-ink md:text-display">
              {formatUsd(latest.close)}
            </p>
            {change !== null && (
              <p
                className={`rounded-xl px-3 py-2 text-xs font-medium ${trend.badge}`}
              >
                <span aria-hidden>{trend.arrow}&nbsp;&nbsp;</span>
                {formatPercent(change)} in {range}
              </p>
            )}
          </div>
          <p className="mt-3 text-xs text-muted">
            Daily closing price · USD · as of {formatShortDate(latest.date)}
          </p>
        </div>

        {/* aria-pressed tells screen readers which range button is selected. */}
        <div
          role="group"
          aria-label="Chart range"
          className="flex rounded-xl bg-track p-1"
        >
          {RANGES.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={option === range}
              onClick={() => setRange(option)}
              className={`w-[60px] rounded-toggle py-2 text-xs font-semibold transition-colors ${
                option === range
                  ? "bg-crimson text-on-crimson"
                  : "text-muted hover:text-ink"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>

      {/* The chart is drawn in the browser only; the table below carries the same data
          for screen readers and anyone without JavaScript, so the drawing is hidden from
          assistive technology. A fixed height avoids the page jumping when it appears.
          accessibilityLayer={false} turns off Recharts' built-in keyboard support, which
          would otherwise make the hidden drawing a Tab stop with nothing to announce. */}
      <div aria-hidden className="mt-6 w-full flex-1">
        <ComposedChart
          responsive
          accessibilityLayer={false}
          data={chartData}
          style={{ width: "100%", height: 260 }}
          margin={{ top: 8, right: 0, bottom: 0, left: 0 }}
        >
          <CartesianGrid vertical={false} stroke="var(--color-line)" />
          <XAxis
            dataKey="date"
            tickFormatter={formatShortDate}
            interval="preserveStartEnd"
            minTickGap={48}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--color-muted)", fontSize: 10 }}
          />
          <YAxis
            orientation="right"
            domain={["auto", "auto"]}
            tickCount={4}
            width={48}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--color-muted)", fontSize: 11 }}
            tickFormatter={(value: number) => axisPrice.format(value)}
          />
          <Tooltip
            content={ChartTooltip}
            cursor={{ stroke: lineColor, strokeOpacity: 0.4 }}
          />
          <Area
            dataKey="close"
            type="linear"
            stroke="none"
            fill={lineColor}
            fillOpacity={0.12}
            baseValue="dataMin"
            isAnimationActive={!reducedMotion}
          />
          <Line
            dataKey="close"
            type="linear"
            stroke={lineColor}
            strokeWidth={2.5}
            dot={false}
            activeDot={{
              r: 4,
              fill: lineColor,
              stroke: "var(--color-surface)",
            }}
            isAnimationActive={!reducedMotion}
          />
        </ComposedChart>
      </div>
    </section>
  );
}
