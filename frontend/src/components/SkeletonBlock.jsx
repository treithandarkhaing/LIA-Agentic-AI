/* ── SkeletonBlock — loading placeholder ── */
export default function SkeletonBlock({ className = "h-4 w-full" }) {
  return (
    <div
      className={`skeleton rounded-lg ${className}`}
      aria-hidden="true"
    />
  );
}
