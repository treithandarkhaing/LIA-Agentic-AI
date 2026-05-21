import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BrainCircuit,
  CalendarCheck2,
  GraduationCap,
  HeartPulse,
  LogOut,
  Menu,
  Moon,
  Sun,
  X,
  Zap,
  Activity,
  Cpu,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth.jsx";
import { useTheme } from "../hooks/useTheme.jsx";

const nav = [
  {
    to: "/meeting",
    label: "Meeting Intelligence",
    caption: "Transcripts · Risk · Reporting",
    icon: BrainCircuit,
    status: "live",
    agent: "MeetingAgent",
  },
  {
    to: "/learning",
    label: "Content Intelligence",
    caption: "IU Generation · Briefs",
    icon: GraduationCap,
    status: "live",
    agent: "LearningAgent",
  },
  {
    to: "/wellness",
    label: "Wellness Intelligence",
    caption: "Recovery · Wellbeing",
    icon: HeartPulse,
    status: "processing",
    agent: "WellnessAgent",
  },
  {
    to: "/planner",
    label: "Planner Intelligence",
    caption: "Calendar · Priorities",
    icon: CalendarCheck2,
    status: "live",
    agent: "PlannerAgent",
  },
];

const statusConfig = {
  live:       { color: "var(--emerald)", label: "LIVE" },
  processing: { color: "var(--neon)",    label: "PROC" },
  idle:       { color: "var(--amber)",   label: "IDLE" },
};

/* ── Animated Neural Network SVG ── */
function NeuralNodes() {
  return (
    <svg
      className="absolute inset-0 w-full h-full opacity-20 pointer-events-none"
      viewBox="0 0 280 400"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      {/* Nodes */}
      {[
        [40, 80], [140, 60], [240, 100], [60, 200], [200, 180],
        [120, 300], [30, 340], [250, 320],
      ].map(([cx, cy], i) => (
        <circle
          key={i}
          cx={cx} cy={cy} r="3"
          fill="var(--neon)"
          style={{
            animation: `statusPulse ${1.5 + i * 0.3}s ease-in-out ${i * 0.2}s infinite`,
          }}
        />
      ))}
      {/* Edges */}
      {[
        [40, 80, 140, 60], [140, 60, 240, 100], [40, 80, 60, 200],
        [240, 100, 200, 180], [60, 200, 200, 180], [60, 200, 120, 300],
        [200, 180, 120, 300], [120, 300, 30, 340], [120, 300, 250, 320],
      ].map(([x1, y1, x2, y2], i) => (
        <line
          key={i}
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="var(--neon)" strokeWidth="0.5"
          strokeDasharray="4 4"
          strokeDashoffset={i * 8}
          style={{
            animation: `lineFlow ${3 + i * 0.5}s linear ${i * 0.4}s infinite`,
          }}
        />
      ))}
    </svg>
  );
}

/* ── Agent Status Dot ── */
function AgentDot({ status }) {
  const cfg = statusConfig[status] || statusConfig.idle;
  return (
    <span
      className="relative flex h-2 w-2 shrink-0"
      title={cfg.label}
    >
      <span
        className="absolute inline-flex h-full w-full rounded-full opacity-70 animate-ping"
        style={{ background: cfg.color, animationDuration: "2s" }}
      />
      <span
        className="relative inline-flex h-2 w-2 rounded-full"
        style={{ background: cfg.color }}
      />
    </span>
  );
}

/* ── Compact System Clock ── */
function SystemClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="mono text-[10px] tabular-nums" style={{ color: "var(--text-muted)" }}>
      {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
    </span>
  );
}

