/* ── ProgressBar — neon progress indicator ── */
export default function ProgressBar({ value, color = "neon", showLabel = false }) {
  const clampedValue = Math.min(100, Math.max(0, value));

  const colorMap = {
    neon:    { bar: "var(--neon)",    glow: "0 0 10px rgba(0,212,255,0.5)" },
    violet:  { bar: "var(--violet)",  glow: "0 0 10px rgba(124,58,237,0.5)" },
    emerald: { bar: "var(--emerald)", glow: "0 0 10px rgba(0,255,163,0.4)" },
    amber:   { bar: "var(--amber)",   glow: "0 0 10px rgba(251,191,36,0.4)" },
    rose:    { bar: "var(--rose)",    glow: "0 0 10px rgba(251,75,110,0.4)" },
  };

  const c = colorMap[color] || colorMap.neon;

  return (
    <div className="space-y-1">
      {showLabel && (
        <div className="flex justify-between items-center">
          <span className="mono text-[10px]" style={{ color: "var(--text-muted)" }}>progress</span>
          <span className="mono text-[11px] font-semibold" style={{ color: c.bar }}>{clampedValue}%</span>
        </div>
      )}
      <div
        className="h-1.5 w-full overflow-hidden rounded-full"
        style={{ background: "rgba(255,255,255,0.06)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${clampedValue}%`,
            background: c.bar,
            boxShadow: c.glow,
          }}
        />
      </div>
    </div>
  );
}
