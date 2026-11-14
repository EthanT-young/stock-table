"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * A company logo on the cream tile from the design. If the logo file is missing or fails
 * to load, the tile shows the ticker's first letters instead.
 *
 * "use client" (first line) makes this a browser-side component: it needs to react to the
 * image's load error, which only happens in the browser. Most components in this app run
 * only on the server.
 */
export function LogoTile({
  symbol,
  name,
  size,
}: {
  symbol: string;
  name: string;
  size: number;
}) {
  // useState is React's way to remember a value between renders; changing it re-renders.
  const [failed, setFailed] = useState(false);
  const radius = size >= 64 ? "rounded-2xl" : "rounded-xl";

  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden bg-cream ${radius}`}
      style={{ width: size, height: size }}
    >
      {failed ? (
        <span
          className="font-display font-medium text-on-gold"
          style={{ fontSize: size * 0.36 }}
          aria-label={`${name} logo`}
        >
          {symbol.slice(0, 2)}
        </span>
      ) : (
        <Image
          src={`/logos/${symbol}.svg`}
          alt={`${name} logo`}
          width={size}
          height={size}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
