"use client";

import { useEffect, useState } from "react";
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
import { BackupLabel } from "@/components/backup-label";
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

const RANGES: ChartRange[] = ["1M", "3M", "100D"];

/** True when the visitor's system asks for reduced motion (then the chart doesn't animate). */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  // useEffect runs after the component appears in the browser; window only exists there.
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

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
 * The price chart with its 1M / 3M / 100D buttons. All 100 days arrive with the page; the
 * buttons only filter them in the browser, so switching range makes no API request.
 */
export function PriceChart({
  prices,
  backupFrom,
}: {
  /** Newest first, as stored. */
  prices: DailyPrice[];
  backupFrom: number | null;
}) {
  const [range, setRange] = useState<ChartRange>("100D");
  const reducedMotion = usePrefersReducedMotion();

  const inRange = pricesInRange(prices, range);
  const change = rangeChangePercent(inRange);
  const chartData = [...inRange].reverse(); // charts draw left to right, oldest first
  const latest = prices[0];
  const rising = change !== null && change >= 0;
  // The chart takes the color of the selected range: green if the price went up over it,
  // red if it went down, with a light tint of the same color under the line. (Written out
  // in full so Tailwind keeps both color tokens.)
  const lineColor = rising ? "var(--color-positive)" : "var(--color-negative)";

  return (
    <section className="flex min-h-[374px] flex-col rounded-md border border-border bg-surface p-5 md:p-6 lg:min-h-[408px]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-label font-semibold text-muted">
              PRICE PERFORMANCE
            </p>
            <BackupLabel backupFrom={backupFrom} />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <p className="text-[34px] leading-none font-semibold text-ink md:text-display">
              {formatUsd(latest.close)}
            </p>
            {change !== null && (
              <p
                className={`rounded-xl px-3 py-2 text-xs font-medium ${
                  rising
                    ? "bg-positive-bg text-positive"
                    : "bg-negative-bg text-negative"
                }`}
              >
                <span aria-hidden>{rising ? "↗" : "↘"}&nbsp;&nbsp;</span>
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
          assistive technology. A fixed height avoids the page jumping when it appears. */}
      <div aria-hidden className="mt-6 w-full flex-1">
        <ComposedChart
          responsive
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
            tickFormatter={(value: number) => value.toFixed(0)}
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
