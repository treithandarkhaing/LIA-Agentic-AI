/* ── AgentBadge — status pill for agent identification ── */
import { Bot, Zap } from "lucide-react";

const variants = {
  default:    { bg: "var(--neon-dim)",     border: "var(--border-strong)", color: "var(--neon)" },
  processing: { bg: "var(--violet-dim)",   border: "rgba(124,58,237,0.25)", color: "var(--violet)" },
  warning:    { bg: "var(--amber-dim)",    border: "rgba(251,191,36,0.25)",  color: "var(--amber)" },
  success:    { bg: "var(--emerald-dim)",  border: "rgba(0,255,163,0.20)",   color: "var(--emerald)" },
};

export default function AgentBadge({ name, status = "Autonomous", variant = "default" }) {
  const label = String(name).replace(/([a-z])([A-Z])/g, "$1 $2");
  const v = variants[variant] || variants.default;

  return (
    <div
      className="agent-pulse inline-flex max-w-full items-center gap-2 rounded-full px-3 py-1.5"
      style={{
        background: v.bg,
        border: `1px solid ${v.border}`,
        boxShadow: `0 0 16px ${v.bg}`,
      }}
    >
      <Bot size={12} className="shrink-0" style={{ color: v.color }} />
      <span
        className="mono truncate text-[11px] font-semibold tracking-wide"
        style={{ color: "var(--text-primary)" }}
      >
        {label}
      </span>
      <span style={{ color: v.color, fontSize: 10 }}>◆</span>
      <Zap size={10} className="shrink-0" style={{ color: v.color }} />
      <span
        className="mono shrink-0 text-[10px] font-medium tracking-widest uppercase"
        style={{ color: v.color }}
      >
        {status}
      </span>
    </div>
  );
}
