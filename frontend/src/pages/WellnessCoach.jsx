import { useEffect, useRef, useState } from "react";
import {
  Activity, BrainCircuit, Flower2, HeartHandshake,
  Loader2, Music, MoonStar, Send, Sparkles, Tv2, Waves,
  ExternalLink, RefreshCw, ChevronDown,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth.jsx";
import {
  wellnessChatApi,
  wellnessMoodCheckApi,
  wellnessMusicApi,
  wellnessDramaApi,
} from "../services/api.js";

/* ── Moods ─────────────────────────────────────────────────── */
const MOODS = [
  { label: "Motivated", emoji: "😊" },
  { label: "Tired",     emoji: "😴" },
  { label: "Lonely",   emoji: "😞" },
  { label: "Burned Out", emoji: "😵" },
  { label: "Demotivated", emoji: "😔" },
  { label: "Stressed", emoji: "😤" },
  { label: "Calm",     emoji: "😌" },
];

/* ── Keyword triggers ───────────────────────────────────────── */
const MUSIC_TRIGGERS    = ["demotivat", "lazy", "unmotivat", "can't work", "cant work", "no motivation", "bored", "stuck", "unproduct", "tired", "music", "song", "playlist"];
const DRAMA_TRIGGERS    = ["drama", "k-drama", "kdrama", "break", "take a break", "relax", "watch", "movie", "series", "netflix", "viki"];
const HEAL_TRIGGERS     = ["heal me", "heal", "recover", "reset", "help me", "i feel", "feeling bad", "stressed", "burn out", "burned out", "exhausted"];

function matchesTrigger(text, triggers) {
  const lower = text.toLowerCase();
  return triggers.some((t) => lower.includes(t));
}

/* ── Extract user first name ────────────────────────────────── */
function firstName(user) {
  if (!user) return "there";
  const raw = user.full_name || user.email || "";
  return raw.split(/[\s@]/)[0] || "there";
}

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
export default function WellnessCoach() {
  const { user } = useAuth();
  const name = firstName(user);

  /* state */
  const [mood, setMood]           = useState("Calm");
  const [input, setInput]         = useState("");
  const [timeline, setTimeline]   = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [musicLoading, setMusicLoading] = useState(false);
  const [dramaLoading, setDramaLoading] = useState(false);
  const [moodLoading, setMoodLoading]  = useState(false);

  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  /* ── Initial LIA greeting ──────────────────────────────────── */
  useEffect(() => {
    setTimeout(() => {
      pushMsg("lia", `Hi ${name} 👋 I'm **LIA**, your Wellness Companion. How are you feeling today?`);
      setTimeout(() => {
        pushMsg("lia", "I'm here to listen, support, and help you recharge — just like a friend. You can tell me anything: how you feel, what's stressing you, or even ask me to suggest music or a K-Drama to unwind. 💚");
      }, 800);
    }, 300);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Auto-scroll to bottom ──────────────────────────────────── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [timeline]);

  /* ── Push a message into timeline ──────────────────────────── */
  function pushMsg(role, content, extras = {}) {
    setTimeline((prev) => [...prev, { role, content, extras, id: Date.now() + Math.random() }]);
  }

  /* ── Mood quick-select ───────────────────────────────────────── */
  async function selectMood(label) {
    setMood(label);
    setMoodLoading(true);
    pushMsg("user", `I'm feeling ${label} ${MOODS.find((m) => m.label === label)?.emoji || ""}`);
    try {
      const res = await wellnessMoodCheckApi({ mood: label });
      pushMsg("lia", `Hi ${name}, LIA is here 💚\n\n${res.message}`);
      // Auto-trigger music for demotivated/stressed/tired
      if (["Demotivated", "Stressed", "Tired", "Burned Out"].includes(label)) {
        setTimeout(() => fetchMusic(label), 600);
      }
    } catch {
      pushMsg("lia", `Hi ${name} 💚 I hear you. Let's work through this together.`);
    } finally {
      setMoodLoading(false);
    }
  }

  /* ── Fetch music ─────────────────────────────────────────────── */
  async function fetchMusic(moodOverride) {
    const currentMood = moodOverride || mood;
    setMusicLoading(true);
    pushMsg("lia", `🎵 Let me find some trending music to help you get through this...`);
    try {
      const res = await wellnessMusicApi({ mood: currentMood });
      const tracks = res.tracks || [];
      if (tracks.length > 0) {
        pushMsg("lia",
          `Here are some tracks that go well with your current mood, ${name} — perfect for working remotely when there's no LIVE session! 🎧`,
          { type: "music", tracks }
        );
      } else {
        pushMsg("lia", "I couldn't find specific tracks right now, but try a lofi playlist on YouTube — it really helps!");
      }
    } catch {
      pushMsg("lia", "Music suggestion coming right up! Try 'Lofi Hip Hop' on YouTube — it's great for remote work focus 🎵");
    } finally {
      setMusicLoading(false);
    }
  }

  /* ── Fetch K-Dramas ────────────────────────────────────────── */
  async function fetchDramas() {
    setDramaLoading(true);
    pushMsg("lia", `🎬 Great idea, ${name}! You deserve a real break. Let me find you the best K-Dramas right now...`);
    try {
      const res = await wellnessDramaApi();
      const dramas = res.dramas || [];
      if (dramas.length > 0) {
        pushMsg("lia",
          `Here are the most popular K-Dramas trending right now — pick one and enjoy! 🌸`,
          { type: "drama", dramas: dramas.slice(0, 6) }
        );
      }
    } catch {
      pushMsg("lia", "I recommend 'Crash Landing on You' or 'Queen of Tears' on Netflix — both are absolutely beautiful 💫");
    } finally {
      setDramaLoading(false);
    }
  }

  /* ── Send chat message ─────────────────────────────────────── */
  async function sendMessage(text) {
    const msg = (text || input).trim();
    if (!msg) return;
    setInput("");
    pushMsg("user", msg);
    inputRef.current?.focus();

    // Check for special triggers first
    const isMusic = matchesTrigger(msg, MUSIC_TRIGGERS);
    const isDrama = matchesTrigger(msg, DRAMA_TRIGGERS);

    // Build LIA's empathy message for demotivated/lazy responses
    const isDemotivated = /demotivat|lazy|unmotivat|can'?t work|no motivation/i.test(msg);

    if (isDemotivated) {
      // Special empathetic response for demotivation
      setChatLoading(true);
      setTimeout(() => {
        pushMsg("lia",
          `Hi ${name} 💚 LIA is here.\n\nThat feeling is very real — and it happens a lot with **remote workers**. When there's no LIVE session or team energy around you, isolation quietly drains your motivation.\n\n✨ Here's what I suggest:\n• Listen to music while you work — it creates a gentle energy around you\n• Set one small intention for the next 25 minutes\n• Remind yourself: you don't have to feel 100% to make progress`
        );
        setChatLoading(false);
        setTimeout(() => fetchMusic("Demotivated"), 500);
      }, 700);
      return;
    }

    if (isMusic && !isDrama) {
      fetchMusic();
      return;
    }

    if (isDrama) {
      fetchDramas();
      return;
    }

    // Standard LIA chat
    setChatLoading(true);
    try {
      const res = await wellnessChatApi({
        message: msg,
        mood,
        role: "Remote Worker",
        recovery_mode: false,
        workload_hours: 8,
        meetings_count: 2,
        overdue_tasks: 1,
        urgent_emails: 3,
        screen_time_hours: 7,
        inactivity_hours: 2,
        motivation_score: 70,
      });
      pushMsg("lia", res.message || "I'm here for you. Take one breath, and let's move forward together. 💚");
    } catch {
      pushMsg("lia", `${name}, you're not alone in this. Take one mindful breath, choose one small priority, and give yourself grace today. 💚`);
    } finally {
      setChatLoading(false);
    }
  }

  /* ── Quick suggestion chips ────────────────────────────────── */
  const chips = [
    { label: "Heal me 💚",        action: () => sendMessage("Heal me please") },
    { label: "I feel lazy 😔",    action: () => sendMessage("I feel demotivated and lazy to work") },
    { label: "Suggest music 🎵",  action: () => fetchMusic() },
    { label: "Take a break 🎬",   action: () => fetchDramas() },
    { label: "I'm stressed 😤",   action: () => sendMessage("I'm feeling very stressed right now") },
    { label: "Breathing reset 🌬️", action: () => sendMessage("Guide me through a breathing reset") },
  ];

  /* ─────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────── */
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: "20px", minHeight: "calc(100vh - 120px)", alignItems: "start" }}>

      {/* ══════════════════════════════════════════════════════
          LEFT — Wellness Snapshot + Mood Panel
      ══════════════════════════════════════════════════════ */}
      <div className="wellness-snapshot space-y-4">

        {/* Hero header */}
        <div className="rounded-2xl p-6" style={{ background: "linear-gradient(135deg, rgba(20,184,166,0.12) 0%, rgba(56,189,248,0.08) 50%, rgba(124,58,237,0.1) 100%)", border: "1px solid rgba(94,234,212,0.2)" }}>
          <div className="flex items-center gap-3 mb-4">
            <div className="lia-avatar-pulse flex h-11 w-11 items-center justify-center rounded-full" style={{ background: "rgba(94,234,212,0.15)", border: "1px solid rgba(94,234,212,0.35)" }}>
              <Flower2 size={20} style={{ color: "#5eead4" }} />
            </div>
            <div>
              <p className="mono text-[10px] font-bold uppercase tracking-[.28em]" style={{ color: "#5eead4" }}>// WellnessAgent · LIA Companion</p>
              <h1 className="text-[20px] font-bold mt-0.5" style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--text-primary)" }}>
                Your Healing Space, {name} ✨
              </h1>
            </div>
          </div>
          <p className="text-[13px] leading-6" style={{ color: "var(--text-secondary)" }}>
            LIA is your personal wellness companion — not a dashboard. Talk to her like a friend. She listens, responds, and guides you toward balance.
          </p>
        </div>

        {/* Mood Quick-Select */}
        <div className="rounded-2xl p-5" style={{ background: "rgba(94,234,212,0.04)", border: "1px solid rgba(94,234,212,0.15)" }}>
          <p className="mono mb-4 text-[10px] font-bold uppercase tracking-[.24em]" style={{ color: "rgba(94,234,212,0.8)" }}>How are you feeling right now?</p>
          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => (
              <button
                key={m.label}
                onClick={() => selectMood(m.label)}
                disabled={moodLoading}
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-bold transition-all hover:-translate-y-0.5 disabled:opacity-60"
                style={mood === m.label
                  ? { background: "rgba(94,234,212,0.2)", border: "1px solid rgba(94,234,212,0.45)", color: "#5eead4", boxShadow: "0 0 16px rgba(94,234,212,0.2)" }
                  : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--text-muted)" }}
              >
                <span className="text-base">{m.emoji}</span>
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Wellness KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <MetricCard icon={Activity}       label="Current Mood"  value={mood}       tone="teal" />
          <MetricCard icon={HeartHandshake} label="LIA Status"    value="Listening"  tone="rose" />
          <MetricCard icon={Waves}          label="Recovery"      value="Active"     tone="sky" />
          <MetricCard icon={BrainCircuit}   label="Balance"       value="Supported"  tone="amber" />
        </div>

        {/* Quick healing actions */}
        <div className="rounded-2xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="mono mb-4 text-[10px] font-bold uppercase tracking-[.22em]" style={{ color: "#5eead4" }}>// Quick Actions</p>
          <div className="grid grid-cols-2 gap-3">
            <HealingActionCard label="Breathe"  detail="4 slow rounds" emoji="🌬️" color="rgba(94,234,212,0.2)"  onClick={() => sendMessage("Guide me through a 4-round breathing reset")} />
            <HealingActionCard label="Stretch"  detail="5-min desk"    emoji="🧘" color="rgba(125,211,252,0.2)" onClick={() => sendMessage("Give me a 5-minute desk stretch routine")} />
            <HealingActionCard label="Music"    detail="Trending now"  emoji="🎵" color="rgba(196,181,253,0.2)" onClick={() => fetchMusic()} />
            <HealingActionCard label="K-Drama"  detail="Take a break"  emoji="🎬" color="rgba(251,191,36,0.2)"  onClick={() => fetchDramas()} />
          </div>
        </div>

        {/* LIA tip */}
        <div className="rounded-xl px-5 py-4" style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}>
          <div className="flex items-start gap-3">
            <span className="text-xl">💡</span>
            <div>
              <p className="text-[12px] font-bold mb-1" style={{ color: "#a78bfa" }}>LIA's Tip for Remote Workers</p>
              <p className="text-[12px] leading-5" style={{ color: "var(--text-secondary)" }}>
                When working alone with no LIVE session, isolation creeps in silently. Music creates a gentle energy field around you — it's science. Put on a playlist and feel the difference.
              </p>
            </div>
          </div>
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════
          RIGHT — LIA Chat Panel (Copilot-style)
      ══════════════════════════════════════════════════════ */}
      <div
        className="chat-panel-sticky rounded-2xl overflow-hidden"
        style={{
          background: "rgba(2,11,24,0.7)",
          border: "1px solid rgba(94,234,212,0.2)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 0 40px rgba(94,234,212,0.06), 0 20px 60px rgba(0,0,0,0.4)",
          height: "calc(100vh - 100px)",
        }}
      >
        {/* Chat header */}
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: "1px solid rgba(94,234,212,0.12)", background: "rgba(94,234,212,0.04)" }}>
          <div className="lia-avatar-pulse flex h-9 w-9 items-center justify-center rounded-full flex-shrink-0" style={{ background: "rgba(94,234,212,0.15)", border: "1px solid rgba(94,234,212,0.35)" }}>
            <Flower2 size={16} style={{ color: "#5eead4" }} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold truncate" style={{ color: "var(--text-primary)" }}>LIA Wellness Companion</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: "#5eead4", boxShadow: "0 0 6px #5eead4" }} />
              <span className="text-[11px]" style={{ color: "rgba(94,234,212,0.8)" }}>{chatLoading || musicLoading || dramaLoading ? "LIA is thinking..." : "Online · Listening"}</span>
            </div>
          </div>
          <MoonStar size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
        </div>

        {/* Messages area */}
        <div
          className="thin-scroll flex-1 overflow-y-auto px-4 py-4 space-y-4"
          style={{ flex: 1, minHeight: 0, maxHeight: "calc(100% - 220px)" }}
        >
          {timeline.map((item) => (
            <MessageBubble key={item.id} item={item} name={name} />
          ))}

          {/* Typing indicator */}
          {(chatLoading || musicLoading || dramaLoading) && (
            <div className="flex items-end gap-2 lia-message-in">
              <div className="flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0" style={{ background: "rgba(94,234,212,0.15)", border: "1px solid rgba(94,234,212,0.3)" }}>
                <Flower2 size={14} style={{ color: "#5eead4" }} />
              </div>
              <div className="rounded-2xl rounded-bl-sm px-4 py-3" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(94,234,212,0.12)" }}>
                <div className="flex items-center gap-1.5">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Suggestion chips */}
        <div className="px-4 py-2" style={{ borderTop: "1px solid rgba(94,234,212,0.08)" }}>
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <button
                key={chip.label}
                onClick={chip.action}
                disabled={chatLoading || musicLoading || dramaLoading}
                className="suggestion-chip rounded-full px-3 py-1 text-[11px] font-semibold disabled:opacity-50"
                style={{ background: "rgba(94,234,212,0.07)", border: "1px solid rgba(94,234,212,0.18)", color: "#5eead4" }}
              >
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input bar */}
        <div className="px-4 pb-4 pt-2">
          <div className="flex items-center gap-2 rounded-xl p-1" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(94,234,212,0.2)" }}>
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={`Talk to LIA... (e.g. "I feel lazy today")`}
              className="chat-input flex-1 bg-transparent px-3 py-2.5 text-[13px]"
              style={{ color: "var(--text-primary)", border: "none", outline: "none" }}
              disabled={chatLoading || musicLoading || dramaLoading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || chatLoading || musicLoading || dramaLoading}
              className="flex h-9 w-9 items-center justify-center rounded-lg transition-all hover:scale-105 disabled:opacity-40"
              style={{ background: "#5eead4", color: "#042f2e", flexShrink: 0 }}
            >
              {chatLoading ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </div>
          <p className="mt-1.5 text-center text-[10px]" style={{ color: "var(--text-muted)" }}>LIA is your AI companion — not a substitute for professional support</p>
        </div>
      </div>

    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MESSAGE BUBBLE — handles text + music + drama cards
───────────────────────────────────────────────────────────── */
function MessageBubble({ item, name }) {
  const isUser = item.role === "user";
  const isLia  = item.role === "lia";

  // Render text with simple **bold** support
  function renderText(text) {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} style={{ color: "#5eead4" }}>{part.slice(2, -2)}</strong>;
      }
      // Render newlines
      return part.split("\n").map((line, j, arr) => (
        <span key={`${i}-${j}`}>{line}{j < arr.length - 1 && <br />}</span>
      ));
    });
  }

  if (isUser) {
    return (
      <div className="user-message-in flex justify-end">
        <div
          className="max-w-[80%] rounded-2xl rounded-br-sm px-4 py-3 text-[13px] leading-6"
          style={{ background: "rgba(94,234,212,0.15)", border: "1px solid rgba(94,234,212,0.25)", color: "#e8f4ff" }}
        >
          {renderText(item.content)}
        </div>
      </div>
    );
  }

  if (isLia) {
    return (
      <div className="lia-message-in space-y-3">
        {/* LIA text bubble */}
        <div className="flex items-end gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full flex-shrink-0" style={{ background: "rgba(94,234,212,0.15)", border: "1px solid rgba(94,234,212,0.3)" }}>
            <Flower2 size={13} style={{ color: "#5eead4" }} />
          </div>
          <div
            className="max-w-[88%] rounded-2xl rounded-bl-sm px-4 py-3 text-[13px] leading-6"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(94,234,212,0.12)", color: "var(--text-secondary)" }}
          >
            {renderText(item.content)}
          </div>
        </div>

        {/* Music cards (inline in chat) */}
        {item.extras?.type === "music" && item.extras.tracks?.length > 0 && (
          <div className="ml-10 card-fade-up">
            <div className="grid grid-cols-1 gap-2">
              {item.extras.tracks.map((track, i) => (
                <MusicCard key={i} track={track} />
              ))}
            </div>
          </div>
        )}

        {/* K-Drama cards (inline in chat) */}
        {item.extras?.type === "drama" && item.extras.dramas?.length > 0 && (
          <div className="ml-10 card-fade-up">
            <div className="grid grid-cols-1 gap-2">
              {item.extras.dramas.map((drama, i) => (
                <DramaCard key={i} drama={drama} />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

/* ─────────────────────────────────────────────────────────────
   MUSIC CARD
───────────────────────────────────────────────────────────── */
function MusicCard({ track }) {
  return (
    <div className="music-card rounded-xl p-3" style={{ background: "rgba(94,234,212,0.06)", border: "1px solid rgba(94,234,212,0.18)" }}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl" style={{ background: "rgba(94,234,212,0.15)" }}>
          <Music size={18} style={{ color: "#5eead4" }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-bold truncate" style={{ color: "var(--text-primary)" }}>{track.title}</p>
          <p className="text-[11px] truncate" style={{ color: "var(--text-secondary)" }}>{track.artist} · <span style={{ color: "rgba(94,234,212,0.7)" }}>{track.genre}</span></p>
        </div>
        <span className="rounded-full px-2 py-0.5 text-[10px] font-bold flex-shrink-0" style={{ background: "rgba(94,234,212,0.12)", color: "#5eead4" }}>
          {track.mood_tag}
        </span>
      </div>
      <div className="mt-2.5 flex gap-2">
        <a
          href={track.youtube_search_url}
          target="_blank"
          rel="noreferrer"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all hover:-translate-y-px"
          style={{ background: "rgba(255,0,0,0.12)", border: "1px solid rgba(255,0,0,0.25)", color: "#fca5a5" }}
        >
          ▶ YouTube
        </a>
        <a
          href={track.spotify_search_url}
          target="_blank"
          rel="noreferrer"
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all hover:-translate-y-px"
          style={{ background: "rgba(29,185,84,0.12)", border: "1px solid rgba(29,185,84,0.25)", color: "#4ade80" }}
        >
          ♫ Spotify
        </a>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   K-DRAMA CARD
───────────────────────────────────────────────────────────── */
function DramaCard({ drama }) {
  return (
    <div className="drama-card rounded-xl p-3" style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}>
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-10 flex-shrink-0 items-center justify-center rounded-xl text-2xl" style={{ background: "rgba(124,58,237,0.15)" }}>
          {drama.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>{drama.title}</p>
            <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5" style={{ background: "rgba(251,191,36,0.15)", color: "#fbbf24" }}>★ {drama.rating}</span>
          </div>
          <p className="text-[11px] mt-0.5 mb-1" style={{ color: "rgba(196,181,253,0.8)" }}>{drama.genre} · {drama.year}</p>
          <p className="text-[11px] leading-5" style={{ color: "var(--text-muted)" }}>{drama.description}</p>
        </div>
      </div>
      <a
        href={drama.watch_url}
        target="_blank"
        rel="noreferrer"
        className="mt-2.5 flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all hover:-translate-y-px"
        style={{ background: "rgba(124,58,237,0.15)", border: "1px solid rgba(124,58,237,0.3)", color: "#a78bfa" }}
      >
        <Tv2 size={12} /> Watch Now <ExternalLink size={11} />
      </a>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   METRIC CARD
───────────────────────────────────────────────────────────── */
function MetricCard({ icon: Icon, label, value, tone }) {
  const tones = {
    rose:  { bg: "rgba(251,113,133,0.08)", border: "rgba(251,113,133,0.2)",  color: "#fca5a5" },
    teal:  { bg: "rgba(94,234,212,0.08)",  border: "rgba(94,234,212,0.22)",  color: "#5eead4" },
    sky:   { bg: "rgba(125,211,252,0.08)", border: "rgba(125,211,252,0.2)",  color: "#7dd3fc" },
    amber: { bg: "rgba(251,191,36,0.08)",  border: "rgba(251,191,36,0.2)",   color: "#fbbf24" },
  };
  const t = tones[tone] || tones.teal;
  return (
    <div className="rounded-xl p-3" style={{ background: t.bg, border: `1px solid ${t.border}` }}>
      <div className="flex items-center gap-2 mb-2" style={{ color: t.color }}>
        <Icon size={12} />
        <span className="mono text-[10px] font-bold uppercase tracking-[.14em]">{label}</span>
      </div>
      <p className="text-[15px] font-bold" style={{ color: "var(--text-primary)" }}>{value}</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   HEALING ACTION CARD
───────────────────────────────────────────────────────────── */
function HealingActionCard({ label, detail, emoji, color, onClick }) {
  return (
    <button
      onClick={onClick}
      className="overflow-hidden rounded-xl text-left transition-all hover:-translate-y-0.5"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(94,234,212,0.1)" }}
    >
      <div className="flex h-11 items-center px-3" style={{ background: color }}>
        <span className="text-xl">{emoji}</span>
      </div>
      <div className="px-3 py-2.5">
        <p className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>{label}</p>
        <p className="mt-0.5 text-[11px]" style={{ color: "var(--text-muted)" }}>{detail}</p>
      </div>
    </button>
  );
}
