import Image from "next/image";

/**
 * The back of a playing card: crimson with a fine gold lattice, a gold inner border and a
 * gold spade in the middle. Shown face down while a section loads, and as the back of the
 * card that flips over to reveal it. Decorative, so screen readers skip it.
 */
export function CardBack({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`relative overflow-hidden rounded-md border border-border-strong bg-card-back ${className}`}
    >
      <div className="absolute inset-2 rounded-[3px] border border-gold/60" />
      <Image
        src="/suits/hero-spade.svg"
        alt=""
        width={34}
        height={34}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
      />
    </div>
  );
}

/**
 * A loading placeholder: the face-down card, gently breathing, with a hidden status
 * message for screen readers.
 */
export function FaceDownCard({
  label,
  className,
}: {
  label: string;
  className: string;
}) {
  return (
    <div className={className}>
      <p role="status" className="sr-only">
        {label}
      </p>
      <CardBack className="card-breathe h-full w-full" />
    </div>
  );
}
