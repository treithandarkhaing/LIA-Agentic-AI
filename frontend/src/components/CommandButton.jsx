/* ── CommandButton — primary CTA for agentic actions ── */
export default function CommandButton({ children, icon: Icon, className = "", variant = "primary", ...props }) {
  const styles = {
    primary: {
      background: "linear-gradient(135deg, var(--neon) 0%, rgba(0, 180, 220, 0.9) 100%)",
      border: "1px solid var(--neon-strong)",
      color: "#020b18",
      boxShadow: "0 0 24px var(--neon-glow), 0 4px 12px rgba(0,0,0,0.3)",
    },
    ghost: {
      background: "var(--neon-dim)",
      border: "1px solid var(--border-strong)",
      color: "var(--neon)",
      boxShadow: "none",
    },
    danger: {
      background: "var(--rose-dim)",
      border: "1px solid rgba(251,75,110,0.3)",
      color: "var(--rose)",
      boxShadow: "none",
    },
  };

  const s = styles[variant] || styles.primary;

  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold tracking-wide transition-all duration-200 hover:-translate-y-0.5 hover:shadow-neon-sm active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${className}`}
      style={s}
      {...props}
    >
      {Icon && <Icon size={15} />}
      <span>{children}</span>
    </button>
  );
}
