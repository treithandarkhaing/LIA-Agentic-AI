import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  Activity, AlertTriangle, BarChart3, BrainCircuit, Bot,
  CalendarDays, CheckCircle2, Clock, GraduationCap, HeartPulse,
  Play, Sparkles, TrendingUp, UsersRound, Zap, Network,
} from "lucide-react";
import AgentBadge from "../components/AgentBadge.jsx";
import AiOrb from "../components/AiOrb.jsx";
import CommandButton from "../components/CommandButton.jsx";
import PageHeader from "../components/PageHeader.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import StatCard from "../components/StatCard.jsx";
import { deadlines, learnerProgress, meetings, overdueTasks, productivityAnalytics, tasks, teamPerformance } from "../utils/mockData.js";

const demoSteps = [
  { label: "Analyzing tasks",             detail: "PlannerAgent scans overdue work, SLAs, meetings, and learner impact.", icon: BrainCircuit },
  { label: "Updating priorities",          detail: "Priorities are re-ranked by urgency, owner capacity, and cohort risk.", icon: TrendingUp },
  { label: "Publishing risk alerts",       detail: "Escalation paths appear for blockers that threaten delivery quality.", icon: AlertTriangle },
  { label: "Generating meeting summary",   detail: "MeetingAgent extracts decisions, owners, blockers, and deadlines.", icon: CheckCircle2 },
  { label: "Auto-generating content",      detail: "LearningAgent creates objectives, activities, quiz checks, and facilitator guidance.", icon: GraduationCap },
  { label: "Displaying wellness insights", detail: "WellnessAgent detects overload and recommends a recovery block.", icon: HeartPulse },
];

const agents = [
  { name: "PlannerAgent",  work: "Re-ranked 7 delivery tasks, detected 3 overdue actions", confidence: 92, color: "neon" },
  { name: "MeetingAgent",  work: "Prepared follow-up context for 4 stakeholder meetings",   confidence: 88, color: "violet" },
  { name: "LearningAgent", work: "Monitors 657 learners across active cohorts",             confidence: 94, color: "emerald" },
  { name: "WellnessAgent", work: "Flagged 2 overloaded operators, 1 recovery window",       confidence: 86, color: "amber" },
];

const agentIconColor = { neon: "var(--neon)", violet: "var(--violet)", emerald: "var(--emerald)", amber: "var(--amber)" };

