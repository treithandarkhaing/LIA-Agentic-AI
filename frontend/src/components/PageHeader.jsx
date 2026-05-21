/* ── PageHeader — section header with eyebrow and agent branding ── */
export default function PageHeader({ eyebrow, title, subtitle, children }) {
  return (
    <div
      className="mb-7 flex flex-col justify-between gap-4 pb-6 lg:flex-row lg:items-end"
      style={{ borderBottom: "1px solid var(--border)" }}
    >
      <div className="max-w-3xl">
        {eyebrow && (
          <p
            className="mono mb-2 text-[10px] font-bold uppercase tracking-[.28em]"
            style={{ color: "var(--neon)" }}
          >
            // {eyebrow}
          </p>
        )}
        <h1
          className="text-2xl font-bold leading-tight md:text-[2rem]"
          style={{ color: "var(--text-primary)", fontFamily: "Space Grotesk, sans-serif" }}
        >
          {title}
        </h1>
        {subtitle && (
          <p
            className="mt-2 max-w-2xl text-[13px] leading-6"
            style={{ color: "var(--text-secondary)" }}
          >
            {subtitle}
          </p>
        )}
      </div>
      {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
    </div>
  );
}
