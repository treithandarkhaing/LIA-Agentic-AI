import { useRef, useState } from "react";
import {
  CalendarCheck2, CalendarDays, CheckCircle2, Clock,
  Crown, Loader2, Lock, MessageSquare, Send, Sparkles,
  Star, Zap, AlertTriangle, ChevronDown, ChevronUp,
  MapPin, ExternalLink,
} from "lucide-react";
import AgentBadge from "../components/AgentBadge.jsx";
import CommandButton from "../components/CommandButton.jsx";
import PageHeader from "../components/PageHeader.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import SkeletonBlock from "../components/SkeletonBlock.jsx";
import { plannerApi, plannerChatApi } from "../services/api.js";

/* ── Calendar ICS URL ─────────────────────────────────────── */
const calendarUrl = "https://outlook.office365.com/owa/calendar/1566d17630f14d9abe4754b7c088a30b@learning.educlaas.com/37748eccdf844fd89530d0b528c334f01732935905635385815/calendar.ics";

/* ── Fallback plan ────────────────────────────────────────── */
const fallback = {
  agent: "LIA Planner Agentic AI",
  executive_summary: "LIA Planner is ready. Click 'Generate Calendar Plan' to fetch your live Outlook calendar and build today's intelligent plan.",
  productivity_score: 0,
  priorities: [],
  schedule: [],
  risks: [{ level: "Info", message: "Click 'Generate Calendar Plan' to load live Outlook events and today's task list." }],
  recommendations: [
    "Click 'Generate Calendar Plan' to load live Outlook events.",
    "Ask LIA Chat: Prepare My Day.",
    "Ask: Show Calendar Tasks.",
  ],
  calendar_events: [],
  today_events: [],
  calendar_status: "Outlook calendar link configured. Click Generate to load live data.",
};

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
export default function Planner() {
  const [plan, setPlan]             = useState(fallback);
  const [loading, setLoading]       = useState(false);
  const [fetchStatus, setFetchStatus] = useState("idle"); // idle | fetching | done | error
  const [chat, setChat]             = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [messages, setMessages]     = useState([
    { role: "assistant", text: "Ask LIA to Prepare My Day, show Today Urgent Tasks, read Calendar Tasks, or Show Hidden Task." },
  ]);
  const [calendarExpanded, setCalendarExpanded] = useState(true);
  const [allEventsExpanded, setAllEventsExpanded] = useState(false);

  const chatBottomRef = useRef(null);
  const today = new Date().toISOString().slice(0, 10);
  const todayLabel = new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const plannerPayload = { date: today, tasks: [], meetings: [], calendar_url: calendarUrl };

  /* ── Generate plan + ICS fetch ────────────────────────── */
  async function generate() {
    setLoading(true);
    setFetchStatus("fetching");
    try {
      const nextPlan = await plannerApi(plannerPayload);
      setPlan((current) => ({
        ...current,
        ...nextPlan,
        calendar_events: nextPlan.calendar_events?.length ? nextPlan.calendar_events : current.calendar_events,
        today_events:    nextPlan.today_events?.length    ? nextPlan.today_events    : current.today_events,
        priorities:      nextPlan.priorities?.length      ? nextPlan.priorities      : current.priorities,
        schedule:        nextPlan.schedule?.length        ? nextPlan.schedule        : current.schedule,
        risks:           nextPlan.risks?.length           ? nextPlan.risks           : current.risks,
        recommendations: nextPlan.recommendations?.length ? nextPlan.recommendations : current.recommendations,
      }));
      setFetchStatus("done");
      setCalendarExpanded(true);
    } catch {
      setFetchStatus("error");
      setPlan((current) => ({
        ...current,
        calendar_status: "Outlook calendar could not be reached right now. Check network or try again.",
      }));
    } finally {
      setLoading(false);
    }
  }

  /* ── LIA Chat ───────────────────────────────────────────── */
  async function askLia(prompt = chat) {
    const message = (prompt || chat).trim();
    if (!message) return;
    setMessages((items) => [...items, { role: "user", text: message }]);
    setChat("");
    setChatLoading(true);
    setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    try {
      const response = await plannerChatApi({ ...plannerPayload, message });
      setMessages((items) => [
        ...items,
        {
          role: "assistant",
          text: response.answer,
          quota: response.quota_expired,
          upgrade: response.upgrade_message,
          quickActions: response.quick_actions || [],
        },
      ]);
      if (response.calendar_events?.length || response.priorities?.length) {
        setPlan((current) => ({
          ...current,
          calendar_events: response.calendar_events?.length ? response.calendar_events : current.calendar_events,
          priorities: response.priorities?.length ? response.priorities : current.priorities,
        }));
      }
    } catch {
      setMessages((items) => [...items, { role: "assistant", text: "LIA Planner could not reach the API right now. Try Generate Calendar Plan first, then ask again." }]);
    } finally {
      setChatLoading(false);
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }

  const urgencyColor = (urgency) => urgency === "High"
    ? { badge: "rgba(251,113,133,0.15)", text: "#fca5a5", border: "rgba(251,113,133,0.3)" }
    : { badge: "rgba(94,234,212,0.1)",  text: "#5eead4", border: "rgba(94,234,212,0.25)" };

  return (
    <div>
      <PageHeader eyebrow="LIA Planner Agentic AI" title="Calendar-aware Daily Planner">
        <CommandButton
          icon={loading ? Loader2 : Sparkles}
          onClick={generate}
          disabled={loading}
        >
          {loading ? "Fetching Outlook Calendar…" : "Generate Calendar Plan"}
        </CommandButton>
      </PageHeader>

      {/* ── ICS fetch status banner ─────────────────────────── */}
      {fetchStatus === "fetching" && (
        <div className="mb-5 flex items-center gap-3 rounded-xl px-5 py-3.5" style={{ background: "rgba(0,212,255,0.07)", border: "1px solid rgba(0,212,255,0.2)" }}>
          <Loader2 size={16} className="animate-spin" style={{ color: "var(--neon)" }} />
          <span className="text-[13px]" style={{ color: "var(--neon)" }}>
            Connecting to Outlook calendar ICS feed and fetching events…
          </span>
        </div>
      )}
      {fetchStatus === "done" && (
        <div className="mb-5 flex items-center gap-3 rounded-xl px-5 py-3.5" style={{ background: "rgba(0,255,163,0.07)", border: "1px solid rgba(0,255,163,0.2)" }}>
          <CheckCircle2 size={16} style={{ color: "var(--emerald)" }} />
          <span className="text-[13px]" style={{ color: "var(--emerald)" }}>
            {plan.calendar_status}
          </span>
        </div>
      )}
      {fetchStatus === "error" && (
        <div className="mb-5 flex items-center gap-3 rounded-xl px-5 py-3.5" style={{ background: "rgba(251,75,110,0.07)", border: "1px solid rgba(251,75,110,0.2)" }}>
          <AlertTriangle size={16} style={{ color: "var(--rose)" }} />
          <span className="text-[13px]" style={{ color: "var(--rose)" }}>{plan.calendar_status}</span>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">

        {/* ══════════════════════════════════════════
            LEFT COLUMN
        ══════════════════════════════════════════ */}
        <div className="space-y-5">

          {/* Agent overview card */}
          <section className="rounded-2xl p-5" style={{ background: "rgba(0,212,255,0.04)", border: "1px solid rgba(0,212,255,0.12)" }}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <AgentBadge name={plan.agent} status={loading ? "Fetching calendar…" : fetchStatus === "done" ? "Calendar loaded" : "Ready"} />
              <div className="text-right">
                <p className="text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>Productivity</p>
                <p className="text-3xl font-bold" style={{ color: "#5eead4" }}>{plan.productivity_score}%</p>
              </div>
            </div>
            <p className="mb-3 rounded-xl px-4 py-3 text-[13px] leading-6" style={{ background: "rgba(94,234,212,0.08)", border: "1px solid rgba(94,234,212,0.15)", color: "var(--text-secondary)" }}>
              {plan.executive_summary}
            </p>

            {/* Priority items */}
            {loading ? (
              <div className="grid gap-3 md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => <SkeletonBlock key={i} className="h-28 w-full" />)}
              </div>
            ) : plan.priorities.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2">
                {plan.priorities.map((item) => (
                  <div key={`${item.title}-${item.rationale}`} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="text-[13px] font-bold leading-5" style={{ color: "var(--text-primary)" }}>{item.title}</h3>
                      <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: urgencyColor(item.priority).badge, color: urgencyColor(item.priority).text, border: `1px solid ${urgencyColor(item.priority).border}` }}>
                        {item.priority}
                      </span>
                    </div>
                    <p className="mb-3 text-[12px] leading-5" style={{ color: "var(--text-muted)" }}>{item.rationale}</p>
                    <ProgressBar value={item.progress} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl p-4 text-[13px]" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", color: "var(--text-muted)" }}>
                No priority items yet. Click <strong style={{ color: "var(--neon)" }}>Generate Calendar Plan</strong> to load live Outlook events.
              </div>
            )}
          </section>

          {/* ── TODAY'S TASKS ─────────────────────────────────── */}
          <section className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(94,234,212,0.25)" }}>
            {/* Header */}
            <button
              className="w-full flex items-center justify-between px-5 py-4"
              style={{ background: "linear-gradient(135deg, rgba(94,234,212,0.12) 0%, rgba(56,189,248,0.07) 100%)" }}
              onClick={() => setCalendarExpanded((v) => !v)}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "rgba(94,234,212,0.2)" }}>
                  <CheckCircle2 size={16} style={{ color: "#5eead4" }} />
                </div>
                <div className="text-left">
                  <p className="text-[14px] font-bold" style={{ color: "var(--text-primary)" }}>Today's Tasks</p>
                  <p className="text-[11px]" style={{ color: "rgba(94,234,212,0.7)" }}>{todayLabel}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {plan.today_events.length > 0 && (
                  <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: "rgba(94,234,212,0.2)", color: "#5eead4" }}>
                    {plan.today_events.length} event{plan.today_events.length !== 1 ? "s" : ""}
                  </span>
                )}
                {calendarExpanded ? <ChevronUp size={16} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={16} style={{ color: "var(--text-muted)" }} />}
              </div>
            </button>

            {calendarExpanded && (
              <div className="px-5 py-4" style={{ background: "rgba(2,11,24,0.5)" }}>
                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => <SkeletonBlock key={i} className="h-16 w-full" />)}
                  </div>
                ) : plan.today_events.length > 0 ? (
                  <div className="space-y-3">
                    {plan.today_events.map((event, i) => (
                      <TodayEventCard key={`${event.start}-${event.title}-${i}`} event={event} />
                    ))}
                  </div>
                ) : fetchStatus === "idle" ? (
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <CalendarDays size={32} style={{ color: "rgba(94,234,212,0.3)" }} />
                    <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                      Click <strong style={{ color: "var(--neon)" }}>Generate Calendar Plan</strong> to load today's Outlook events
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <CalendarDays size={32} style={{ color: "rgba(94,234,212,0.3)" }} />
                    <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                      No events found in your Outlook calendar for today ({today})
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* ── ALL CALENDAR EVENTS (collapsible) ──────────────── */}
          {plan.calendar_events.length > 0 && (
            <section className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(0,212,255,0.15)" }}>
              <button
                className="w-full flex items-center justify-between px-5 py-4"
                style={{ background: "rgba(0,212,255,0.05)" }}
                onClick={() => setAllEventsExpanded((v) => !v)}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "rgba(0,212,255,0.12)" }}>
                    <CalendarDays size={16} style={{ color: "var(--neon)" }} />
                  </div>
                  <p className="text-[14px] font-bold" style={{ color: "var(--text-primary)" }}>
                    All Calendar Events
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: "rgba(0,212,255,0.12)", color: "var(--neon)" }}>
                    {plan.calendar_events.length} total
                  </span>
                  {allEventsExpanded ? <ChevronUp size={16} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={16} style={{ color: "var(--text-muted)" }} />}
                </div>
              </button>

              {allEventsExpanded && (
                <div className="px-5 py-4 space-y-2" style={{ background: "rgba(2,11,24,0.4)" }}>
                  {plan.calendar_events.map((event, i) => (
                    <CalendarEventRow key={`all-${event.start}-${i}`} event={event} />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>

        {/* ══════════════════════════════════════════
            RIGHT COLUMN — LIA Chat + Schedule
        ══════════════════════════════════════════ */}
        <aside className="space-y-5">

          {/* LIA Chat */}
          <section className="rounded-2xl overflow-hidden" style={{ background: "rgba(2,11,24,0.7)", border: "1px solid rgba(94,234,212,0.2)", backdropFilter: "blur(24px)" }}>
            {/* Chat header */}
            <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid rgba(94,234,212,0.1)", background: "rgba(94,234,212,0.04)" }}>
              <MessageSquare size={16} style={{ color: "#5eead4" }} />
              <p className="text-[15px] font-bold" style={{ color: "var(--text-primary)" }}>LIA Chat</p>
              <div className="ml-auto flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: chatLoading ? "var(--amber)" : "#5eead4", boxShadow: chatLoading ? "0 0 6px var(--amber)" : "0 0 6px #5eead4" }} />
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{chatLoading ? "Thinking…" : "Ready"}</span>
              </div>
            </div>

            {/* Quick chips */}
            <div className="grid grid-cols-2 gap-2 px-4 pt-4">
              {["Prepare My Day", "Today Urgent Tasks", "Show Calendar Tasks", "Show Hidden Task"].map((item) => (
                <button
                  key={item}
                  onClick={() => askLia(item)}
                  className="rounded-xl px-3 py-2 text-left text-[12px] font-bold transition-all hover:-translate-y-0.5"
                  style={{
                    background: item === "Show Hidden Task" ? "rgba(251,191,36,0.08)" : "rgba(255,255,255,0.05)",
                    border: item === "Show Hidden Task" ? "1px solid rgba(251,191,36,0.25)" : "1px solid rgba(255,255,255,0.09)",
                    color: item === "Show Hidden Task" ? "#fbbf24" : "var(--text-secondary)",
                  }}
                >
                  {item === "Show Hidden Task" && <Crown size={11} className="inline mr-1.5 mb-0.5" />}
                  {item}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div className="thin-scroll mx-4 my-3 max-h-[360px] space-y-3 overflow-y-auto rounded-xl p-3" style={{ background: "rgba(0,0,0,0.2)", border: "1px solid rgba(255,255,255,0.05)" }}>
              {messages.map((message, index) => (
                <ChatMessage key={index} message={message} onAction={(a) => askLia(a)} />
              ))}
              {chatLoading && <SkeletonBlock className="h-14 w-3/4" />}
              <div ref={chatBottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 pb-4 flex gap-2">
              <input
                value={chat}
                onChange={(e) => setChat(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && askLia()}
                placeholder="Ask LIA Planner…"
                className="min-w-0 flex-1 rounded-xl px-4 py-2.5 text-[13px] outline-none"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(94,234,212,0.2)", color: "var(--text-primary)" }}
              />
              <button
                onClick={() => askLia()}
                disabled={chatLoading || !chat.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-xl transition-all hover:scale-105 disabled:opacity-40"
                style={{ background: "#5eead4", color: "#042f2e", flexShrink: 0 }}
              >
                {chatLoading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              </button>
            </div>
          </section>

          {/* Schedule timeline */}
          {plan.schedule.length > 0 && (
            <section className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="mb-4 flex items-center gap-2">
                <Clock size={15} style={{ color: "var(--neon)" }} />
                <p className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>Today's Schedule</p>
              </div>
              <div className="space-y-2">
                {(loading ? [] : plan.schedule).map((block, i) => (
                  <div key={`${block.time}-${i}`} className="flex gap-3 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <div className="flex-shrink-0 w-14 text-[12px] font-bold" style={{ color: "#5eead4" }}>{block.time}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>{block.activity}</p>
                      <p className="text-[11px] mt-0.5" style={{ color: "var(--text-muted)" }}>{block.focus}</p>
                    </div>
                  </div>
                ))}
                {loading && [1, 2, 3].map((i) => <SkeletonBlock key={i} className="h-14 w-full" />)}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   TODAY EVENT CARD — prominent card for today's tasks
───────────────────────────────────────────────────────────── */
function TodayEventCard({ event }) {
  const isHigh = event.urgency === "High";
  const timeLabel = formatCalendarStart(event.start);

  return (
    <div
      className="rounded-xl p-4 transition-all hover:-translate-y-0.5"
      style={{
        background: isHigh ? "rgba(251,113,133,0.07)" : "rgba(94,234,212,0.06)",
        border: `1px solid ${isHigh ? "rgba(251,113,133,0.25)" : "rgba(94,234,212,0.2)"}`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ background: isHigh ? "rgba(251,113,133,0.15)" : "rgba(94,234,212,0.12)" }}
          >
            {isHigh ? (
              <AlertTriangle size={14} style={{ color: "#fca5a5" }} />
            ) : (
              <CalendarCheck2 size={14} style={{ color: "#5eead4" }} />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-bold leading-5 truncate" style={{ color: "var(--text-primary)" }}>
              {event.title}
            </p>
            {event.location && (
              <p className="mt-0.5 flex items-center gap-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
                <MapPin size={10} /> {event.location}
              </p>
            )}
            {event.description && (
              <p className="mt-1 text-[11px] leading-5 line-clamp-2" style={{ color: "var(--text-secondary)" }}>
                {event.description}
              </p>
            )}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <span className="rounded-full px-2 py-0.5 text-[10px] font-bold" style={{ background: isHigh ? "rgba(251,113,133,0.15)" : "rgba(94,234,212,0.12)", color: isHigh ? "#fca5a5" : "#5eead4", border: `1px solid ${isHigh ? "rgba(251,113,133,0.3)" : "rgba(94,234,212,0.25)"}` }}>
            {event.urgency}
          </span>
          <p className="mt-1 text-[11px] font-bold" style={{ color: "var(--text-muted)" }}>{timeLabel}</p>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   CALENDAR EVENT ROW — compact row for "All Events" list
───────────────────────────────────────────────────────────── */
function CalendarEventRow({ event }) {
  const isHigh = event.urgency === "High";
  return (
    <div className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
      <span className="shrink-0 text-[10px] font-bold w-12 text-right" style={{ color: isHigh ? "#fca5a5" : "#5eead4" }}>
        {formatCalendarStart(event.start)}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>{event.title}</p>
        {event.location && <p className="text-[10px] truncate" style={{ color: "var(--text-muted)" }}>{event.location}</p>}
      </div>
      <span className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold" style={{ background: isHigh ? "rgba(251,113,133,0.12)" : "rgba(94,234,212,0.08)", color: isHigh ? "#fca5a5" : "#5eead4" }}>
        {event.urgency}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   CHAT MESSAGE — handles text, Pro Plan locked card
───────────────────────────────────────────────────────────── */
function ChatMessage({ message, onAction }) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm px-3 py-2.5 text-[13px] leading-5" style={{ background: "rgba(94,234,212,0.15)", border: "1px solid rgba(94,234,212,0.25)", color: "#e8f4ff" }}>
          {message.text}
        </div>
      </div>
    );
  }

  /* Pro Plan locked card */
  if (message.quota) {
    return (
      <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(251,191,36,0.35)", background: "rgba(251,191,36,0.05)" }}>
        {/* Gold header */}
        <div className="flex items-center gap-2.5 px-4 py-3" style={{ background: "linear-gradient(135deg, rgba(251,191,36,0.2) 0%, rgba(251,191,36,0.08) 100%)", borderBottom: "1px solid rgba(251,191,36,0.2)" }}>
          <Lock size={15} style={{ color: "#fbbf24" }} />
          <p className="text-[13px] font-bold" style={{ color: "#fbbf24" }}>Pro Plan Required</p>
          <Crown size={14} style={{ color: "#fbbf24", marginLeft: "auto" }} />
        </div>
        {/* Body */}
        <div className="px-4 py-3">
          <p className="text-[12px] leading-5 whitespace-pre-line" style={{ color: "var(--text-secondary)" }}>
            {message.text}
          </p>
          {/* Feature bullets */}
          <div className="mt-3 space-y-1.5">
            {["Deep-work hidden task intelligence", "Cross-calendar priority scoring", "AI focus block generation", "Burnout risk prediction"].map((feat) => (
              <div key={feat} className="flex items-center gap-2">
                <Star size={10} style={{ color: "#fbbf24", flexShrink: 0 }} />
                <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>{feat}</span>
              </div>
            ))}
          </div>
          {/* CTA Button */}
          <button
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-[13px] font-black transition-all hover:-translate-y-0.5 hover:shadow-lg"
            style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b)", color: "#1a0a00", boxShadow: "0 4px 16px rgba(251,191,36,0.3)" }}
          >
            <Zap size={14} />
            Upgrade to Pro Plan
          </button>
        </div>
      </div>
    );
  }

  /* Standard assistant message */
  return (
    <div className="space-y-2">
      <div className="rounded-2xl rounded-bl-sm px-3 py-2.5 text-[13px] leading-5" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--text-secondary)", whiteSpace: "pre-line" }}>
        {message.text}
      </div>
      {/* Quick action chips returned from LIA */}
      {message.quickActions?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pl-1">
          {message.quickActions.filter((a) => a !== "Show Hidden Task").map((action) => (
            <button
              key={action}
              onClick={() => onAction(action)}
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold transition-all hover:-translate-y-px"
              style={{ background: "rgba(94,234,212,0.08)", border: "1px solid rgba(94,234,212,0.18)", color: "#5eead4" }}
            >
              {action}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   UTILITY — format ICS datetime
───────────────────────────────────────────────────────────── */
function formatCalendarStart(value) {
  if (!value) return "All day";
  const clean = String(value).replace("Z", "");
  if (/^\d{8}T\d{6}$/.test(clean)) {
    const hour   = clean.slice(9, 11);
    const minute = clean.slice(11, 13);
    const day    = clean.slice(6, 8);
    const month  = clean.slice(4, 6);
    return `${hour}:${minute}`;   // just time for today's events
  }
  if (/^\d{8}$/.test(clean)) {
    return `${clean.slice(6, 8)}/${clean.slice(4, 6)}`; // DD/MM
  }
  return value;
}
