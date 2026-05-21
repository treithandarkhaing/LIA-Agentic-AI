/* ── StatCard — KPI metric card with neon glow ── */
import { motion } from "framer-motion";

const colorMap = {
  neon:    { bg: "var(--neon-dim)",    border: "var(--border-strong)", icon: "var(--neon)",    glow: "0 0 24px rgba(0,212,255,0.15)" },
  violet:  { bg: "var(--violet-dim)",  border: "rgba(124,58,237,0.20)", icon: "var(--violet)", glow: "0 0 24px rgba(124,58,237,0.15)" },
  emerald: { bg: "var(--emerald-dim)", border: "rgba(0,255,163,0.16)", icon: "var(--emerald)", glow: "0 0 24px rgba(0,255,163,0.12)" },
  amber:   { bg: "var(--amber-dim)",   border: "rgba(251,191,36,0.18)", icon: "var(--amber)",  glow: "0 0 24px rgba(251,191,36,0.12)" },
  rose:    { bg: "var(--rose-dim)",    border: "rgba(251,75,110,0.18)", icon: "var(--rose)",   glow: "0 0 24px rgba(251,75,110,0.12)" },
};

export default function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  trend,
  color = "neon",
  delay = 0,
}) {
  const c = colorMap[color] || colorMap.neon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className="agent-card rounded-xl p-5"
      style={{ boxShadow: `var(--shadow-card), ${c.glow}` }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p
            className="mono text-[10px] font-semibold uppercase tracking-[.2em] mb-1"
            style={{ color: "var(--text-muted)" }}
          >
            {label}
          </p>
          <p
            className="text-3xl font-bold tracking-tight"
            style={{ color: "var(--text-primary)", fontFamily: "Space Grotesk, sans-serif" }}
          >
            {value}
          </p>
          {trend && (
            <p
              className="mono mt-1 text-[11px] font-medium"
              style={{ color: c.icon }}
            >
              {trend}
            </p>
          )}
        </div>
        {/* Icon orb */}
        <div
          className="agent-pulse flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: c.bg,
            border: `1px solid ${c.border}`,
            color: c.icon,
          }}
        >
          <Icon size={20} />
        </div>
      </div>

      {/* Detail row */}
      {detail && (
        <p
          className="mt-4 text-[12px] leading-5"
          style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)", paddingTop: "12px" }}
        >
          {detail}
        </p>
      )}
    </motion.div>
  );
}