export default function Dashboard() {
  const [demoRunning, setDemoRunning] = useState(false);
  const [demoStep, setDemoStep] = useState(-1);

  const productivityScore = Math.round(productivityAnalytics.reduce((s, i) => s + i.productivity, 0) / productivityAnalytics.length);
  const learners = learnerProgress.reduce((s, c) => s + c.learners, 0);
  const averageCompletion = Math.round(learnerProgress.reduce((s, c) => s + c.completion, 0) / learnerProgress.length);
  const aiHoursSaved = productivityAnalytics.reduce((s, i) => s + i.aiHoursSaved, 0).toFixed(1);

  const visibleTasks = useMemo(() => {
    if (demoStep < 1) return tasks.slice(0, 5);
    return [...tasks]
      .sort((a, b) => {
        const score = t => (t.status === "overdue" ? 3 : 0) + (t.priority === "High" ? 2 : t.priority === "Medium" ? 1 : 0);
        return score(b) - score(a);
      })
      .slice(0, 5);
  }, [demoStep]);

  useEffect(() => {
    if (!demoRunning) return;
    const timers = demoSteps.map((_, i) => window.setTimeout(() => setDemoStep(i), i * 1450));
    const done = window.setTimeout(() => setDemoRunning(false), demoSteps.length * 1450 + 900);
    return () => { timers.forEach(window.clearTimeout); window.clearTimeout(done); };
  }, [demoRunning]);

  function runWorkflowDemo() {
    setDemoStep(-1);
    setDemoRunning(true);
    window.setTimeout(() => setDemoStep(0), 120);
  }

  return (
    <div>
      <PageHeader
        eyebrow="Mission Control"
        title="Autonomous AI Command Center"
        subtitle="Multi-agent orchestration for learning & delivery operations — live"
      >
        <AgentBadge name="4 agents active" status={demoRunning ? "Orchestrating" : "Live scan"} variant={demoRunning ? "processing" : "success"} />
        <CommandButton icon={demoRunning ? Sparkles : Play} onClick={runWorkflowDemo} disabled={demoRunning}>
          {demoRunning ? "AI Workflow Running…" : "Run AI Workflow Demo"}
        </CommandButton>
      </PageHeader>

      {/* ── KPI Row ── */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={TrendingUp}  label="Productivity Score"  value={`${productivityScore}%`} color="neon"    detail={`${aiHoursSaved}h AI-assisted hours saved this week`} trend="↑ +4% from last week" delay={0} />
        <StatCard icon={CalendarDays} label="Meetings Today"     value={meetings.length}          color="violet"  detail="150 min coordination load detected" trend="3 high-risk sessions" delay={0.05} />
        <StatCard icon={AlertTriangle} label="Overdue Tasks"     value={overdueTasks.length}      color="amber"   detail="2 need same-day escalation" trend="⚠ Immediate action" delay={0.10} />
        <StatCard icon={UsersRound}  label="Learner Progress"    value={`${averageCompletion}%`}  color="emerald" detail={`${learners} active learners across 4 cohorts`} trend="↑ On track" delay={0.15} />
      </div>

      {/* ── Demo Sequence Panel ── */}
      <AnimatePresence>
        {demoStep >= 0 && (
          <motion.section
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="mt-5 agent-card rounded-xl p-5"
            style={{ border: "1px solid var(--neon-strong)", boxShadow: "var(--glow-neon)" }}
          >
            <div className="mb-4 flex items-center gap-2">
              <Network size={14} style={{ color: "var(--neon)" }} />
              <p className="mono text-[10px] font-bold uppercase tracking-[.24em]" style={{ color: "var(--neon)" }}>
                // Live Demo Sequence — Step {demoStep + 1} of {demoSteps.length}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {demoSteps.map((step, i) => (
                <motion.div
                  key={step.label}
                  animate={{ opacity: i <= demoStep ? 1 : 0.35, scale: i === demoStep ? 1.02 : 1 }}
                  className="rounded-xl p-3 transition-all"
                  style={{
                    background: i <= demoStep ? "var(--neon-dim)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${i <= demoStep ? "var(--border-strong)" : "var(--border-subtle)"}`,
                  }}
                >
                  <step.icon size={16} style={{ color: i <= demoStep ? "var(--neon)" : "var(--text-muted)", marginBottom: 8 }} />
                  <p className="text-[12px] font-bold leading-tight" style={{ color: i <= demoStep ? "var(--text-primary)" : "var(--text-muted)" }}>
                    {step.label}
                  </p>
                  {i === demoStep && (
                    <p className="mt-2 text-[11px] leading-4" style={{ color: "var(--text-secondary)" }}>{step.detail}</p>
                  )}
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* ── Main Content Grid ── */}
      <div className="mt-5 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        {/* Delivery Feed */}
        <section className="agent-card rounded-xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="mono text-[10px] font-bold uppercase tracking-[.22em]" style={{ color: "var(--neon)" }}>// Delivery Intelligence Feed</p>
              <h2 className="mt-1 text-lg font-bold" style={{ color: "var(--text-primary)" }}>AI-Generated Operational Signals</h2>
            </div>
            <Activity size={18} style={{ color: "var(--neon)" }} />
          </div>
          <div className="space-y-3">
            {visibleTasks.map((task, i) => (
              <motion.div
                key={task.title}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0, scale: demoStep === 1 && i < 3 ? 1.01 : 1 }}
                transition={{ delay: i * 0.05 }}
                whileHover={{ x: 3 }}
                className="rounded-xl p-4"
                style={{
                  background: demoStep >= 1 && i < 3 ? "var(--neon-dim)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${demoStep >= 1 && i < 3 ? "var(--border-strong)" : "var(--border-subtle)"}`,
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{task.title}</p>
                    <p className="mono mt-1 text-[10px]" style={{ color: "var(--text-muted)" }}>
                      {task.deadline} · {task.owner} · {task.cohort}
                    </p>
                  </div>
                  <span
                    className="mono shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold"
                    style={task.priority === "High"
                      ? { background: "var(--rose-dim)", color: "var(--rose)" }
                      : { background: "var(--amber-dim)", color: "var(--amber)" }
                    }
                  >
                    {task.priority}
                  </span>
                </div>
                {task.blockedBy && (
                  <p className="mono mt-2 text-[11px]" style={{ color: "var(--amber)" }}>
                    ⚡ Blocked: {task.blockedBy} → Escalate to {task.escalation}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        </section>

        {/* Agent Workflow Status */}
        <section className="agent-card rounded-xl p-5">
          <p className="mono text-[10px] font-bold uppercase tracking-[.22em]" style={{ color: "var(--violet)" }}>// Agentic Workflow Status</p>
          <h2 className="mt-1 mb-5 text-lg font-bold" style={{ color: "var(--text-primary)" }}>Multi-Agent Crew</h2>
          <div className="space-y-5">
            {agents.map((agent) => (
              <div key={agent.name}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Bot size={14} style={{ color: agentIconColor[agent.color] }} />
                    <p className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>{agent.name}</p>
                  </div>
                  <span className="mono text-[11px] font-semibold" style={{ color: agentIconColor[agent.color] }}>
                    {agent.confidence}%
                  </span>
                </div>
                <p className="mono mb-2 text-[11px]" style={{ color: "var(--text-muted)" }}>{agent.work}</p>
                <ProgressBar value={agent.confidence} color={agent.color} showLabel={false} />
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Risk Alerts ── */}
      <AnimatePresence>
        {demoStep >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            className="mt-5 grid gap-4 lg:grid-cols-3"
          >
            {overdueTasks.map((task) => (
              <motion.div
                key={task.title}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="agent-card rounded-xl p-4"
                style={{ border: "1px solid rgba(251,75,110,0.25)", boxShadow: "0 0 20px rgba(251,75,110,0.08)" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={14} style={{ color: "var(--rose)" }} />
                  <p className="mono text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--rose)" }}>Risk Alert</p>
                </div>
                <p className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>{task.title}</p>
                <p className="mono mt-2 text-[11px]" style={{ color: "var(--text-muted)" }}>{task.blockedBy} → Escalate to {task.escalation}</p>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── AI Output Cards ── */}
      <AnimatePresence>
        {demoStep >= 3 && (
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-5 grid gap-5 xl:grid-cols-3"
          >
            <DemoOutputCard icon={CheckCircle2} eyebrow="MeetingAgent" title="Meeting Summary Generated"
              items={["Decision: delivery schedule unchanged", "Action: Maya validates roster by 15:00", "Blocker: EMEA attendance feed missing"]}
              color="neon"
            />
            {demoStep >= 4 && (
              <DemoOutputCard icon={GraduationCap} eyebrow="LearningAgent" title="Learning Content Generated"
                items={["Objective: apply AI triage to delivery risks", "Activity: escalation role-play scenario", "Quiz: identify missing owner and deadline"]}
                color="violet"
              />
            )}
            {demoStep >= 5 && (
              <DemoOutputCard icon={HeartPulse} eyebrow="WellnessAgent" title="Wellness Insights"
                items={["Burnout risk: Medium", "Lina capacity: Overloaded", "Recommendation: 25-min recovery block"]}
                color="emerald"
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Meetings + AiOrb ── */}
      <div className="mt-5 grid gap-5 lg:grid-cols-4">
        {meetings.slice(0, 3).map((meeting, i) => {
          const icons = [Clock, CheckCircle2, CalendarDays];
          const Icon = icons[i];
          return (
            <div key={meeting.title} className="agent-card rounded-xl p-4">
              <Icon size={16} style={{ color: "var(--neon)", marginBottom: 10 }} />
              <p className="mono text-[10px]" style={{ color: "var(--text-muted)" }}>{meeting.time} · {meeting.duration}</p>
              <p className="mt-1 text-[14px] font-bold" style={{ color: "var(--text-primary)" }}>{meeting.title}</p>
              <p className="mt-2 text-[11px]" style={{ color: "var(--text-muted)" }}>{meeting.outcome}</p>
            </div>
          );
        })}
        <AiOrb label="Autonomy Layer" value="Crew Online" status="All agents nominal" />
      </div>

      {/* ── Analytics Row ── */}
      <div className="mt-5 grid gap-5 xl:grid-cols-2">
        {/* Learner Progress */}
        <section className="agent-card rounded-xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="mono text-[10px] font-bold uppercase tracking-[.22em]" style={{ color: "var(--emerald)" }}>// Learner Progress by Cohort</p>
              <h2 className="mt-1 text-lg font-bold" style={{ color: "var(--text-primary)" }}>Completion, Attendance & Assessment</h2>
            </div>
            <BarChart3 size={18} style={{ color: "var(--emerald)" }} />
          </div>
          <div className="space-y-3">
            {learnerProgress.map((cohort) => (
              <div key={cohort.cohort} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)" }}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>{cohort.cohort}</p>
                    <p className="mono text-[10px]" style={{ color: "var(--text-muted)" }}>
                      {cohort.learners} learners · {cohort.attendance}% attend · {cohort.quizAverage}% quiz · {cohort.satisfaction} CSAT
                    </p>
                  </div>
                  <span
                    className="mono shrink-0 rounded-lg px-2.5 py-1 text-[10px] font-bold"
                    style={cohort.risk === "High"
                      ? { background: "var(--rose-dim)", color: "var(--rose)" }
                      : cohort.risk === "Medium"
                      ? { background: "var(--amber-dim)", color: "var(--amber)" }
                      : { background: "var(--emerald-dim)", color: "var(--emerald)" }
                    }
                  >
                    {cohort.risk}
                  </span>
                </div>
                <ProgressBar value={cohort.completion} color={cohort.risk === "High" ? "rose" : cohort.risk === "Medium" ? "amber" : "emerald"} showLabel />
              </div>
            ))}
          </div>
        </section>

        {/* Productivity Analytics */}
        <section className="agent-card rounded-xl p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="mono text-[10px] font-bold uppercase tracking-[.22em]" style={{ color: "var(--neon)" }}>// Productivity Analytics</p>
              <h2 className="mt-1 text-lg font-bold" style={{ color: "var(--text-primary)" }}>Focus · Tasks Closed · AI Hours</h2>
            </div>
            <TrendingUp size={18} style={{ color: "var(--neon)" }} />
          </div>
          <div className="flex h-56 items-end gap-3">
            {productivityAnalytics.map((day) => (
              <div key={day.day} className="flex flex-1 flex-col items-center justify-end h-full">
                <p className="mono mb-2 text-[10px] font-semibold" style={{ color: "var(--neon)" }}>{day.productivity}%</p>
                <div className="relative w-full flex-1 flex items-end rounded-lg overflow-hidden" style={{ background: "rgba(0,212,255,0.04)" }}>
                  <div
                    className="w-full rounded-lg transition-all duration-700"
                    style={{
                      height: `${day.productivity}%`,
                      background: "linear-gradient(180deg, var(--neon) 0%, rgba(0,212,255,0.4) 100%)",
                      boxShadow: "0 0 16px rgba(0,212,255,0.35)",
                    }}
                  />
                </div>
                <p className="mono mt-2 text-[11px] font-bold" style={{ color: "var(--text-primary)" }}>{day.day}</p>
                <p className="mono text-[9px]" style={{ color: "var(--text-muted)" }}>{day.tasksClosed} closed</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* ── Deadline Radar + Team Table ── */}
      <div className="mt-5 grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        {/* Deadline Radar */}
        <section className="agent-card rounded-xl p-5">
          <p className="mono text-[10px] font-bold uppercase tracking-[.22em]" style={{ color: "var(--amber)" }}>// Deadline Radar</p>
          <h2 className="mt-1 mb-4 text-lg font-bold" style={{ color: "var(--text-primary)" }}>Upcoming Commitments</h2>
          <div className="space-y-3">
            {deadlines.map((d) => (
              <div key={d.item} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)" }}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>{d.item}</p>
                  <p className="mono text-[11px] font-bold" style={{ color: "var(--amber)" }}>{d.due}</p>
                </div>
                <p className="mono mb-3 text-[10px]" style={{ color: "var(--text-muted)" }}>{d.owner} · {d.impact} · {d.status}</p>
                <ProgressBar value={d.completion} color="amber" showLabel />
              </div>
            ))}
          </div>
        </section>

        {/* Team Performance */}
        <section className="agent-card rounded-xl p-5">
          <p className="mono text-[10px] font-bold uppercase tracking-[.22em]" style={{ color: "var(--violet)" }}>// Team Performance</p>
          <h2 className="mt-1 mb-4 text-lg font-bold" style={{ color: "var(--text-primary)" }}>Operator Capacity Overview</h2>
          <div className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--border)" }}>
            <table className="w-full text-left text-[12px]">
              <thead>
                <tr style={{ background: "rgba(124,58,237,0.08)", borderBottom: "1px solid var(--border)" }}>
                  {["Operator", "Workload", "Closed", "At Risk", "Capacity"].map(h => (
                    <th key={h} className="mono px-3 py-3 text-[10px] font-bold uppercase tracking-[.18em]" style={{ color: "var(--text-muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {teamPerformance.map((m, i) => (
                  <tr
                    key={m.name}
                    style={{ borderTop: i > 0 ? "1px solid var(--border-subtle)" : "none" }}
                    className="transition-colors hover:bg-white/5"
                  >
                    <td className="px-3 py-3">
                      <p className="font-bold" style={{ color: "var(--text-primary)" }}>{m.name}</p>
                      <p className="mono text-[10px]" style={{ color: "var(--text-muted)" }}>{m.role} · {m.sentiment}</p>
                    </td>
                    <td className="px-3 py-3 min-w-[80px]">
                      <ProgressBar value={m.workload} color={m.workload > 85 ? "rose" : "neon"} showLabel />
                    </td>
                    <td className="mono px-3 py-3" style={{ color: "var(--text-primary)" }}>{m.completed}</td>
                    <td className="mono px-3 py-3" style={{ color: m.atRisk > 0 ? "var(--rose)" : "var(--text-muted)" }}>{m.atRisk}</td>
                    <td className="mono px-3 py-3" style={{ color: "var(--text-secondary)" }}>{m.capacity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function DemoOutputCard({ icon: Icon, eyebrow, title, items, color = "neon" }) {
  const colorMap = { neon: "var(--neon)", violet: "var(--violet)", emerald: "var(--emerald)" };
  const bgMap = { neon: "var(--neon-dim)", violet: "var(--violet-dim)", emerald: "var(--emerald-dim)" };
  const c = colorMap[color] || colorMap.neon;
  const bg = bgMap[color] || bgMap.neon;

  return (
    <motion.section
      initial={{ opacity: 0, y: 18, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="agent-card rounded-xl p-5"
      style={{ borderColor: `${c}25`, boxShadow: `0 0 24px ${bg}` }}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="mono text-[10px] font-bold uppercase tracking-[.22em]" style={{ color: c }}>{eyebrow}</p>
          <h3 className="mt-1 text-[15px] font-bold" style={{ color: "var(--text-primary)" }}>{title}</h3>
        </div>
        <div className="agent-pulse flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: bg, color: c }}>
          <Icon size={18} />
        </div>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <motion.p
            key={item}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.12 }}
            className="rounded-lg px-3 py-2.5 text-[12px]"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)", color: "var(--text-secondary)" }}
          >
            <Zap size={10} style={{ display: "inline", color: c, marginRight: 6 }} />
            {item}
          </motion.p>
        ))}
      </div>
    </motion.section>
  );
}
