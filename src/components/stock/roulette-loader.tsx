import Image from "next/image";
import { TICKERS } from "@/lib/tickers";

const SIZE = 260;
const RADIUS = SIZE / 2;
const POCKET_RADIUS = RADIUS - 6; // leaves a gold rim
const POCKET_DEG = 360 / TICKERS.length;
const FULL_TURNS = 5;

/** How long a landing spin takes. Must match the 2.6s in the roulette animations in globals.css. */
export const ROULETTE_SPIN_MS = 2600;

/** A point on the wheel at `angleDeg` (0 = top, clockwise) and distance `r` from the centre. */
function point(angleDeg: number, r: number): [number, number] {
  const radians = (angleDeg * Math.PI) / 180;
  return [RADIUS + r * Math.sin(radians), RADIUS - r * Math.cos(radians)];
}

/** SVG path for the wedge-shaped pocket at `index`. */
function pocketPath(index: number): string {
  const [x0, y0] = point(index * POCKET_DEG, POCKET_RADIUS);
  const [x1, y1] = point((index + 1) * POCKET_DEG, POCKET_RADIUS);
  return `M ${RADIUS},${RADIUS} L ${x0},${y0} A ${POCKET_RADIUS} ${POCKET_RADIUS} 0 0 1 ${x1},${y1} Z`;
}

/** The ticker label inside a pocket, rotated to point at the centre. */
function PocketLabel({ index, color }: { index: number; color: string }) {
  const middle = (index + 0.5) * POCKET_DEG;
  const [x, y] = point(middle, POCKET_RADIUS - 22);
  return (
    <text
      x={x}
      y={y}
      fill={color}
      fontSize={9}
      fontWeight={600}
      textAnchor="middle"
      dominantBaseline="middle"
      transform={`rotate(${middle} ${x} ${y})`}
    >
      {TICKERS[index].symbol}
    </text>
  );
}

/**
 * The roulette wheel with one pocket per company. The animation itself is CSS (see
 * globals.css), so it starts as soon as the wheel appears, with no JavaScript needed.
 * Decorative: screen readers skip it.
 *
 * Two ways to use it:
 *   - With `landOn` (the "Spin for a company" overlay): it spins, slows down and stops
 *     with that company's pocket under the pointer, which then turns gold, and the
 *     caption changes to "Dealing AAPL…".
 *   - Without `landOn` (the chart's loading state): it keeps spinning at a steady speed
 *     for as long as it is on screen. The page can't know in advance how long the data
 *     will take, so a wheel that stopped early would look finished while still loading.
 */
export function RouletteWheel({
  landOn,
  reducedMotionCaption,
}: {
  /** Symbol of the company to land on. Leave out to keep spinning. */
  landOn?: string;
  /** Caption for visitors who switched off animations (the wheel is shown standing still). */
  reducedMotionCaption: string;
}) {
  const index = Math.max(
    0,
    TICKERS.findIndex((ticker) => ticker.symbol === landOn),
  );
  // Final wheel rotation: some full turns, ending with this pocket's centre at the top.
  const landingDeg = FULL_TURNS * 360 + (360 - (index + 0.5) * POCKET_DEG);

  return (
    <div
      aria-hidden
      className={`flex flex-col items-center ${landOn ? "" : "roulette-looping"}`}
    >
      <div className="relative" style={{ width: SIZE, height: SIZE }}>
        {/* Pointer */}
        <div className="absolute -top-1.5 left-1/2 z-10 -translate-x-1/2 border-x-8 border-t-[14px] border-x-transparent border-t-gold-rim" />

        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="roulette-wheel"
          style={{ "--land": `${landingDeg}deg` } as React.CSSProperties}
        >
          <circle
            cx={RADIUS}
            cy={RADIUS}
            r={RADIUS - 1}
            fill="var(--color-gold-rim)"
          />
          {TICKERS.map((ticker, i) => (
            <g key={ticker.symbol}>
              <path
                d={pocketPath(i)}
                fill={
                  i % 2 === 0
                    ? "var(--color-roulette-red)"
                    : "var(--color-roulette-black)"
                }
                stroke="var(--color-gold-rim)"
              />
              <PocketLabel index={i} color="var(--color-ivory)" />
            </g>
          ))}
          {/* This company's pocket, turned gold once the wheel has landed. */}
          {landOn && (
            <g className="roulette-after-landing">
              <path
                d={pocketPath(index)}
                fill="var(--color-gold-light)"
                stroke="var(--color-gold-rim)"
              />
              <PocketLabel index={index} color="var(--color-on-gold)" />
            </g>
          )}
          <circle
            cx={RADIUS}
            cy={RADIUS}
            r={34}
            fill="var(--color-surface)"
            stroke="var(--color-gold-rim)"
            strokeWidth={2}
          />
        </svg>

        {/* Ball: circles the other way (and, when landing, settles above the pocket). */}
        <div className="roulette-ball absolute inset-0">
          <div className="absolute top-[5px] left-1/2 size-3 -translate-x-1/2 rounded-full bg-ivory shadow-[0_0_6px_var(--color-gold-rim)]" />
        </div>

        <Image
          src="/suits/spade.svg"
          alt=""
          width={26}
          height={26}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
        />
      </div>

      {/* The captions share one spot and swap when the wheel lands. */}
      <p className="mt-5 grid text-small text-muted">
        <span className="roulette-before-landing col-start-1 row-start-1">
          Place your bets…
        </span>
        {landOn && (
          <span className="roulette-after-landing roulette-caption col-start-1 row-start-1">
            Dealing {landOn}…
          </span>
        )}
        <span className="roulette-reduced-motion col-start-1 row-start-1">
          {reducedMotionCaption}
        </span>
      </p>
    </div>
  );
}

/**
 * The chart's loading state: the roulette, spinning until the chart's data is ready.
 * React removes it as soon as the chart can be shown. It fades in after 0.3 s so fast
 * loads never show it.
 */
export function RouletteLoader({ symbol }: { symbol: string }) {
  return (
    <section className="flex min-h-[374px] flex-col rounded-md border border-border bg-surface p-6 lg:min-h-[408px]">
      <h2 className="text-label font-semibold text-muted uppercase">
        Price performance
      </h2>
      <p role="status" className="sr-only">
        Loading the price chart for {symbol}
      </p>
      <div className="fade-in-late flex flex-1 items-center justify-center py-4">
        <RouletteWheel reducedMotionCaption="Loading…" />
      </div>
    </section>
  );
}
