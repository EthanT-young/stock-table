/** A grey placeholder bar with a shimmer, shown while a section's data is loading. */
export function Skeleton({ className }: { className: string }) {
  return <div aria-hidden className={`skeleton rounded-md ${className}`} />;
}
