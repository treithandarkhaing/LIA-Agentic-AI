import { useState, useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Bot, LockKeyhole, Mail, Sparkles, Cpu, Zap, Activity } from "lucide-react";
import CommandButton from "../components/CommandButton.jsx";
import { useAuth } from "../hooks/useAuth.jsx";

/* ── Animated neural particle canvas ── */
function NeuralCanvas() {
  return (
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 600 700"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="nodeGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--neon)" stopOpacity="1" />
          <stop offset="100%" stopColor="var(--neon)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Connection lines */}
      {[
        [80, 100, 250, 200], [250, 200, 420, 130], [420, 130, 530, 280],
        [250, 200, 300, 380], [300, 380, 150, 450], [300, 380, 450, 500],
        [150, 450, 80, 580], [450, 500, 530, 600], [80, 100, 150, 450],
        [420, 130, 300, 380],
      ].map(([x1, y1, x2, y2], i) => (
        <line
          key={i}
          x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="var(--neon)" strokeWidth="0.8" strokeOpacity="0.25"
          strokeDasharray="6 8"
          style={{ animation: `lineFlow ${4 + i * 0.6}s linear ${i * 0.3}s infinite` }}
        />
      ))}

      {/* Nodes */}
      {[
        [80, 100], [250, 200], [420, 130], [530, 280],
        [300, 380], [150, 450], [450, 500], [80, 580], [530, 600],
      ].map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="12" fill="var(--neon)" fillOpacity="0.05" />
          <circle
            cx={cx} cy={cy} r="3"
            fill="var(--neon)"
            fillOpacity="0.8"
            style={{ animation: `statusPulse ${2 + i * 0.4}s ease-in-out ${i * 0.25}s infinite` }}
          />
        </g>
      ))}
    </svg>
  );
}

/* ── Typewriter effect hook ── */
function useTypewriter(texts, speed = 60) {
  const [index, setIndex] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = texts[index];
    if (!deleting && charIdx < current.length) {
      const t = setTimeout(() => setCharIdx(c => c + 1), speed);
      return () => clearTimeout(t);
    }
    if (!deleting && charIdx === current.length) {
      const t = setTimeout(() => setDeleting(true), 2000);
      return () => clearTimeout(t);
    }
    if (deleting && charIdx > 0) {
      const t = setTimeout(() => setCharIdx(c => c - 1), speed / 2);
      return () => clearTimeout(t);
    }
    if (deleting && charIdx === 0) {
      setDeleting(false);
      setIndex(i => (i + 1) % texts.length);
    }
  }, [charIdx, deleting, index, texts, speed]);

  useEffect(() => {
    setDisplayed(texts[index].slice(0, charIdx));
  }, [charIdx, index, texts]);

  return displayed;
}

const agents = [
  { name: "MeetingAgent",   role: "Transcription & Risk Analysis", color: "var(--neon)" },
  { name: "LearningAgent",  role: "Content & IU Generation",        color: "var(--violet)" },
  { name: "WellnessAgent",  role: "Recovery & Wellbeing Insights",  color: "var(--emerald)" },
  { name: "PlannerAgent",   role: "Task & Calendar Orchestration",  color: "var(--amber)" },
];

