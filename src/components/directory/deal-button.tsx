"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ROULETTE_SPIN_MS,
  RouletteWheel,
} from "@/components/stock/roulette-loader";
import { TICKERS } from "@/lib/tickers";

/** Pause after the wheel lands, so the result can be seen before the page changes. */
const SHOW_RESULT_MS = 900;

/**
 * "Spin for a company": opens an overlay where the roulette spins and lands on a random
 * company from the collection, then opens that company's page.
 *
 * The overlay is a native <dialog> opened with showModal(): the browser keeps keyboard
 * focus inside it, dims the page behind it, and closes it on Esc. Closing it (Esc or the
 * Cancel button) stops the deal before anything happens.
 */
export function DealButton() {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const timers = useRef<number[]>([]);
  // The company being dealt, and a counter so each deal restarts the wheel's animation.
  const [deal, setDeal] = useState<{ symbol: string; round: number } | null>(
    null,
  );
  const [landed, setLanded] = useState(false);

  function clearTimers() {
    timers.current.forEach((id) => window.clearTimeout(id));
    timers.current = [];
  }

  // Stop any pending navigation if this component disappears.
  useEffect(() => clearTimers, []);

  function startDeal() {
    const pick = TICKERS[Math.floor(Math.random() * TICKERS.length)];
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const spinMs = reducedMotion ? 0 : ROULETTE_SPIN_MS; // no spin when motion is off

    setDeal((previous) => ({
      symbol: pick.symbol,
      round: (previous?.round ?? 0) + 1,
    }));
    setLanded(reducedMotion);
    dialogRef.current?.showModal();
    router.prefetch(`/stock/${pick.symbol}`); // start loading the page during the spin

    timers.current.push(
      window.setTimeout(() => setLanded(true), spinMs),
      window.setTimeout(
        () => router.push(`/stock/${pick.symbol}`),
        spinMs + SHOW_RESULT_MS,
      ),
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={startDeal}
        aria-haspopup="dialog"
        className="flex h-11 w-full items-center justify-center gap-3 rounded-md bg-gold-gradient text-sm font-semibold text-on-gold transition-[filter] hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ivory"
      >
        <Image
          src="/icons/random-company.svg"
          alt=""
          aria-hidden
          width={20}
          height={20}
        />
        Spin for a company
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="deal-heading"
        onClose={() => {
          clearTimers(); // closing (Esc or Cancel) cancels the deal
          setDeal(null);
        }}
        className="relative m-auto w-[min(92vw,380px)] rounded-md border border-border bg-surface p-6 text-ink shadow-2xl backdrop:bg-ink/60"
      >
        {/* Close button in the corner; the heading is centered with room on both sides. */}
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Cancel"
          className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-raised hover:text-ink"
        >
          <svg aria-hidden width="14" height="14" viewBox="0 0 14 14">
            <path
              d="M1 1l12 12M13 1L1 13"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </button>
        <h2
          id="deal-heading"
          className="px-8 text-center font-display text-h4 text-crimson"
        >
          Spinning the wheel
        </h2>

        {deal && (
          <div className="mt-6 flex justify-center">
            {/* A new key restarts the CSS animation for every deal. */}
            <RouletteWheel
              key={deal.round}
              landOn={deal.symbol}
              reducedMotionCaption={`Dealing ${deal.symbol}…`}
            />
          </div>
        )}

        {/* Screen readers hear the result once the wheel has landed. */}
        <p role="status" className="sr-only">
          {deal &&
            (landed
              ? `Dealt ${deal.symbol}. Opening its page.`
              : "Spinning the wheel.")}
        </p>
      </dialog>
    </div>
  );
}