export default function AppLayout() {
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const sidebar = (
    <aside
      id="lia-sidebar"
      className="relative flex h-full flex-col overflow-hidden"
      style={{
        width: "var(--sidebar-width)",
        background: "var(--sidebar-bg)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Neural background art */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <NeuralNodes />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full px-4 py-5">
        {/* ── Logo ── */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="holo-ring orbit-ring flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
              style={{ background: "var(--neon-dim)" }}
            >
              <Cpu size={18} style={{ color: "var(--neon)" }} />
            </div>
            <div>
              <p className="text-[15px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
                LIA <span className="neon-text">Agentic</span> AI
              </p>
              <p className="mono text-[9px] uppercase tracking-[.22em]" style={{ color: "var(--text-muted)" }}>
                Neural Command Interface
              </p>
            </div>
          </div>
          <button
            className="lg:hidden rounded-lg p-1.5 hover:bg-white/5"
            onClick={() => setOpen(false)}
            aria-label="Close navigation"
          >
            <X size={18} style={{ color: "var(--text-secondary)" }} />
          </button>
        </div>

        {/* ── System Status Bar ── */}
        <div
          className="mb-5 flex items-center justify-between rounded-lg px-3 py-2"
          style={{ background: "var(--neon-dim)", border: "1px solid var(--border)" }}
        >
          <div className="status-live mono text-[10px]">4 AGENTS ONLINE</div>
          <SystemClock />
        </div>

        {/* ── Section Label ── */}
        <p
          className="mono mb-2 px-1 text-[9px] font-semibold uppercase tracking-[.28em]"
          style={{ color: "var(--text-muted)" }}
        >
          // Agent Modules
        </p>

        {/* ── Nav ── */}
        <nav className="space-y-1" role="navigation" aria-label="Agent modules">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 rounded-xl px-3 py-3 transition-all duration-200 ${
                  isActive ? "agent-active" : "hover:bg-white/5"
                }`
              }
              style={({ isActive }) =>
                isActive
                  ? {
                      background: "var(--neon-dim)",
                      border: "1px solid var(--border-strong)",
                      boxShadow: "var(--glow-neon)",
                    }
                  : {
                      border: "1px solid transparent",
                    }
              }
            >
              {({ isActive }) => (
                <>
                  {/* Icon */}
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-all"
                    style={{
                      background: isActive ? "var(--neon-dim)" : "rgba(255,255,255,0.04)",
                      color: isActive ? "var(--neon)" : "var(--text-secondary)",
                    }}
                  >
                    <item.icon size={16} />
                  </div>

                  {/* Text */}
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-[13px] font-semibold leading-5 truncate"
                      style={{ color: isActive ? "var(--text-primary)" : "var(--text-secondary)" }}
                    >
                      {item.label}
                    </p>
                    <p
                      className="mono text-[10px] leading-4 truncate"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {item.caption}
                    </p>
                  </div>

                  {/* Status */}
                  <AgentDot status={item.status} />
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* ── Spacer ── */}
        <div className="mt-auto" />

        {/* ── Divider ── */}
        <div className="mb-4" style={{ borderTop: "1px solid var(--border)" }} />

        {/* ── Theme Toggle ── */}
        <button
          id="theme-toggle-btn"
          className="mb-3 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all hover:bg-white/5"
          style={{ border: "1px solid var(--border)", color: "var(--text-secondary)" }}
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          <span className="text-[13px]">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
        </button>

        {/* ── User Card ── */}
        <div
          className="rounded-xl p-3"
          style={{
            background: "var(--neon-dim)",
            border: "1px solid var(--border)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
              style={{ background: "var(--neon)", color: "#020b18" }}
            >
              {(user?.full_name || user?.email || "U")[0].toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                {user?.full_name || user?.email || "Operator"}
              </p>
              <p className="mono text-[10px] truncate" style={{ color: "var(--text-muted)" }}>
                {user?.email || ""}
              </p>
            </div>
          </div>
          <button
            id="logout-btn"
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs font-semibold transition-all hover:bg-white/10"
            style={{ color: "var(--rose)" }}
            onClick={async () => {
              await logout();
              navigate("/login", { replace: true });
            }}
          >
            <LogOut size={13} />
            Logout
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div className="neural-bg min-h-screen">
      {/* Mobile hamburger */}
      <button
        id="mobile-menu-btn"
        className="fixed left-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-xl lg:hidden"
        style={{
          background: "var(--neon-dim)",
          border: "1px solid var(--border-strong)",
          color: "var(--neon)",
        }}
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
      >
        <Menu size={18} />
      </button>

      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        <div className="hidden lg:block shrink-0" style={{ width: "var(--sidebar-width)" }}>
          {sidebar}
        </div>

        {/* Mobile overlay */}
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="absolute inset-0"
              style={{ background: "rgba(2, 11, 24, 0.8)", backdropFilter: "blur(4px)" }}
              onClick={() => setOpen(false)}
            />
            <div className="relative h-full" style={{ width: "var(--sidebar-width)" }}>
              {sidebar}
            </div>
          </div>
        )}

        {/* Main content */}
        <main className="relative min-w-0 flex-1 px-5 py-6 lg:px-8 lg:py-7 thin-scroll overflow-auto">
          {/* Top bar */}
          <div className="mb-6 flex items-center justify-between gap-4">
            {/* Left: System status */}
            <div className="hidden md:flex items-center gap-3">
              <div
                className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{
                  background: "var(--emerald-dim)",
                  border: "1px solid rgba(0, 255, 163, 0.15)",
                }}
              >
                <Activity size={13} style={{ color: "var(--emerald)" }} />
                <span
                  className="mono text-[11px] font-semibold"
                  style={{ color: "var(--emerald)" }}
                >
                  ALL SYSTEMS NOMINAL
                </span>
              </div>
              <div
                className="flex items-center gap-2 rounded-xl px-3 py-2"
                style={{
                  background: "var(--violet-dim)",
                  border: "1px solid rgba(124, 58, 237, 0.18)",
                }}
              >
                <Zap size={13} style={{ color: "var(--violet)" }} />
                <span
                  className="mono text-[11px] font-semibold"
                  style={{ color: "var(--violet)" }}
                >
                  CREW ORCHESTRATION ACTIVE
                </span>
              </div>
            </div>

            {/* Right: Theme toggle pill */}
            <div className="ml-auto">
              <button
                id="topbar-theme-toggle"
                className="glass flex items-center gap-2 rounded-xl px-4 py-2 text-[13px] font-medium"
                style={{ color: "var(--text-secondary)" }}
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label="Toggle theme"
                title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              >
                {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
                <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
              </button>
            </div>
          </div>

          {/* Page content */}
          <div className="mx-auto w-full max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