const capabilities = [
  "Autonomous meeting intelligence",
  "Real-time risk detection",
  "Multi-agent orchestration",
  "IU content generation",
  "Wellness & burnout monitoring",
];

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("manager@demo.ai");
  const [password, setPassword] = useState("copilot");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const typewritten = useTypewriter(capabilities, 55);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  async function handleLogin() {
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      navigate(location.state?.from || "/", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.detail || "Authentication failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="neural-bg grid min-h-screen place-items-center px-4 py-10"
      role="main"
      aria-label="LIA Agentic AI Login"
    >
      {/* Scan line effect */}
      <div
        className="pointer-events-none fixed inset-x-0 h-px opacity-20 scan-line"
        style={{ background: "linear-gradient(90deg, transparent, var(--neon), transparent)" }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="holo-ring grid w-full max-w-6xl overflow-hidden rounded-2xl md:grid-cols-[1.1fr_0.9fr]"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border-strong)",
          boxShadow: "var(--shadow-neon)",
        }}
      >
        {/* ── LEFT: Hero Panel ── */}
        <section className="relative overflow-hidden p-8 md:p-12">
          {/* Neural background */}
          <div className="absolute inset-0 opacity-60">
            <NeuralCanvas />
          </div>

          {/* Gradient overlay */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(135deg, rgba(2,11,24,0.85) 0%, rgba(2,11,24,0.55) 100%)",
            }}
          />

          {/* Content */}
          <div className="relative z-10">
            {/* System badge */}
            <motion.div
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-8 inline-flex items-center gap-2 rounded-full px-3 py-1.5"
              style={{
                background: "var(--neon-dim)",
                border: "1px solid var(--border-strong)",
              }}
            >
              <Sparkles size={12} style={{ color: "var(--neon)" }} />
              <span className="mono text-[11px] font-bold tracking-widest uppercase" style={{ color: "var(--neon)" }}>
                AI Agent Wars · 2026
              </span>
            </motion.div>

            {/* Title */}
            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="text-4xl font-bold leading-tight md:text-5xl"
              style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--text-primary)" }}
            >
              LIA{" "}
              <span style={{ color: "var(--neon)", textShadow: "0 0 30px var(--neon-glow)" }}>
                Agentic
              </span>
              <br />Intelligence
            </motion.h1>

            {/* Typewriter */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-5 flex items-center gap-2 min-h-[28px]"
            >
              <Zap size={14} style={{ color: "var(--neon)", flexShrink: 0 }} />
              <p className="mono text-[14px]" style={{ color: "var(--neon)" }}>
                {typewritten}
                <span
                  className="inline-block w-[2px] h-[14px] ml-0.5 align-middle"
                  style={{
                    background: "var(--neon)",
                    animation: "blinkCaret 0.75s step-end infinite",
                  }}
                />
              </p>
            </motion.div>

            {/* Agent cards grid */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-10 grid grid-cols-2 gap-3"
            >
              {agents.map((agent, i) => (
                <motion.div
                  key={agent.name}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7 + i * 0.08 }}
                  className="agent-card rounded-xl p-3.5"
                  style={{ borderColor: `${agent.color}22` }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div
                      className="flex h-6 w-6 items-center justify-center rounded-lg"
                      style={{ background: `${agent.color}18`, color: agent.color }}
                    >
                      <Bot size={13} />
                    </div>
                    {/* Live dot */}
                    <span className="relative flex h-1.5 w-1.5">
                      <span
                        className="absolute inline-flex h-full w-full rounded-full animate-ping"
                        style={{ background: agent.color, opacity: 0.6 }}
                      />
                      <span
                        className="relative inline-flex h-1.5 w-1.5 rounded-full"
                        style={{ background: agent.color }}
                      />
                    </span>
                  </div>
                  <p
                    className="text-[12px] font-bold leading-tight"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {agent.name}
                  </p>
                  <p
                    className="mt-0.5 text-[10px] leading-tight"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {agent.role}
                  </p>
                </motion.div>
              ))}
            </motion.div>

            {/* System status row */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0 }}
              className="mt-8 flex items-center gap-4"
            >
              <div className="status-live mono text-[10px]">CREW ONLINE</div>
              <div className="flex items-center gap-1.5">
                <Activity size={11} style={{ color: "var(--violet)" }} />
                <span className="mono text-[10px] font-medium" style={{ color: "var(--violet)" }}>
                  ORCHESTRATION ACTIVE
                </span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── RIGHT: Login Form ── */}
        <motion.section
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="flex flex-col justify-center p-8 md:p-10"
          style={{
            background: "linear-gradient(180deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%)",
            borderLeft: "1px solid var(--border)",
          }}
        >
          {/* Header */}
          <div className="mb-8">
            <div className="mb-4 flex items-center gap-3">
              <div
                className="orbit-ring flex h-10 w-10 items-center justify-center rounded-full"
                style={{ background: "var(--neon-dim)", border: "1px solid var(--border-strong)" }}
              >
                <Cpu size={18} style={{ color: "var(--neon)" }} />
              </div>
              <div>
                <p
                  className="mono text-[9px] font-bold uppercase tracking-[.28em]"
                  style={{ color: "var(--neon)" }}
                >
                  // Neural Auth
                </p>
                <h2
                  className="text-xl font-bold"
                  style={{ color: "var(--text-primary)", fontFamily: "Space Grotesk, sans-serif" }}
                >
                  System Access
                </h2>
              </div>
            </div>
            <p className="text-[13px]" style={{ color: "var(--text-secondary)" }}>
              Authenticate to enter the LIA command interface.
            </p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Email */}
            <label className="block" htmlFor="login-email">
              <p
                className="mono mb-2 text-[10px] font-bold uppercase tracking-[.2em]"
                style={{ color: "var(--text-muted)" }}
              >
                Operator Email
              </p>
              <div
                className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all focus-within:border-[var(--neon)]"
                style={{
                  background: "var(--neon-dim)",
                  border: "1px solid var(--border)",
                }}
              >
                <Mail size={15} style={{ color: "var(--neon)" }} />
                <input
                  id="login-email"
                  className="w-full bg-transparent text-[13px] outline-none placeholder-opacity-50"
                  style={{ color: "var(--text-primary)", fontFamily: "JetBrains Mono, monospace" }}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@lia.ai"
                  autoComplete="email"
                />
              </div>
            </label>

            {/* Password */}
            <label className="block" htmlFor="login-password">
              <p
                className="mono mb-2 text-[10px] font-bold uppercase tracking-[.2em]"
                style={{ color: "var(--text-muted)" }}
              >
                Access Key
              </p>
              <div
                className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all focus-within:border-[var(--neon)]"
                style={{
                  background: "var(--neon-dim)",
                  border: "1px solid var(--border)",
                }}
              >
                <LockKeyhole size={15} style={{ color: "var(--neon)" }} />
                <input
                  id="login-password"
                  className="w-full bg-transparent text-[13px] outline-none"
                  style={{ color: "var(--text-primary)", fontFamily: "JetBrains Mono, monospace" }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                />
              </div>
            </label>

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl px-4 py-3 text-[12px] mono"
                style={{
                  background: "var(--rose-dim)",
                  border: "1px solid rgba(251,75,110,0.25)",
                  color: "var(--rose)",
                }}
              >
                ⚠ {error}
              </motion.div>
            )}

            {/* Submit */}
            <CommandButton
              id="launch-btn"
              className="w-full mt-2"
              icon={loading ? Sparkles : ArrowRight}
              onClick={handleLogin}
              disabled={loading || !email.trim() || !password}
            >
              {loading ? "Authenticating..." : "Launch Neural Interface"}
            </CommandButton>

            {/* Demo credentials note */}
            <div
              className="rounded-xl px-4 py-3 text-center"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <p className="mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                Demo: manager@demo.ai / copilot
              </p>
            </div>
          </div>
        </motion.section>
      </motion.div>
    </div>
  );
}
