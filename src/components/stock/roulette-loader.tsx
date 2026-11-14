import Image from "next/image";
import { TICKERS } from "@/lib/tickers";

const SIZE = 260;
const RADIUS = SIZE / 2;
const POCKET_RADIUS = RADIUS - 6; // leaves a gold rim
const POCKET_DEG = 360 / TICKERS.length;
const FULL_TURNS = 5;

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
 * The chart's loading animation: a roulette wheel with one pocket per company. It spins,
 * slows down, and stops with this company's pocket under the pointer, which then turns
 * gold: "Dealing AAPL…". The animation itself is CSS (see globals.css), so it starts as soon
 * as the page's HTML arrives. It only exists while the chart's data is loading.
 */
export function RouletteLoader({ symbol }: { symbol: string }) {
  const index = Math.max(
    0,
    TICKERS.findIndex((ticker) => ticker.symbol === symbol),
  );
  // Final wheel rotation: some full turns, ending with this pocket's centre at the top.
  const landingDeg = FULL_TURNS * 360 + (360 - (index + 0.5) * POCKET_DEG);

  return (
    <section className="flex min-h-[374px] flex-col rounded-xl border border-border bg-surface p-6 lg:min-h-[408px]">
      <p className="text-label font-semibold text-muted">PRICE PERFORMANCE</p>
      <p role="status" className="sr-only">
        Loading the price chart for {symbol}
      </p>

      <div
        aria-hidden
        className="fade-in-late flex flex-1 flex-col items-center justify-center py-4"
      >
        <div className="relative" style={{ width: SIZE, height: SIZE }}>
          {/* Pointer */}
          <div className="absolute -top-1.5 left-1/2 z-10 -translate-x-1/2 border-x-8 border-t-[14px] border-x-transparent border-t-gold" />

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
              fill="var(--color-gold)"
            />
            {TICKERS.map((ticker, i) => (
              <g key={ticker.symbol}>
                <path
                  d={pocketPath(i)}
                  fill={
                    i % 2 === 0
                      ? "var(--color-positive-bg)"
                      : "var(--color-burgundy)"
                  }
                  stroke="var(--color-gold)"
                />
                <PocketLabel index={i} color="var(--color-cream)" />
              </g>
            ))}
            {/* This company's pocket, turned gold once the wheel has landed. */}
            <g className="roulette-after-landing">
              <path
                d={pocketPath(index)}
                fill="var(--color-gold)"
                stroke="var(--color-gold)"
              />
              <PocketLabel index={index} color="var(--color-on-gold)" />
            </g>
            <circle
              cx={RADIUS}
              cy={RADIUS}
              r={34}
              fill="var(--color-surface)"
              stroke="var(--color-gold)"
              strokeWidth={2}
            />
          </svg>

          {/* Ball: circles the other way and settles at the top, above the pocket. */}
          <div className="roulette-ball absolute inset-0">
            <div className="absolute top-[5px] left-1/2 size-3 -translate-x-1/2 rounded-full bg-cream shadow-[0_0_6px_var(--color-gold)]" />
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
            No more bets…
          </span>
          <span className="roulette-after-landing roulette-caption col-start-1 row-start-1">
            Dealing {symbol}…
          </span>
          <span className="roulette-reduced-motion col-start-1 row-start-1">
            Loading…
          </span>
        </p>
      </div>
    </section>
  );
}
