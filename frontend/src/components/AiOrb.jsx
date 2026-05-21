/* ── AiOrb — animated AI core status display ── */
import { Cpu, Zap } from "lucide-react";

export default function AiOrb({ label = "AI Core", value = "Live", status = "online" }) {
  return (
    <div
      className="holo-ring float-soft rounded-xl p-5"
      style={{
        background: "linear-gradient(145deg, rgba(0,212,255,0.06), rgba(124,58,237,0.04))",
        border: "1px solid var(--border-strong)",
        boxShadow: "var(--glow-neon), var(--shadow-card)",
      }}
    >
      {/* Top: label + icon */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p
            className="mono text-[10px] font-bold uppercase tracking-[.24em] mb-3"
            style={{ color: "var(--neon)" }}
          >
            {label}
          </p>
          <p
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)", fontFamily: "Space Grotesk, sans-serif" }}
          >
            {value}
          </p>
        </div>
        <div
          className="orbit-ring agent-pulse flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
          style={{
            background: "var(--neon-dim)",
            border: "1px solid var(--neon-strong)",
          }}
        >
          <Cpu size={20} style={{ color: "var(--neon)" }} />
        </div>
      </div>

      {/* Status row */}
      <div className="mt-4 flex items-center gap-2">
        <Zap size={11} style={{ color: "var(--emerald)" }} />
        <span
          className="mono text-[10px] font-semibold uppercase tracking-widest"
          style={{ color: "var(--emerald)" }}
        >
          {status}
        </span>
      </div>
    </div>
  );
}
