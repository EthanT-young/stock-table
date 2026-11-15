import Image from "next/image";
import type { Suit } from "@/lib/tickers";

/**
 * A playing-card suit from the design (files in public/suits/). Spades and clubs are
 * gold, hearts and diamonds crimson. Purely decorative, so screen readers skip it.
 *
 * This is a React component: a function that receives "props" (its parameters, here
 * `suit` and `size`) and returns markup.
 */
export function SuitIcon({ suit, size }: { suit: Suit; size: number }) {
  return (
    <Image
      src={`/suits/${suit}.svg`}
      alt=""
      aria-hidden
      width={size}
      height={size}
    />
  );
}
