import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  Code2,
  FileText,
  Link2,
  Loader2,
  Mail,
  MessageSquare,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  UserRound,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import CommandButton from "../components/CommandButton.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import SkeletonBlock from "../components/SkeletonBlock.jsx";
import {
  analyzeMeetingApi,
  clearMeetingsApi,
  generateEmailsApi,
  generateReportApi,
  getMeetingsApi,
  ingestMeetingEmbedApi,
  ingestMeetingLinkApi,
  meetingChatApi,
  sendEmailApi,
  uploadMeetingApi,
} from "../services/api.js";
import { sampleTranscript } from "../utils/mockData.js";

const apiBaseLabel = import.meta.env.DEV ? "the local Vite API proxy (/api)" : import.meta.env.VITE_API_URL || "the configured backend API";

const fallbackAnalytics = {
  total_meetings: 0,
  pending_actions: 0,
  blocker_count: 0,
  risk_count: 0,
  productivity_score: 0,
  meetings: [],
};

const tabs = [
  { id: "upload", label: "Meeting Upload", icon: UploadCloud },
  { id: "analysis", label: "AI Analysis Dashboard", icon: BrainCircuit },
  { id: "reports", label: "Reports & Emails", icon: Mail },
  { id: "history", label: "LIA Meeting Agentic AI", icon: BarChart3 },
];

const ingestionModes = [
  { id: "file", label: "File Upload", icon: UploadCloud },
  { id: "paste", label: "Paste Text", icon: FileText },
  { id: "link", label: "Meeting Link", icon: Link2 },
  { id: "embed", label: "Embed Code", icon: Code2 },
];

const ingestionAnimation = [
  "AI Ingesting Meeting Intelligence...",
  "Validating Enterprise Source...",
  "Retrieving Meeting Metadata...",
  "Analyzing Transcript...",
  "Generating Operational Insights...",
];

export default function MeetingSummarizer() {
  const [active, setActive] = useState("upload");
  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState(sampleTranscript);
  const [preview, setPreview] = useState(sampleTranscript);
  const [file, setFile] = useState(null);
  const [ingestionMode, setIngestionMode] = useState("paste");
  const [meetingLink, setMeetingLink] = useState("https://teams.microsoft.com/l/meetup-join/19%3ameeting_delivery_readiness");
  const [embedCode, setEmbedCode] = useState('<iframe src="https://web.microsoftstream.com/embed/video/delivery-readiness-review" width="640" height="360"></iframe>');
  const [sourcePreview, setSourcePreview] = useState(null);
  const [ingestionStatus, setIngestionStatus] = useState("");
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [uploaded, setUploaded] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [report, setReport] = useState(null);
  const [emails, setEmails] = useState([]);
  const [analytics, setAnalytics] = useState(fallbackAnalytics);
  const [archiveQuery, setArchiveQuery] = useState("");
  const [archiveCategory, setArchiveCategory] = useState("All");
  const [archiveRisk, setArchiveRisk] = useState("All");
  const [archiveDelivery, setArchiveDelivery] = useState("All");
  const [archiveActions, setArchiveActions] = useState("All");
  const [chatOpen, setChatOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const selectedMeetingId = analysis?.id || uploaded?.id;
  const hasTranscript = Boolean(uploaded?.id || transcript.trim() || preview.trim());
  const linkLooksValid = /^https?:\/\/\S+\.\S+/.test(meetingLink.trim());
  const embedLooksValid = /<iframe|https?:\/\//i.test(embedCode.trim());
  const archiveIntelligence = useMemo(
    () => buildArchiveIntelligence(analytics.meetings || [], { query: archiveQuery, category: archiveCategory, risk: archiveRisk, delivery: archiveDelivery, actions: archiveActions }),
    [analytics.meetings, archiveQuery, archiveCategory, archiveRisk, archiveDelivery, archiveActions],
  );

  useEffect(() => {
    refreshAnalytics();
  }, []);

  async function refreshAnalytics() {
    try {
      setAnalytics(await getMeetingsApi());
    } catch {
      setAnalytics(fallbackAnalytics);
    }
  }

  async function clearHistoricalAnalytics() {
    const confirmed = window.confirm("Clear all historical meeting analytics, reports, emails, and action items?");
    if (!confirmed) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await clearMeetingsApi();
      setAnalytics(result);
      setUploaded(null);
      setAnalysis(null);
      setReport(null);
      setEmails([]);
      setAnalysisComplete(false);
    } catch (err) {
      setError(apiErrorMessage(err, "Historical analytics could not be cleared."));
    } finally {
      setLoading(false);
    }
  }

  async function handleFileChange(event) {
    const selected = event.target.files?.[0];
    setFile(selected || null);
    if (!selected) {
      return;
    }
    if (selected.name.toLowerCase().endsWith(".txt")) {
      setPreview(await selected.text());
    } else {
      setPreview("DOCX transcript selected. Preview will be extracted by the Meeting Intelligence backend during upload.");
    }
  }

  async function uploadTranscript() {
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("title", title);
      if (file) {
        formData.append("file", file);
      } else {
        formData.append("transcript_text", transcript);
      }
      const result = await uploadMeetingApi(formData);
      setUploaded(result);
      setPreview(result.transcript_text || result.transcript_preview);
      setTranscript(result.transcript_text || result.transcript_preview);
      setActive("analysis");
      await refreshAnalytics();
    } catch (err) {
      setError(apiErrorMessage(err, "Transcript upload failed. Check that the backend is running and reachable on port 8000."));
    } finally {
      setLoading(false);
    }
  }

  async function ingestLink() {
    setLoading(true);
    setError("");
    setIngestionStatus(ingestionAnimation[0]);
    let timerIndex = 0;
    const timer = window.setInterval(() => {
      timerIndex = Math.min(timerIndex + 1, ingestionAnimation.length - 1);
      setIngestionStatus(ingestionAnimation[timerIndex]);
    }, 650);
    try {
      const result = await ingestMeetingLinkApi({ title, source_url: meetingLink });
      setUploaded(result);
      setSourcePreview(result);
      setPreview(result.transcript_text || result.transcript_preview);
      setTranscript(result.transcript_text || result.transcript_preview);
      setActive("analysis");
      await refreshAnalytics();
    } catch (err) {
      setError(apiErrorMessage(err, "Meeting link ingestion failed. Check the source URL and backend connectivity."));
    } finally {
      window.clearInterval(timer);
      setIngestionStatus("");
      setLoading(false);
    }
  }

  async function ingestEmbed() {
    setLoading(true);
    setError("");
    setIngestionStatus(ingestionAnimation[0]);
    let timerIndex = 0;
    const timer = window.setInterval(() => {
      timerIndex = Math.min(timerIndex + 1, ingestionAnimation.length - 1);
      setIngestionStatus(ingestionAnimation[timerIndex]);
    }, 650);
    try {
      const result = await ingestMeetingEmbedApi({ title, embed_code: embedCode });
      setUploaded(result);
      setSourcePreview(result);
      setPreview(result.transcript_text || result.transcript_preview);
      setTranscript(result.transcript_text || result.transcript_preview);
      setActive("analysis");
      await refreshAnalytics();
    } catch (err) {
      setError(apiErrorMessage(err, "Embed ingestion failed. Check the embed code and backend connectivity."));
    } finally {
      window.clearInterval(timer);
      setIngestionStatus("");
      setLoading(false);
    }
  }

  async function analyzeTranscript() {
    if (!hasTranscript) {
      setError("No transcript is ready yet. Paste text, upload a transcript, or ingest a meeting source first.");
      return;
    }
    setLoading(true);
    setError("");
    setAnalysisComplete(false);
    setAnalysis(null);
    setActive("analysis");
    try {
      const payload = uploaded?.id ? { meeting_id: uploaded.id, transcript: preview || transcript } : { title, transcript: transcript || preview };
      const result = await analyzeMeetingApi(payload);
      setAnalysis(result);
      setAnalysisComplete(true);
      await refreshAnalytics();
    } catch (err) {
      setError(apiErrorMessage(err, "OpenAI meeting analysis failed. Check backend logs and OPENAI_API_KEY."));
    } finally {
      setLoading(false);
    }
  }

  async function generateOutputs() {
    if (!selectedMeetingId) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const reportResult = await generateReportApi({ meeting_id: selectedMeetingId });
      setReport(reportResult);

      const emailResult = await generateEmailsApi({ meeting_id: selectedMeetingId });
      setEmails(emailResult);
      setActive("reports");
      await refreshAnalytics();
    } catch (err) {
      setError(apiErrorMessage(err, "Report or email generation failed. The meeting record is reachable, but one output service returned an error."));
    } finally {
      setLoading(false);
    }
  }

  const activeMeetingSummary = useMemo(() => analysis?.summary || "Upload or paste a Microsoft Teams transcript, then run MeetingAgent analysis.", [analysis]);

  return (
    <div>
      {/* ── Agent Hero Header ── */}
      <div
        className="agent-card mb-5 rounded-xl p-5"
        style={{ border: "1px solid var(--neon-strong)", boxShadow: "var(--glow-neon)" }}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <BrainCircuit size={14} style={{ color: "var(--neon)" }} />
              <p className="mono text-[10px] font-bold uppercase tracking-[.28em]" style={{ color: "var(--neon)" }}>
                // MeetingAgent · Neural Intelligence
              </p>
              <span className="status-live mono text-[10px] ml-2">ACTIVE</span>
            </div>
            <h1 className="text-2xl font-bold md:text-3xl" style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--text-primary)" }}>
              Meeting Intelligence
            </h1>
            <p className="mt-2 max-w-2xl text-[13px] leading-6" style={{ color: "var(--text-secondary)" }}>
              Upload transcripts · Generate operational analysis · Ask LIA about risks, blockers, and stakeholder follow-up.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              id="lia-chat-btn"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold transition-all hover:-translate-y-0.5"
              style={{
                background: "var(--violet-dim)",
                border: "1px solid rgba(124,58,237,0.28)",
                color: "var(--violet)",
              }}
              onClick={() => setChatOpen(true)}
              title={selectedMeetingId ? "Open LIA Chat" : "Analyze a transcript first to activate LIA Chat"}
            >
              <MessageSquare size={15} />
              LIA Chat
            </button>
            <CommandButton icon={loading ? Loader2 : Sparkles} onClick={analyzeTranscript} disabled={loading || !hasTranscript}>
              {loading ? "Agent Analyzing..." : "Run MeetingAgent"}
            </CommandButton>
          </div>
        </div>
      </div>

      {/* ── Tab Navigation ── */}
      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            onClick={() => setActive(tab.id)}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold transition-all duration-200"
            style={active === tab.id
              ? { background: "var(--neon-dim)", border: "1px solid var(--border-strong)", color: "var(--neon)", boxShadow: "var(--glow-neon)" }
              : { background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }
            }
          >
            <tab.icon size={14} />
            <span className="mono">{tab.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {chatOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex justify-end"
            style={{ background: "rgba(2,11,24,0.7)", backdropFilter: "blur(8px)" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={(e) => e.target === e.currentTarget && setChatOpen(false)}
          >
            <motion.aside
              initial={{ x: 440 }} animate={{ x: 0 }} exit={{ x: 440 }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="thin-scroll h-full w-full max-w-[440px] overflow-y-auto p-5 shadow-2xl"
              style={{ background: "var(--sidebar-bg)", borderLeft: "1px solid var(--border-strong)", boxShadow: "var(--shadow-neon)" }}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="mono text-[10px] font-bold uppercase tracking-[.28em]" style={{ color: "var(--violet)" }}>// LIA Conversational AI</p>
                  <h2 className="mt-1 text-xl font-bold" style={{ color: "var(--text-primary)" }}>Meeting Copilot</h2>
                </div>
                <button
                  className="rounded-xl px-3 py-2 text-[12px] font-bold transition-all hover:bg-white/10"
                  style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
                  onClick={() => setChatOpen(false)}
                >Close</button>
              </div>
              {selectedMeetingId ? (
                <LiaConversationalPanel meetingId={selectedMeetingId} />
              ) : (
                <div className="rounded-xl p-5" style={{ background: "var(--violet-dim)", border: "1px solid rgba(124,58,237,0.25)" }}>
                  <p className="mono text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--violet)" }}>⚡ Awaiting Analysis</p>
                  <p className="mt-2 text-[13px] leading-6" style={{ color: "var(--text-secondary)" }}>Upload or paste a transcript, run MeetingAgent, then ask about risks, owners, escalation and preparation.</p>
                </div>
              )}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-5 rounded-xl p-4"
            style={{ background: "var(--rose-dim)", border: "1px solid rgba(251,75,110,0.25)", boxShadow: "0 0 20px rgba(251,75,110,0.08)" }}
          >
            <div className="flex items-center gap-3">
              <AlertTriangle size={16} style={{ color: "var(--rose)", flexShrink: 0 }} />
              <div>
                <p className="mono text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--rose)" }}>⚠ Agent Workflow Error</p>
                <p className="mt-1 text-[13px]" style={{ color: "var(--text-secondary)" }}>{error}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {analysisComplete && active === "analysis" && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-5 rounded-xl p-4"
            style={{ background: "var(--emerald-dim)", border: "1px solid rgba(0,255,163,0.2)", boxShadow: "0 0 20px rgba(0,255,163,0.08)" }}
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 size={16} className="agent-pulse" style={{ color: "var(--emerald)", flexShrink: 0 }} />
              <div>
                <p className="mono text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--emerald)" }}>✓ MeetingAgent Analysis Complete</p>
                <p className="mt-1 text-[13px]" style={{ color: "var(--text-secondary)" }}>Summary, actions, risks, blockers and stakeholder intelligence ready.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {active === "upload" && (
          <motion.div key="upload" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
            {/* Left: Ingestion Panel */}
            <section className="agent-card rounded-xl p-5">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "var(--neon-dim)", color: "var(--neon)" }}>
                  <UploadCloud size={16} />
                </div>
                <div>
                  <p className="mono text-[10px] font-bold uppercase tracking-[.24em]" style={{ color: "var(--neon)" }}>// Data Ingestion</p>
                  <h2 className="text-[15px] font-bold" style={{ color: "var(--text-primary)" }}>Multi-Source Meeting Ingestion</h2>
                </div>
              </div>

              {/* Ingestion mode pills */}
              <div className="mb-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {ingestionModes.map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => setIngestionMode(mode.id)}
                    className="flex items-center gap-2 rounded-xl px-3 py-2.5 text-[12px] font-bold transition-all"
                    style={ingestionMode === mode.id
                      ? { background: "var(--neon-dim)", border: "1px solid var(--border-strong)", color: "var(--neon)", boxShadow: "var(--glow-neon)" }
                      : { background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }
                    }
                  >
                    <mode.icon size={14} />
                    <span className="mono">{mode.label}</span>
                  </button>
                ))}
              </div>

              {/* Meeting Title */}
              <label className="block">
                <p className="mono mb-2 text-[10px] font-bold uppercase tracking-[.2em]" style={{ color: "var(--text-muted)" }}>Meeting Title</p>
                <input
                  className="w-full rounded-xl px-4 py-3 text-[13px] outline-none transition-all focus:shadow-neon-sm"
                  style={{ background: "var(--neon-dim)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "JetBrains Mono, monospace" }}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Enter meeting name or leave blank for auto-extract"
                />
              </label>

              {ingestionMode === "file" && (
                <label className="mt-4 block">
                  <p className="mono mb-2 text-[10px] font-bold uppercase tracking-[.2em]" style={{ color: "var(--text-muted)" }}>Upload .txt or .docx</p>
                  <input
                    className="w-full rounded-xl px-4 py-3 text-[13px] file:mr-3 file:rounded-lg file:border-0 file:px-3 file:py-1 file:text-[11px] file:font-bold"
                    style={{ background: "var(--neon-dim)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}
                    type="file" accept=".txt,.docx" onChange={handleFileChange}
                  />
                </label>
              )}

              {ingestionMode === "paste" && (
                <textarea
                  className="thin-scroll mt-4 min-h-[280px] w-full resize-none rounded-xl p-4 text-[13px] leading-6 outline-none transition-all"
                  style={{ background: "rgba(0,212,255,0.04)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "JetBrains Mono, monospace", fontSize: "12px" }}
                  value={transcript}
                  onChange={(event) => { setTranscript(event.target.value); if (!file) setPreview(event.target.value); }}
                />
              )}

              {ingestionMode === "link" && (
                <div className="mt-4 space-y-4">
                  <label className="block">
                    <p className="mono mb-2 text-[10px] font-bold uppercase tracking-[.2em]" style={{ color: "var(--text-muted)" }}>Teams / Stream / SharePoint Link</p>
                    <input
                      className="w-full rounded-xl px-4 py-3 text-[12px] outline-none transition-all"
                      style={{ background: "var(--neon-dim)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "JetBrains Mono, monospace" }}
                      value={meetingLink} onChange={(event) => setMeetingLink(event.target.value)}
                    />
                  </label>
                  <SourceHint value={meetingLink} valid={linkLooksValid} />
                  {linkLooksValid && <TranscriptReadiness ready={Boolean(sourcePreview)} />}
                </div>
              )}

              {ingestionMode === "embed" && (
                <div className="mt-4 space-y-4">
                  <label className="block">
                    <p className="mono mb-2 text-[10px] font-bold uppercase tracking-[.2em]" style={{ color: "var(--text-muted)" }}>Iframe / HTML Embed Snippet</p>
                    <textarea
                      className="thin-scroll mt-2 min-h-[170px] w-full resize-none rounded-xl p-4 text-[12px] leading-6 outline-none"
                      style={{ background: "var(--neon-dim)", border: "1px solid var(--border)", color: "var(--text-primary)", fontFamily: "JetBrains Mono, monospace" }}
                      value={embedCode} onChange={(event) => setEmbedCode(event.target.value)}
                    />
                  </label>
                  <SourceHint value={extractPreviewUrl(embedCode)} valid={embedLooksValid} embed />
                  {embedLooksValid && <TranscriptReadiness ready={Boolean(sourcePreview)} />}
                </div>
              )}

              {/* Ingestion Status */}
              <AnimatePresence>
                {loading && ingestionStatus && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
                    className="mt-4 rounded-xl p-4"
                    style={{ background: "var(--neon-dim)", border: "1px solid var(--border-strong)", boxShadow: "var(--glow-neon)" }}
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <Sparkles size={14} className="agent-pulse" style={{ color: "var(--neon)" }} />
                      <p className="mono text-[12px] font-bold" style={{ color: "var(--neon)" }}>{ingestionStatus}</p>
                    </div>
                    <ProgressBar value={(Math.max(1, ingestionAnimation.indexOf(ingestionStatus) + 1) / ingestionAnimation.length) * 100} color="neon" showLabel />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Buttons */}
              <div className="mt-5 flex flex-wrap gap-3">
                {["file", "paste"].includes(ingestionMode) && (
                  <CommandButton icon={loading ? Loader2 : UploadCloud} onClick={uploadTranscript} disabled={loading || !hasTranscript}>
                    {loading ? "Uploading..." : "Upload Transcript"}
                  </CommandButton>
                )}
                {ingestionMode === "link" && (
                  <CommandButton icon={loading ? Loader2 : Link2} onClick={ingestLink} disabled={loading || !linkLooksValid}>
                    {loading ? "Ingesting..." : "Ingest Meeting Link"}
                  </CommandButton>
                )}
                {ingestionMode === "embed" && (
                  <CommandButton icon={loading ? Loader2 : Code2} onClick={ingestEmbed} disabled={loading || !embedLooksValid}>
                    {loading ? "Ingesting..." : "Ingest Embed Code"}
                  </CommandButton>
                )}
                <button
                  className="rounded-xl px-4 py-2.5 text-[13px] font-bold transition-all hover:bg-white/10"
                  style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
                  onClick={() => { setFile(null); setTranscript(sampleTranscript); setPreview(sampleTranscript); }}
                >
                  Use Sample
                </button>
              </div>
            </section>

            {/* Right: Transcript Preview */}
            <section className="agent-card rounded-xl p-5">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "var(--violet-dim)", color: "var(--violet)" }}>
                  <FileText size={16} />
                </div>
                <div>
                  <p className="mono text-[10px] font-bold uppercase tracking-[.24em]" style={{ color: "var(--violet)" }}>// Transcript Buffer</p>
                  <h2 className="text-[15px] font-bold" style={{ color: "var(--text-primary)" }}>{sourcePreview ? "Source Metadata & Transcript" : "Transcript Preview"}</h2>
                </div>
              </div>
              {sourcePreview && <MetadataPreview source={sourcePreview} embedCode={embedCode} />}
              {!sourcePreview && <TranscriptReadiness ready={hasTranscript} />}
              <textarea
                className="thin-scroll min-h-[420px] w-full resize-none rounded-xl p-5 text-[12px] leading-7 outline-none"
                style={{ background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.2)", color: "var(--text-secondary)", fontFamily: "JetBrains Mono, monospace" }}
                value={preview}
                onChange={(event) => { setPreview(event.target.value); setTranscript(event.target.value); }}
              />
              <p className="mono mt-3 text-[10px]" style={{ color: "var(--text-muted)" }}>
                ▸ Edit this transcript before analysis. MeetingAgent will process exactly this text.
              </p>
            </section>
          </motion.div>
        )}

        {active === "analysis" && (
          <motion.div key="analysis" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-5">
            <section className="agent-card rounded-xl p-5">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="mono text-[10px] font-bold uppercase tracking-[.24em]" style={{ color: "var(--neon)" }}>// MeetingAgent · Operational Decision Intelligence</p>
                  <h2 className="mt-1 text-xl font-bold" style={{ color: "var(--text-primary)" }}>AI Analysis Dashboard</h2>
                </div>
                <CommandButton icon={Send} onClick={generateOutputs} disabled={loading || !selectedMeetingId}>
                  Generate Reports & Emails
                </CommandButton>
              </div>
              {loading ? <AnalysisSkeleton /> : <AnalysisView analysis={analysis} summary={activeMeetingSummary} meetingId={selectedMeetingId} />}
            </section>
          </motion.div>
        )}

        {active === "reports" && (
          <motion.div key="reports" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="grid gap-6 xl:grid-cols-[.9fr_1.1fr]">
            <ReportPanel report={report} onGenerate={generateOutputs} loading={loading} />
            <EmailPanel emails={emails} onSend={sendEmailApi} onError={setError} />
          </motion.div>
        )}

        {active === "history" && (
          <motion.div key="history" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="space-y-5">
            <section className="agent-card rounded-xl p-5">
              <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-start">
                <div>
                  <p className="mono text-[10px] font-bold uppercase tracking-[.24em]" style={{ color: "var(--neon)" }}>// MeetingAgent · Intelligence Repository</p>
                  <h2 className="mt-1 text-xl font-bold" style={{ color: "var(--text-primary)" }}>Enterprise Operational Intelligence</h2>
                  <p className="mt-1 max-w-3xl text-[13px]" style={{ color: "var(--text-muted)" }}>Persistent visibility into meeting risks, ownership, reporting status, and stakeholder communications.</p>
                </div>
                <button
                  className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[12px] font-bold transition-all disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ background: "var(--rose-dim)", border: "1px solid rgba(251,75,110,0.25)", color: "var(--rose)" }}
                  onClick={clearHistoricalAnalytics}
                  disabled={loading || !analytics.meetings?.length}
                >
                  <Trash2 size={14} />
                  Clear Archive
                </button>
              </div>

              <div className="grid gap-4 xl:grid-cols-[.8fr_1.2fr]">
                <ArchiveRiskPieChart data={archiveIntelligence.riskChart} total={archiveIntelligence.totalMeetings} />
                <ArchiveTrendLine data={archiveIntelligence.trendLine} />
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-4">
                <ArchiveSummaryTile label="Meetings" value={archiveIntelligence.totalMeetings} detail="Analyzed records" tone="neon" />
                <ArchiveSummaryTile label="Open Actions" value={archiveIntelligence.openActions} detail="Not completed" tone="amber" />
                <ArchiveSummaryTile label="Risks" value={archiveIntelligence.totalRisks} detail="Risks + blockers" tone="rose" />
                <ArchiveSummaryTile label="Emails Sent" value={archiveIntelligence.communication.sent} detail="Stakeholder delivery" tone="emerald" />
              </div>

              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <ArchivePanel title="Priority Alerts" eyebrow="Top items only">
                  <div className="space-y-3">
                    {archiveIntelligence.alerts.slice(0, 4).map((item) => (
                      <ArchiveAlert key={`${item.meeting.id}-${item.text}`} item={item} />
                    ))}
                    {!archiveIntelligence.alerts.length && (
                      <p className="rounded-xl p-4 text-[12px]" style={{ background: "rgba(255,255,255,0.03)", color: "var(--text-muted)" }}>No urgent alerts in the current archive.</p>
                    )}
                  </div>
                </ArchivePanel>
                <ArchivePanel title="Owner Workload" eyebrow="Open action accountability">
                  <OwnerBarChart owners={archiveIntelligence.owners.slice(0, 6)} />
                </ArchivePanel>
              </div>

              <ArchiveFilters
                query={archiveQuery}
                setQuery={setArchiveQuery}
                category={archiveCategory}
                setCategory={setArchiveCategory}
                risk={archiveRisk}
                setRisk={setArchiveRisk}
                delivery={archiveDelivery}
                setDelivery={setArchiveDelivery}
                actions={archiveActions}
                setActions={setArchiveActions}
                categories={archiveIntelligence.categories}
              />

              <div className="mt-4 grid gap-3">
                {archiveIntelligence.filteredMeetings.map((meeting) => (
                  <ArchiveRecordCard key={meeting.id} meeting={meeting} />
                ))}
                {archiveIntelligence.filteredMeetings.length === 0 && (
                  <p className="rounded-xl p-4 text-[12px]" style={{ background: "rgba(255,255,255,0.03)", color: "var(--text-muted)" }}>No archive records match the current filters.</p>
                )}
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function AnalysisView({ analysis, summary, meetingId }) {
  const intelligence = analysis ? buildOperationalIntelligence(analysis, summary) : null;
  return (
    <div>
      {analysis ? (
        <div className="space-y-5">
          <DeliveryHealthBanner intelligence={intelligence} />

          <div className="grid gap-5 xl:grid-cols-[1fr_.8fr]">
            <section className="rounded-lg border border-rose-300/20 bg-rose-300/10 p-5 light:bg-rose-50">
              <div className="flex items-center gap-3">
                <AlertTriangle className="text-rose-200 light:text-rose-700" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[.18em] text-rose-100 light:text-rose-700">Needs Immediate Attention</p>
                  <h3 className="text-lg font-black">Escalations, blockers, and urgent dependencies</h3>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {intelligence.attentionItems.map((item) => (
                  <div key={item.text} className="rounded-lg border border-white/10 bg-black/15 p-4 light:border-rose-100 light:bg-white">
                    <div className="flex flex-wrap items-center gap-2">
                      <ArchiveBadge tone={item.tone} label={item.label} />
                      <span className="text-xs font-bold uppercase tracking-[.12em] text-white/45 light:text-slate-500">{item.type}</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-white/74 light:text-slate-700">{item.text}</p>
                  </div>
                ))}
              </div>
            </section>

            <div className="space-y-5">
              <section className="rounded-lg border border-teal-300/20 bg-teal-300/10 p-5 light:bg-teal-50">
                <div className="flex items-center gap-3">
                  <BrainCircuit className="agent-pulse text-teal-200 light:text-teal-700" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[.18em] text-teal-200 light:text-teal-700">AI Operational Insight</p>
                    <h3 className="text-lg font-black">Decision signal</h3>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-teal-50 light:text-teal-900">{intelligence.insight}</p>
                <div className="mt-4 grid gap-2 text-xs font-bold sm:grid-cols-2">
                  <ArchiveBadge tone={intelligence.tone} label={`${intelligence.status} Delivery Status`} />
                  <ArchiveBadge tone="sky" label={`${analysis.stakeholders?.length || 0} Stakeholders Detected`} />
                </div>
              </section>

              <LiaConversationalPanel meetingId={meetingId || analysis.id} />
            </div>
          </div>

          <section className="rounded-lg border border-white/10 bg-white/7 p-5 light:bg-white/70">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.18em] text-teal-200 light:text-teal-700">Readiness Scorecard</p>
                <h3 className="text-lg font-black">Operational readiness by delivery area</h3>
              </div>
              <ArchiveBadge tone={intelligence.tone} label={`Confidence: ${intelligence.confidence}%`} />
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {intelligence.readiness.map((item) => (
                <ReadinessCard key={item.label} item={item} />
              ))}
            </div>
          </section>

          <section className="overflow-hidden rounded-lg border border-white/10 bg-white/7 light:bg-white/70">
            <div className="border-b border-white/10 p-5 light:border-slate-200">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-teal-200 light:text-teal-700">Priority Action Table</p>
              <h3 className="text-lg font-black">Accountability and follow-up tracking</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-white/10 text-white/65 light:bg-slate-100 light:text-slate-600">
                  <tr>
                    <th className="p-3">Priority</th>
                    <th className="p-3">Owner</th>
                    <th className="p-3">Action</th>
                    <th className="p-3">Deadline</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {intelligence.actions.map((item) => (
                    <tr key={`${item.owner}-${item.task}`} className="border-t border-white/10 light:border-slate-200">
                      <td className="p-3"><ArchiveBadge tone={priorityTone(item.priority)} label={item.priority || "Medium"} /></td>
                      <td className="p-3 font-bold">{item.owner || "Unassigned"}</td>
                      <td className="p-3 leading-6">{item.task}</td>
                      <td className="p-3">{item.deadline || "TBD"}</td>
                      <td className="p-3"><ArchiveBadge tone={statusTone(item.status)} label={item.status || "Pending"} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid gap-5 xl:grid-cols-2">
            <OperationalWidget title="Next Meeting Preparation" eyebrow="Readiness for next checkpoint" items={intelligence.nextMeeting} tone="amber" />
            <OperationalWidget title="AI Recommended Actions" eyebrow="Mitigation and stabilization guidance" items={intelligence.recommendations} tone="teal" />
          </div>

          <div className="grid gap-5 xl:grid-cols-[.9fr_1.1fr]">
            <section className="rounded-lg border border-white/10 bg-white/7 p-5 light:bg-white/70">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-sky-200 light:text-sky-700">Operational Timeline</p>
              <h3 className="text-lg font-black">Execution path and checkpoints</h3>
              <div className="mt-4 space-y-3">
                {intelligence.timeline.map((item) => (
                  <div key={`${item.when}-${item.text}`} className="rounded-lg border border-white/10 bg-black/15 p-4 light:border-slate-200 light:bg-slate-50">
                    <p className="text-xs font-bold uppercase tracking-[.14em] text-sky-200 light:text-sky-700">{item.when}</p>
                    <p className="mt-2 text-sm leading-6 text-white/70 light:text-slate-700">{item.text}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-lg border border-white/10 bg-white/7 p-5 light:bg-white/70">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-teal-200 light:text-teal-700">Stakeholder Impact</p>
              <h3 className="text-lg font-black">Operational impact by audience</h3>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {intelligence.impact.map((item) => (
                  <div key={item.group} className="rounded-lg border border-white/10 bg-black/15 p-4 light:border-slate-200 light:bg-slate-50">
                    <p className="font-bold">{item.group}</p>
                    <p className="mt-2 text-sm leading-6 text-white/62 light:text-slate-600">{item.text}</p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      ) : (
        <p className="mt-4 rounded-lg bg-white/7 p-4 text-sm text-white/60 light:bg-white/70 light:text-slate-600">No analysis yet. Upload a transcript and run analysis to generate structured intelligence.</p>
      )}
    </div>
  );
}

function LiaConversationalPanel({ meetingId }) {
  const quickPrompts = [
    "What requires immediate attention?",
    "Who owns the critical follow-ups?",
    "Draft a manager update email.",
    "Draft a learner consultation follow-up.",
    "What should I escalate to management?",
    "How should we prepare for the next meeting?",
  ];
  const [question, setQuestion] = useState(quickPrompts[0]);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Ask LIA about risks, owners, escalation, learner impact, or next meeting readiness for this analyzed meeting.",
      actions: [],
      confidence: "Ready",
    },
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");
  const [sendingDraftId, setSendingDraftId] = useState(null);

  async function askLia(prompt = question) {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || !meetingId) {
      return;
    }
    setChatLoading(true);
    setChatError("");
    setMessages((items) => [...items, { role: "user", text: cleanPrompt }]);
    setQuestion("");
    try {
      const result = await meetingChatApi({ meeting_id: meetingId, question: cleanPrompt });
      setMessages((items) => [
        ...items,
        {
          role: "assistant",
          text: result.answer,
          actions: result.suggested_actions || [],
          confidence: result.confidence || "Medium",
          emailDraft: result.email_draft || null,
          emailSent: result.email_sent || false,
        },
      ]);
    } catch (err) {
      setChatError(apiErrorMessage(err, "LIA Conversational AI could not answer right now."));
    } finally {
      setChatLoading(false);
    }
  }

  function updateDraft(messageIndex, patch) {
    setMessages((items) =>
      items.map((item, index) =>
        index === messageIndex && item.emailDraft ? { ...item, emailDraft: { ...item.emailDraft, ...patch } } : item,
      ),
    );
  }

  async function copyDraft(draft) {
    await navigator.clipboard.writeText(`To: ${(draft.recipients || []).join(", ")}\nSubject: ${draft.subject}\n\n${draft.body}`);
  }

  async function sendDraft(draft, messageIndex) {
    const recipients = Array.isArray(draft.recipients)
      ? draft.recipients
      : String(draft.recipients || "").split(/[;,]/).map((item) => item.trim()).filter(Boolean);
    setSendingDraftId(draft.id || messageIndex);
    setChatError("");
    try {
      const result = await sendEmailApi({
        email_id: draft.id,
        meeting_id: draft.meeting_id || meetingId,
        recipients,
        subject: draft.subject,
        body: draft.body,
      });
      updateDraft(messageIndex, {
        id: result.email_id || draft.id,
        recipients,
        sent_status: result.sent ? "sent" : "failed",
        send_message: result.message,
      });
    } catch (err) {
      setChatError(apiErrorMessage(err, "LIA could not send the email. Check recipient and SMTP settings."));
    } finally {
      setSendingDraftId(null);
    }
  }

  return (
    <section
      className="rounded-xl p-4"
      style={{ background: "var(--card)", border: "1px solid var(--card-border)" }}
    >
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="agent-pulse flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "var(--violet-dim)", color: "var(--violet)" }}>
            <MessageSquare size={15} />
          </div>
          <div>
            <p className="mono text-[9px] font-bold uppercase tracking-[.28em]" style={{ color: "var(--violet)" }}>// LIA Neural Copilot</p>
            <h3 className="text-[14px] font-bold" style={{ color: "var(--text-primary)" }}>Meeting Copilot</h3>
          </div>
        </div>
        <span className="mono rounded-full px-2.5 py-1 text-[9px] font-bold tracking-widest" style={{ background: "var(--violet-dim)", color: "var(--violet)" }}>CONTEXT AWARE</span>
      </div>

      {/* Quick prompts */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => askLia(prompt)}
            disabled={chatLoading || !meetingId}
            className="rounded-lg px-2.5 py-1.5 text-left text-[11px] font-semibold transition-all hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.16)", color: "var(--text-secondary)" }}
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="thin-scroll max-h-[360px] space-y-3 overflow-y-auto pr-1">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`rounded-xl p-3 ${message.role === "user" ? "ml-6" : ""}`}
            style={message.role === "user"
              ? { background: "rgba(124,58,237,0.10)", border: "1px solid rgba(124,58,237,0.18)" }
              : { background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)" }
            }
          >
            <div className="mb-2 flex items-center gap-2">
              {message.role === "user"
                ? <UserRound size={12} style={{ color: "var(--violet)" }} />
                : <Sparkles size={12} className="agent-pulse" style={{ color: "var(--neon)" }} />
              }
              <span className="mono text-[10px] font-bold uppercase tracking-[.18em]" style={{ color: "var(--text-muted)" }}>
                {message.role === "user" ? "Operator" : "LIA Agent"}
              </span>
              {message.confidence && (
                <span className="mono ml-auto text-[10px] font-bold" style={{ color: "var(--neon)" }}>{message.confidence}</span>
              )}
            </div>
            <p className="whitespace-pre-line text-[13px] leading-6" style={{ color: "var(--text-secondary)" }}>{message.text}</p>
            {message.actions?.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {message.actions.map((action) => (
                  <p key={action} className="rounded-lg px-3 py-2 text-[11px] leading-5"
                    style={{ background: "var(--neon-dim)", border: "1px solid var(--border)", color: "var(--text-secondary)" }}>
                    ▸ {action}
                  </p>
                ))}
              </div>
            )}
            {message.emailDraft && (
              <LiaEmailDraftCard
                draft={message.emailDraft}
                messageIndex={index}
                sending={sendingDraftId === (message.emailDraft.id || index)}
                onChange={updateDraft}
                onCopy={copyDraft}
                onSend={sendDraft}
              />
            )}
          </div>
        ))}
        {chatLoading && (
          <div className="rounded-xl p-3" style={{ background: "var(--violet-dim)", border: "1px solid rgba(124,58,237,0.2)" }}>
            <div className="flex items-center gap-2">
              <Loader2 className="animate-spin" size={14} style={{ color: "var(--violet)" }} />
              <span className="mono text-[11px] font-bold" style={{ color: "var(--violet)" }}>LIA Agent reading operational context...</span>
            </div>
          </div>
        )}
      </div>

      {chatError && (
        <p className="mt-3 rounded-xl p-3 text-[12px]" style={{ background: "var(--rose-dim)", border: "1px solid rgba(251,75,110,0.2)", color: "var(--rose)" }}>
          {chatError}
        </p>
      )}

      {/* Input row */}
      <div className="mt-4 flex gap-2">
        <input
          className="min-w-0 flex-1 rounded-xl px-4 py-2.5 text-[13px] outline-none transition-all"
          style={{
            background: "var(--neon-dim)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            fontFamily: "JetBrains Mono, monospace",
          }}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && askLia()}
          placeholder="Ask about risks, owners, escalation..."
          disabled={chatLoading || !meetingId}
        />
        <button
          id="lia-send-btn"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: "var(--neon)", color: "#020b18" }}
          onClick={() => askLia()}
          disabled={chatLoading || !question.trim() || !meetingId}
        >
          {chatLoading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
        </button>
      </div>
    </section>
  );
}

function LiaEmailDraftCard({ draft, messageIndex, sending, onChange, onCopy, onSend }) {
  const recipientsValue = Array.isArray(draft.recipients) ? draft.recipients.join(", ") : draft.recipients || "";
  const sent = draft.sent_status === "sent";

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-[#B3A124]/25 bg-[#07111f]/75 light:bg-white">
      <div className="border-b border-white/10 bg-[#B3A124]/10 p-3 light:border-slate-200">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[.16em] text-[#e9dc71] light:text-[#8a7d19]">Email Draft</p>
            <p className="mt-1 text-sm font-bold">{draft.audience || "Operational"} Communication</p>
          </div>
          <ArchiveBadge tone={sent ? "teal" : "amber"} label={sent ? "Sent" : "Review Before Send"} />
        </div>
      </div>

      <div className="space-y-3 p-3">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[.12em] text-white/45 light:text-slate-500">Recipients</span>
          <input
            className="mt-2 w-full rounded-lg border border-white/12 bg-black/20 px-3 py-2 text-sm outline-none transition focus:border-[#B3A124] light:bg-slate-50"
            value={recipientsValue}
            onChange={(event) => onChange(messageIndex, { recipients: event.target.value })}
            placeholder="manager@company.com, team@company.com, learner@email.com"
          />
        </label>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[.12em] text-white/45 light:text-slate-500">Subject</span>
          <input
            className="mt-2 w-full rounded-lg border border-white/12 bg-black/20 px-3 py-2 text-sm font-bold outline-none transition focus:border-[#B3A124] light:bg-slate-50"
            value={draft.subject || ""}
            onChange={(event) => onChange(messageIndex, { subject: event.target.value })}
          />
        </label>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-[.12em] text-white/45 light:text-slate-500">Email Body</span>
          <textarea
            className="thin-scroll mt-2 min-h-56 w-full resize-none rounded-lg border border-white/12 bg-black/20 p-3 text-sm leading-6 outline-none transition focus:border-[#B3A124] light:bg-slate-50"
            value={draft.body || ""}
            onChange={(event) => onChange(messageIndex, { body: event.target.value })}
          />
        </label>

        {draft.send_message && (
          <p className={`rounded-lg border p-3 text-xs leading-5 ${sent ? "border-teal-300/20 bg-teal-300/10 text-teal-100 light:text-teal-700" : "border-amber-300/20 bg-amber-300/10 text-amber-100 light:text-amber-700"}`}>
            {draft.send_message}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button className="rounded-lg border border-white/12 px-3 py-2 text-xs font-bold text-white/70 hover:bg-white/10 light:text-slate-600" onClick={() => onCopy(draft)}>
            Copy Draft
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-lg bg-[#B3A124] px-3 py-2 text-xs font-black text-[#10263f] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => onSend(draft, messageIndex)}
            disabled={sending || sent}
          >
            {sending ? <Loader2 className="animate-spin" size={14} /> : <Send size={14} />}
            {sent ? "Sent" : sending ? "Sending..." : "Send Email"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ArchivePanel({ title, eyebrow, children }) {
  return (
    <section className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
      <p className="mono text-[10px] font-bold uppercase tracking-[.22em]" style={{ color: "var(--neon)" }}>{eyebrow}</p>
      <h3 className="mt-1 text-[15px] font-bold" style={{ color: "var(--text-primary)" }}>{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function OperationalHealthCard({ item }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/15 p-4 light:border-slate-200 light:bg-slate-50">
      <div className="flex items-start justify-between gap-3">
        <p className="font-bold">{item.label}</p>
        <ArchiveBadge tone={item.tone} label={item.status} />
      </div>
      <p className="mt-4 text-3xl font-black">{item.score}%</p>
      <ProgressBar value={item.score} />
      <p className="mt-3 text-xs leading-5 text-white/55 light:text-slate-500">{item.detail}</p>
    </div>
  );
}

function ArchiveAlert({ item }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "var(--rose-dim)", border: "1px solid rgba(251,75,110,0.2)" }}>
      <div className="flex flex-wrap items-center gap-2">
        <AlertTriangle size={13} style={{ color: "var(--rose)" }} />
        <ArchiveBadge tone={item.tone} label={item.severity} />
        <span className="mono text-[10px] font-bold uppercase tracking-[.12em]" style={{ color: "var(--text-muted)" }}>{deliveryStatusLabel(item.meeting)}</span>
      </div>
      <p className="mt-3 text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>{archiveMeetingName(item.meeting)}</p>
      <p className="mt-2 text-[12px] leading-5" style={{ color: "var(--text-secondary)" }}>{item.text}</p>
    </div>
  );
}

function ArchiveRiskRow({ item }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/15 p-4 light:border-slate-200 light:bg-slate-50">
      <div className="flex flex-wrap items-center gap-2">
        <ArchiveBadge tone={item.tone} label={item.type} />
        <span className="text-xs font-bold uppercase tracking-[.12em] text-white/45 light:text-slate-500">{archiveMeetingName(item.meeting)}</span>
      </div>
      <p className="mt-3 text-sm leading-6 text-white/70 light:text-slate-700">{item.text}</p>
    </div>
  );
}

function CommunicationStatus({ label, value, tone }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/15 p-4 text-center light:border-slate-200 light:bg-slate-50">
      <p className="text-3xl font-black">{value}</p>
      <ArchiveBadge tone={tone} label={label} />
    </div>
  );
}

function ArchiveSummaryTile({ label, value, detail, tone = "neon" }) {
  const colorMap = {
    neon:    { bg: "var(--neon-dim)",    border: "var(--border-strong)", text: "var(--neon)" },
    amber:   { bg: "var(--amber-dim)",   border: "rgba(251,191,36,0.2)",  text: "var(--amber)" },
    rose:    { bg: "var(--rose-dim)",    border: "rgba(251,75,110,0.2)",  text: "var(--rose)" },
    emerald: { bg: "var(--emerald-dim)", border: "rgba(0,255,163,0.15)",  text: "var(--emerald)" },
  };
  const c = colorMap[tone] || colorMap.neon;
  return (
    <div className="rounded-xl p-4" style={{ background: c.bg, border: `1px solid ${c.border}` }}>
      <p className="mono text-[10px] font-bold uppercase tracking-[.18em]" style={{ color: "var(--text-muted)" }}>{label}</p>
      <p className="mt-2 text-3xl font-bold" style={{ color: c.text, fontFamily: "Space Grotesk, sans-serif" }}>{value}</p>
      <p className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>{detail}</p>
    </div>
  );
}

function ArchiveRiskPieChart({ data, total }) {
  const colors = { "High Risk": "#fb4b6e", "Moderate": "#fbbf24", "On Track": "#00ffa3", "Pending": "#4b6080" };
  let offset = 25;
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  return (
    <section className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
      <p className="mono text-[10px] font-bold uppercase tracking-[.22em]" style={{ color: "var(--rose)" }}>// Risk Distribution</p>
      <div className="mt-4 flex flex-col gap-5 md:flex-row md:items-center">
        <svg viewBox="0 0 100 100" className="h-44 w-44 shrink-0 -rotate-90">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(0,212,255,0.06)" strokeWidth="12" />
          {data.map((item) => {
            const length = total ? (item.value / total) * circumference : 0;
            const dash = `${length} ${circumference - length}`;
            const circle = <circle key={item.label} cx="50" cy="50" r={radius} fill="none" stroke={colors[item.label] || "#00ffa3"} strokeWidth="12" strokeDasharray={dash} strokeDashoffset={-offset} strokeLinecap="round" />;
            offset += length;
            return circle;
          })}
        </svg>
        <div className="grid flex-1 gap-2">
          {data.map((item) => (
            <div key={item.label} className="flex items-center justify-between rounded-lg px-3 py-2 text-[12px]" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border-subtle)" }}>
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[item.label] }} />
                <span style={{ color: "var(--text-secondary)" }}>{item.label}</span>
              </span>
              <span className="mono font-bold" style={{ color: "var(--text-primary)" }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ArchiveTrendLine({ data }) {
  const maxValue = Math.max(1, ...data.map((item) => item.total));
  const points = data.map((item, index) => {
    const x = data.length === 1 ? 50 : 8 + (index * 84) / (data.length - 1);
    const y = 88 - (item.total / maxValue) * 68;
    return { ...item, x, y };
  });
  const line = points.map((point) => `${point.x},${point.y}`).join(" ");
  return (
    <section className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
      <p className="mono text-[10px] font-bold uppercase tracking-[.22em]" style={{ color: "var(--neon)" }}>// Meeting Trend</p>
      <svg viewBox="0 0 100 100" className="mt-4 h-44 w-full">
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--neon)" stopOpacity="0.3" />
            <stop offset="100%" stopColor="var(--neon)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline fill="none" stroke="var(--neon)" strokeWidth="2" points={line} style={{ filter: "drop-shadow(0 0 4px var(--neon))" }} />
        {points.map((point) => <circle key={point.label} cx={point.x} cy={point.y} r="3" fill="var(--violet)" />)}
      </svg>
      <div className="mt-2 grid grid-cols-4 gap-2 text-[10px] mono" style={{ color: "var(--text-muted)" }}>
        {points.map((point) => <span key={point.label}>{point.label}: {point.total}</span>)}
      </div>
    </section>
  );
}

function OwnerBarChart({ owners }) {
  const maxValue = Math.max(1, ...owners.map((owner) => owner.open));
  if (!owners.length) return <p className="rounded-xl p-4 text-[12px]" style={{ background: "rgba(255,255,255,0.03)", color: "var(--text-muted)" }}>No open owner actions yet.</p>;
  return (
    <div className="space-y-3">
      {owners.map((owner) => (
        <div key={owner.owner}>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[12px] font-bold" style={{ color: "var(--text-primary)" }}>{owner.owner}</span>
            <span className="mono text-[10px]" style={{ color: "var(--amber)" }}>{owner.open} open</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
            <div className="h-full rounded-full" style={{ width: `${Math.max(8, (owner.open / maxValue) * 100)}%`, background: "var(--amber)", boxShadow: "0 0 8px rgba(251,191,36,0.4)" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function ArchiveFilters({ query, setQuery, category, setCategory, risk, setRisk, delivery, setDelivery, actions, setActions, categories }) {
  const inputStyle = {
    background: "var(--neon-dim)", border: "1px solid var(--border)",
    color: "var(--text-primary)", fontFamily: "JetBrains Mono, monospace", fontSize: "12px",
  };
  return (
    <section className="mt-4 rounded-xl p-4" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)" }}>
      <p className="mono text-[10px] font-bold uppercase tracking-[.22em]" style={{ color: "var(--neon)" }}>// Search & Filter Archive</p>
      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
        <input className="rounded-xl px-4 py-2.5 text-[12px] outline-none" style={inputStyle} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search meeting, partner, risk..." />
        <ArchiveSelect value={category} onChange={setCategory} options={["All", ...categories]} />
        <ArchiveSelect value={risk} onChange={setRisk} options={["All", "Has Risks", "Has Blockers", "No Risks"]} />
        <ArchiveSelect value={delivery} onChange={setDelivery} options={["All", "High Delivery Risk", "Moderate Risk", "Delivery On Track", "Awaiting AI Review"]} />
        <ArchiveSelect value={actions} onChange={setActions} options={["All", "Unresolved Actions", "No Open Actions"]} />
      </div>
    </section>
  );
}

function ArchiveSelect({ value, onChange, options }) {
  return (
    <select
      className="rounded-xl px-4 py-2.5 text-[12px] outline-none"
      style={{ background: "var(--neon-dim)", border: "1px solid var(--border)", color: "var(--text-secondary)", fontFamily: "JetBrains Mono, monospace" }}
      value={value} onChange={(e) => onChange(e.target.value)}
    >
      {options.map((option) => <option key={option} value={option}>{option}</option>)}
    </select>
  );
}

function ArchiveRecordCard({ meeting }) {
  return (
    <div
      className="rounded-xl p-4 transition-all hover:-translate-y-0.5"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", boxShadow: "var(--shadow-card)" }}
    >
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="mono text-[10px] font-bold uppercase tracking-[.18em]" style={{ color: "var(--neon)" }}>// Meeting Intelligence Record</p>
            <ArchiveBadge tone="sky" label={meeting.operational_category || "Operational Intelligence"} />
          </div>
          <h3 className="mt-2 text-[15px] font-bold" style={{ color: "var(--text-primary)" }}>{archiveMeetingName(meeting)}</h3>
          <div className="mono mt-3 grid gap-1.5 text-[11px] md:grid-cols-2" style={{ color: "var(--text-muted)" }}>
            <p><span className="font-bold" style={{ color: "var(--text-secondary)" }}>Date:</span> {formatArchiveDate(meeting.meeting_date || meeting.created_at)}</p>
            <p><span className="font-bold" style={{ color: "var(--text-secondary)" }}>AI Status:</span> {archiveStatusLabel(meeting.ai_status || meeting.analysis_status)}</p>
            <p><span className="font-bold" style={{ color: "var(--text-secondary)" }}>Delivery:</span> {deliveryStatusLabel(meeting)}</p>
            <p><span className="font-bold" style={{ color: "var(--text-secondary)" }}>Email:</span> {emailStatusLabel(meeting)}</p>
          </div>
          <p className="mt-3 max-w-3xl text-[12px] leading-5" style={{ color: "var(--text-muted)" }}>{summaryPreview(meeting.summary)}</p>
        </div>
        <div className="grid min-w-full gap-1.5 sm:grid-cols-2 xl:min-w-[300px]">
          <ArchiveBadge tone={deliveryStatusTone(meeting)} label={deliveryStatusLabel(meeting)} />
          <ArchiveBadge tone="rose" label={`${meeting.risk_count} Risks`} />
          <ArchiveBadge tone="amber" label={`${meeting.action_count} Actions`} />
          <ArchiveBadge tone={(meeting.reports_generated || meeting.report_count) ? "sky" : "muted"} label={(meeting.reports_generated || meeting.report_count) ? "Report Ready" : "Report Pending"} />
          <ArchiveBadge tone={(meeting.sent_email_count || 0) > 0 ? "emerald" : "amber"} label={emailStatusLabel(meeting)} />
          <ArchiveBadge tone="neon" label={archiveStatusLabel(meeting.ai_status || meeting.analysis_status)} />
        </div>
      </div>
    </div>
  );
}

function DeliveryHealthBanner({ intelligence }) {
  const styles = {
    teal: "border-teal-300/25 bg-teal-300/12 text-teal-50 light:bg-teal-50 light:text-teal-950",
    amber: "border-amber-300/25 bg-amber-300/12 text-amber-50 light:bg-amber-50 light:text-amber-950",
    rose: "border-rose-300/25 bg-rose-300/12 text-rose-50 light:bg-rose-50 light:text-rose-950",
  };
  return (
    <section className={`rounded-lg border p-6 ${styles[intelligence.tone]}`}>
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <p className="text-xs font-black uppercase tracking-[.22em] opacity-75">Delivery Status: {intelligence.status}</p>
          <h3 className="mt-3 text-2xl font-black">{intelligence.headline}</h3>
          <p className="mt-3 max-w-4xl text-sm leading-7 opacity-80">{intelligence.narrative}</p>
        </div>
        <div className="min-w-36 rounded-lg border border-white/15 bg-black/15 p-4 text-center light:border-white/60 light:bg-white/70">
          <p className="text-3xl font-black">{intelligence.confidence}%</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-[.16em] opacity-65">Confidence</p>
        </div>
      </div>
    </section>
  );
}

function ReadinessCard({ item }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/15 p-4 light:border-slate-200 light:bg-slate-50">
      <div className="flex items-start justify-between gap-3">
        <p className="font-bold">{item.label}</p>
        <ArchiveBadge tone={item.tone} label={item.status} />
      </div>
      <p className="mt-4 text-3xl font-black">{item.score}%</p>
      <ProgressBar value={item.score} />
      <p className="mt-3 text-xs leading-5 text-white/55 light:text-slate-500">{item.reason}</p>
    </div>
  );
}

function OperationalWidget({ title, eyebrow, items, tone = "teal" }) {
  return (
    <section className="rounded-lg border border-white/10 bg-white/7 p-5 light:bg-white/70">
      <p className={`text-xs font-bold uppercase tracking-[.18em] ${tone === "amber" ? "text-amber-200 light:text-amber-700" : "text-teal-200 light:text-teal-700"}`}>{eyebrow}</p>
      <h3 className="text-lg font-black">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <p key={item} className="rounded-lg border border-white/10 bg-black/15 p-4 text-sm leading-6 text-white/70 light:border-slate-200 light:bg-slate-50 light:text-slate-700">{item}</p>
        ))}
      </div>
    </section>
  );
}

function buildArchiveIntelligence(meetings, filters) {
  const categories = [...new Set(meetings.map((meeting) => meeting.operational_category).filter(Boolean))];
  const filteredMeetings = meetings.filter((meeting) => {
    const haystack = [
      archiveMeetingName(meeting),
      meeting.summary,
      meeting.operational_category,
      meeting.meeting_date,
      meeting.created_at,
      meeting.delivery_status,
      deliveryStatusLabel(meeting),
      archiveStatusLabel(meeting.ai_status || meeting.analysis_status),
      emailStatusLabel(meeting),
      ...(meeting.risks || []),
      ...(meeting.blockers || []),
      ...(meeting.action_items || []).flatMap((item) => [item.owner, item.task, item.priority, item.status, item.deadline]),
      ...(meeting.emails || []).flatMap((item) => [item.email_type, item.subject, item.sent_status]),
    ].join(" ").toLowerCase();
    const queryTokens = String(filters.query || "").toLowerCase().split(/\s+/).filter(Boolean);
    const matchesQuery = !queryTokens.length || queryTokens.every((token) => haystack.includes(token));
    const matchesCategory = filters.category === "All" || meeting.operational_category === filters.category;
    const matchesRisk =
      filters.risk === "All" ||
      (filters.risk === "Has Risks" && meeting.risk_count > 0) ||
      (filters.risk === "Has Blockers" && meeting.blocker_count > 0) ||
      (filters.risk === "No Risks" && meeting.risk_count === 0 && meeting.blocker_count === 0);
    const matchesDelivery = filters.delivery === "All" || deliveryStatusLabel(meeting) === filters.delivery;
    const openActions = openActionCount(meeting);
    const matchesActions =
      filters.actions === "All" ||
      (filters.actions === "Unresolved Actions" && openActions > 0) ||
      (filters.actions === "No Open Actions" && openActions === 0);
    return matchesQuery && matchesCategory && matchesRisk && matchesDelivery && matchesActions;
  });

  return {
    categories,
    filteredMeetings,
    totalMeetings: meetings.length,
    totalRisks: meetings.reduce((sum, meeting) => sum + (meeting.risk_count || 0) + (meeting.blocker_count || 0), 0),
    openActions: meetings.reduce((sum, meeting) => sum + openActionCount(meeting), 0),
    riskChart: buildArchiveRiskChart(meetings),
    trendLine: buildArchiveTrendLine(meetings),
    health: buildArchiveHealth(meetings),
    alerts: buildArchiveAlerts(meetings),
    activeRisks: buildActiveRisks(meetings),
    owners: buildOwnerTracker(meetings),
    communication: buildCommunicationStatus(meetings),
    timeline: buildArchiveTimeline(meetings),
    trends: buildArchiveTrends(meetings),
  };
}

function buildArchiveHealth(meetings) {
  const riskText = meetings.flatMap((meeting) => [...(meeting.risks || []), ...(meeting.blockers || [])]).join(" ").toLowerCase();
  const dimensions = [
    { label: "Learner Operations", keywords: ["learner", "roster", "attendance", "communication"] },
    { label: "Facilitator Readiness", keywords: ["facilitator", "trainer", "rehearsal"] },
    { label: "Assessment Operations", keywords: ["assessment", "rubric", "qa", "grading"] },
    { label: "LMS Readiness", keywords: ["lms", "platform", "streaming"] },
    { label: "Stakeholder Coordination", keywords: ["stakeholder", "partner", "approval", "follow-up"] },
  ];
  return dimensions.map((dimension) => {
    const hitCount = dimension.keywords.filter((keyword) => riskText.includes(keyword)).length;
    const score = clamp(92 - hitCount * 14 - meetings.filter((meeting) => deliveryStatusLabel(meeting).includes("High")).length * 8, 45, 96);
    return {
      label: dimension.label,
      score,
      status: score >= 82 ? "Stable" : score >= 65 ? "Watch" : "At Risk",
      tone: score >= 82 ? "teal" : score >= 65 ? "amber" : "rose",
      detail: hitCount ? `${hitCount} recurring dependency signal${hitCount > 1 ? "s" : ""} detected.` : "No recurring risk pattern detected.",
    };
  });
}

function buildArchiveRiskChart(meetings) {
  const buckets = [
    { label: "High Risk", value: 0 },
    { label: "Moderate", value: 0 },
    { label: "On Track", value: 0 },
    { label: "Pending", value: 0 },
  ];
  for (const meeting of meetings) {
    const label = deliveryStatusLabel(meeting);
    if (label.includes("High")) buckets[0].value += 1;
    else if (label.includes("Moderate")) buckets[1].value += 1;
    else if (label.includes("Track")) buckets[2].value += 1;
    else buckets[3].value += 1;
  }
  return buckets;
}

function buildArchiveTrendLine(meetings) {
  const sorted = [...meetings].sort((a, b) => new Date(normalizeArchiveDate(a.meeting_date || a.created_at || "")).getTime() - new Date(normalizeArchiveDate(b.meeting_date || b.created_at || "")).getTime());
  const recent = sorted.slice(-8);
  if (!recent.length) return [{ label: "No Data", total: 0 }];
  return recent.map((meeting, index) => ({
    label: formatArchiveDate(meeting.meeting_date || meeting.created_at).replace(/\s\d{4}$/, "") || `M${index + 1}`,
    total: (meeting.risk_count || 0) + (meeting.blocker_count || 0) + openActionCount(meeting),
  }));
}

function buildArchiveAlerts(meetings) {
  const alerts = meetings
    .filter((meeting) => meeting.risk_count > 0 || meeting.blocker_count > 0 || openActionCount(meeting) > 0)
    .flatMap((meeting) => {
      const text = meeting.blockers?.[0] || meeting.risks?.[0] || meeting.action_items?.find((item) => item.status !== "Completed")?.task || "Open operational follow-up requires attention.";
      const severity = meeting.blocker_count ? "Escalated" : meeting.risk_count ? "At Risk" : "Action Pending";
      return [{ meeting, text, severity, tone: meeting.blocker_count ? "rose" : meeting.risk_count ? "amber" : "sky" }];
    });
  return alerts.slice(0, 5).length ? alerts.slice(0, 5) : [{ meeting: meetings[0] || {}, text: "No critical operational alerts are currently visible in the archive.", severity: "Stable", tone: "teal" }];
}

function buildActiveRisks(meetings) {
  const risks = meetings.flatMap((meeting) => [
    ...(meeting.blockers || []).map((text) => ({ meeting, text, type: "Blocker", tone: "rose" })),
    ...(meeting.risks || []).map((text) => ({ meeting, text, type: "Risk", tone: "amber" })),
  ]);
  return risks.slice(0, 8).length ? risks.slice(0, 8) : [{ meeting: meetings[0] || {}, text: "No unresolved operational risks are currently captured.", type: "Stable", tone: "teal" }];
}

function buildOwnerTracker(meetings) {
  const ownerMap = new Map();
  meetings.flatMap((meeting) => meeting.action_items || []).forEach((action) => {
    const owner = action.owner || "Unassigned";
    const record = ownerMap.get(owner) || { owner, open: 0, atRisk: 0, priority: "Low" };
    const isOpen = String(action.status || "").toLowerCase() !== "completed";
    if (isOpen) record.open += 1;
    if (String(action.status || "").toLowerCase().includes("risk") || String(action.priority || "").toLowerCase() === "high") record.atRisk += 1;
    if (String(action.priority || "").toLowerCase() === "high") record.priority = "High";
    else if (record.priority !== "High" && String(action.priority || "").toLowerCase() === "medium") record.priority = "Medium";
    ownerMap.set(owner, record);
  });
  const owners = [...ownerMap.values()].sort((a, b) => b.atRisk - a.atRisk || b.open - a.open).slice(0, 8);
  return owners.length ? owners : [{ owner: "No owner captured", open: 0, atRisk: 0, priority: "Low" }];
}

function buildCommunicationStatus(meetings) {
  const reports = meetings.reduce((sum, meeting) => sum + (meeting.reports_generated || meeting.report_count || 0), 0);
  const emails = meetings.reduce((sum, meeting) => sum + (meeting.stakeholder_emails || meeting.email_count || 0), 0);
  const sent = meetings.reduce((sum, meeting) => sum + (meeting.sent_email_count || 0), 0);
  const pending = meetings.filter((meeting) => deliveryStatusLabel(meeting) !== "Awaiting AI Review" && !(meeting.reports_generated || meeting.report_count)).length;
  return {
    reports,
    emails,
    sent,
    summary: pending
      ? `${pending} analyzed meeting${pending > 1 ? "s" : ""} still need management report generation.`
      : "Management reporting coverage is current for analyzed meetings with generated outputs.",
  };
}

function buildArchiveTimeline(meetings) {
  return meetings.slice(0, 6).flatMap((meeting) => {
    const date = formatArchiveDate(meeting.analysis_timestamp || meeting.created_at);
    const events = [`${archiveMeetingName(meeting)} ${meeting.analysis_status === "complete" ? "analyzed" : "uploaded"}`];
    if (meeting.reports_generated || meeting.report_count) events.push("Management report generated");
    if (meeting.stakeholder_emails || meeting.email_count) events.push("Stakeholder emails generated");
    if (meeting.blocker_count > 0) events.push("Escalation signal detected");
    return events.map((text) => ({ when: date, text }));
  }).slice(0, 8);
}

function buildArchiveTrends(meetings) {
  const allRisks = meetings.flatMap((meeting) => [...(meeting.risks || []), ...(meeting.blockers || [])].map((text) => String(text).toLowerCase()));
  const patterns = [
    { label: "learner readiness", keywords: ["learner", "roster", "attendance"] },
    { label: "assessment approval", keywords: ["assessment", "qa", "rubric", "grading"] },
    { label: "facilitator readiness", keywords: ["facilitator", "trainer", "rehearsal"] },
    { label: "stakeholder dependency", keywords: ["stakeholder", "partner", "approval", "follow"] },
    { label: "LMS readiness", keywords: ["lms", "platform", "streaming"] },
  ].map((pattern) => ({ ...pattern, count: allRisks.filter((risk) => pattern.keywords.some((keyword) => risk.includes(keyword))).length }));
  const recurring = patterns.filter((pattern) => pattern.count > 0).sort((a, b) => b.count - a.count);
  if (!meetings.length) return ["Archive is ready. Upload and analyze meetings to generate operational trend intelligence."];
  if (!recurring.length) return ["No recurring risk pattern is dominant yet. Continue building the archive for stronger trend detection."];
  return recurring.slice(0, 4).map((pattern) => `Recurring ${pattern.label} signals appeared in ${pattern.count} archived risk item${pattern.count > 1 ? "s" : ""}.`);
}

function openActionCount(meeting) {
  return (meeting.action_items || []).filter((item) => String(item.status || "").toLowerCase() !== "completed").length;
}

function summaryPreview(summary = "") {
  if (!summary) return "No AI summary is available yet. Run meeting analysis to generate an operational preview.";
  return summary.length > 190 ? `${summary.slice(0, 190).trim()}...` : summary;
}

function emailStatusLabel(meeting) {
  if (meeting.sent_email_count > 0) return `${meeting.sent_email_count} Sent`;
  if (meeting.stakeholder_emails || meeting.email_count) return "Drafts Generated";
  return "Communication Pending";
}

function partnerLabel(meeting) {
  const name = archiveMeetingName(meeting);
  const match = name.match(/\b([A-Z]{2,}|[A-Z][A-Za-z]+)\b\s+(?:Partner|Meeting|Review)/);
  return match?.[1] || "General";
}

function buildOperationalIntelligence(analysis, summary) {
  const risks = analysis.risks || [];
  const blockers = analysis.blockers || [];
  const concerns = analysis.delivery_concerns || [];
  const actions = sortActions(analysis.action_items || []);
  const score = risks.length + blockers.length * 2 + actions.filter((item) => String(item.status).toLowerCase().includes("risk")).length;
  const status = score >= 6 ? "CRITICAL" : score >= 2 ? "MODERATE RISK" : "STABLE";
  const tone = status === "CRITICAL" ? "rose" : status === "MODERATE RISK" ? "amber" : "teal";
  const confidence = clamp(94 - risks.length * 8 - blockers.length * 12, 48, 96);
  const topIssue = blockers[0] || risks[0] || concerns[0] || "No critical delivery blocker is currently visible";
  const narrative =
    status === "STABLE"
      ? "Operational readiness appears stable. Continue monitoring ownership, stakeholder confirmations, and upcoming delivery checkpoints."
      : `${summary} The highest attention item is: ${topIssue}. This requires active follow-up to protect delivery readiness and stakeholder confidence.`;

  return {
    status,
    tone,
    confidence,
    headline: status === "CRITICAL" ? "Immediate operational escalation required" : status === "MODERATE RISK" ? "Delivery readiness needs active management" : "Delivery readiness is currently on track",
    narrative,
    insight: `The strongest operational signal is ${topIssue.toLowerCase()}. Prioritize ownership clarity, deadline confirmation, and stakeholder communication before the next delivery checkpoint.`,
    attentionItems: buildAttentionItems(blockers, risks, concerns),
    readiness: buildReadinessScores(analysis),
    actions: actions.length ? actions : [{ priority: "Medium", owner: "Unassigned", task: "Confirm owners, deadlines, and next meeting preparation.", deadline: "TBD", status: "Pending" }],
    nextMeeting: listOrFallback(analysis.next_meeting_preparation, ["Confirm unresolved follow-ups, validate readiness gaps, and prepare stakeholder updates before the next meeting."]),
    recommendations: listOrFallback(analysis.recommendations, ["Stabilize open risks by confirming accountable owners, escalation paths, and delivery-critical deadlines."]),
    timeline: buildTimeline(actions, analysis.deadlines || []),
    impact: buildStakeholderImpact(analysis),
  };
}

function buildAttentionItems(blockers, risks, concerns) {
  const items = [
    ...blockers.map((text) => ({ text, type: "Blocker", label: "Critical", tone: "rose" })),
    ...risks.map((text) => ({ text, type: "Risk", label: "At Risk", tone: "amber" })),
    ...concerns.map((text) => ({ text, type: "Concern", label: "Monitor", tone: "sky" })),
  ].filter((item) => item.text);
  return items.slice(0, 6).length ? items.slice(0, 6) : [{ text: "No urgent blockers were detected. Continue monitoring readiness checks and upcoming stakeholder commitments.", type: "Readiness", label: "Stable", tone: "teal" }];
}

function buildReadinessScores(analysis) {
  const text = [analysis.summary, ...(analysis.risks || []), ...(analysis.blockers || []), ...(analysis.delivery_concerns || [])].join(" ").toLowerCase();
  const dimensions = [
    { label: "Learner Readiness", keywords: ["learner", "roster", "attendance", "communication", "notice"] },
    { label: "Facilitator Readiness", keywords: ["facilitator", "rehearsal", "trainer", "guide"] },
    { label: "Content Readiness", keywords: ["content", "material", "video", "lesson", "unit"] },
    { label: "Assessment Readiness", keywords: ["assessment", "rubric", "quiz", "grading", "qa"] },
    { label: "LMS Readiness", keywords: ["lms", "platform", "streaming", "sandbox", "system"] },
  ];
  return dimensions.map((dimension) => {
    const hits = dimension.keywords.filter((keyword) => text.includes(keyword)).length;
    const negative = (analysis.risks || []).concat(analysis.blockers || [], analysis.delivery_concerns || []).filter((item) => dimension.keywords.some((keyword) => String(item).toLowerCase().includes(keyword))).length;
    const score = clamp(92 - negative * 17 - (hits ? 0 : 8), 45, 96);
    return {
      ...dimension,
      score,
      status: score >= 82 ? "Ready" : score >= 65 ? "Watch" : "At Risk",
      tone: score >= 82 ? "teal" : score >= 65 ? "amber" : "rose",
      reason: negative ? `${negative} related dependency signal${negative > 1 ? "s" : ""} detected.` : "No major blocker detected in this readiness area.",
    };
  });
}

function buildTimeline(actions, deadlines) {
  const high = actions.filter((item) => String(item.priority).toLowerCase() === "high").slice(0, 2);
  const medium = actions.filter((item) => String(item.priority).toLowerCase() !== "high").slice(0, 2);
  const deadlineText = deadlines[0] || actions.find((item) => item.deadline && item.deadline !== "TBD")?.deadline || "Confirm next checkpoint date";
  return [
    { when: "Today", text: high.length ? high.map((item) => `${item.owner}: ${item.task}`).join(" | ") : "Close urgent blockers and confirm accountable owners." },
    { when: "Tomorrow", text: medium.length ? medium.map((item) => `${item.owner}: ${item.task}`).join(" | ") : "Validate readiness checks and prepare stakeholder communication." },
    { when: "Upcoming Deadline", text: deadlineText },
    { when: "Escalation Checkpoint", text: "Escalate any dependency that could affect learner communication, facilitator readiness, assessment approval, or LMS availability." },
  ];
}

function buildStakeholderImpact(analysis) {
  const risks = (analysis.risks || []).join(" ").toLowerCase();
  return [
    { group: "Learners", text: risks.includes("learner") || risks.includes("roster") ? "Learner communication or readiness may be affected if open dependencies remain unresolved." : "Learner impact appears manageable with continued readiness monitoring." },
    { group: "Facilitators", text: risks.includes("facilitator") ? "Facilitator preparation needs active confirmation before delivery." : "Facilitator impact is not showing as a primary blocker." },
    { group: "QA / Assessment", text: risks.includes("qa") || risks.includes("assessment") ? "Assessment or QA dependencies should be confirmed before reporting or launch." : "Assessment readiness should remain part of the next checkpoint." },
    { group: "Delivery Teams", text: "Delivery teams need clear owners, due dates, and escalation paths for all open actions." },
    { group: "Partners", text: (analysis.stakeholder_followups || []).length ? "Partner or stakeholder updates are required based on the captured follow-ups." : "Partner impact should be reviewed if new risks emerge." },
  ];
}

function sortActions(actions) {
  const weight = { High: 0, Medium: 1, Low: 2 };
  return [...actions].sort((a, b) => (weight[a.priority] ?? 1) - (weight[b.priority] ?? 1));
}

function listOrFallback(items, fallback) {
  return items?.length ? items : fallback;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function priorityTone(priority = "") {
  const normalized = priority.toLowerCase();
  if (normalized === "high") return "rose";
  if (normalized === "medium") return "amber";
  return "teal";
}

function statusTone(status = "") {
  const normalized = status.toLowerCase();
  if (normalized.includes("risk") || normalized.includes("blocked")) return "rose";
  if (normalized.includes("pending")) return "amber";
  if (normalized.includes("complete")) return "teal";
  return "sky";
}

function SourceHint({ value, valid, embed = false }) {
  const platform = detectPlatform(value);
  return (
    <div className={`rounded-lg border p-4 ${valid ? "border-teal-300/25 bg-teal-300/10" : "border-rose-300/25 bg-rose-300/10"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {valid ? <ShieldCheck className="text-teal-200 light:text-teal-700" /> : <AlertTriangle className="text-rose-200 light:text-rose-700" />}
          <div>
            <p className="font-bold">{valid ? "Meeting source detected successfully" : "Waiting for a valid source"}</p>
            <p className="text-sm text-white/58 light:text-slate-500">{embed ? "Parsed source URL" : "Detected platform"}: {valid ? platform : "Unknown"}</p>
          </div>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-teal-100 light:text-teal-700">{valid ? platform : "Invalid"}</span>
      </div>
      {value && <p className="mt-3 break-all rounded-lg bg-black/20 p-3 text-xs text-white/60 light:bg-white/70 light:text-slate-600">{value}</p>}
    </div>
  );
}

function TranscriptReadiness({ ready }) {
  return (
    <div className={`rounded-lg border p-4 ${ready ? "border-teal-300/25 bg-teal-300/10" : "border-amber-300/25 bg-amber-300/10"}`}>
      <div className="flex items-center gap-3">
        {ready ? <CheckCircle2 className="text-teal-200 light:text-teal-700" /> : <Sparkles className="agent-pulse text-amber-200 light:text-amber-700" />}
        <div>
          <p className="font-bold">{ready ? "Transcript readiness confirmed" : "Transcript will be generated during ingestion"}</p>
          <p className="text-sm text-white/58 light:text-slate-500">
            {ready ? "Analyze button is enabled and downstream AI has transcript content." : "Safe fallback mode will create an operational transcript if extraction is unavailable."}
          </p>
        </div>
      </div>
    </div>
  );
}

function MetadataPreview({ source, embedCode }) {
  return (
    <div className="mb-4 grid gap-3 md:grid-cols-3">
      <div className="rounded-lg border border-white/10 bg-white/7 p-4 light:bg-white/70">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-teal-200 light:text-teal-700">Detected Platform</p>
        <p className="mt-2 font-bold">{source.platform_name}</p>
      </div>
      <div className="rounded-lg border border-white/10 bg-white/7 p-4 light:bg-white/70">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-teal-200 light:text-teal-700">Source Status</p>
        <p className="mt-2 font-bold">{source.source_status}</p>
      </div>
      <div className="rounded-lg border border-white/10 bg-white/7 p-4 light:bg-white/70">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-teal-200 light:text-teal-700">Confidence</p>
        <p className="mt-2 font-bold">{Math.round(source.confidence * 100)}%</p>
      </div>
      <div className="rounded-lg border border-white/10 bg-white/7 p-4 light:bg-white/70 md:col-span-3">
        <p className="text-xs font-bold uppercase tracking-[.18em] text-teal-200 light:text-teal-700">Parsed Source URL</p>
        <p className="mt-2 break-all text-sm text-white/65 light:text-slate-600">{source.source_url}</p>
      </div>
      {source.ingestion_method === "embed" && (
        <div className="rounded-lg border border-white/10 bg-black/20 p-4 light:bg-slate-100 md:col-span-3">
          <p className="mb-3 text-xs font-bold uppercase tracking-[.18em] text-teal-200 light:text-teal-700">Embed Preview Panel</p>
          <pre className="thin-scroll max-h-32 overflow-auto whitespace-pre-wrap text-xs text-white/60 light:text-slate-600">{embedCode}</pre>
        </div>
      )}
      {source.fallback_used && (
        <div className="rounded-lg border border-amber-300/25 bg-amber-300/10 p-4 md:col-span-3">
          <p className="font-bold text-amber-100 light:text-amber-700">Transcript extraction unavailable. Using AI-generated operational transcript for analysis.</p>
        </div>
      )}
      <div className="rounded-lg border border-teal-300/20 bg-teal-300/10 p-4 md:col-span-3">
        <p className="mb-3 font-bold">AI ingestion workflow</p>
        <div className="grid gap-2 md:grid-cols-5">
          {source.processing_steps.map((step) => (
            <div key={step} className="rounded-lg bg-white/7 p-3 text-xs font-semibold text-white/70 light:bg-white/70 light:text-slate-600">
              <CheckCircle2 className="mb-2 text-teal-200 light:text-teal-700" size={16} />
              {step}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ArchiveBadge({ label, tone = "teal" }) {
  const styles = {
    teal: "border-teal-300/25 bg-teal-300/12 text-teal-100 light:text-teal-700",
    sky: "border-sky-300/25 bg-sky-300/12 text-sky-100 light:text-sky-700",
    amber: "border-amber-300/25 bg-amber-300/12 text-amber-100 light:text-amber-700",
    rose: "border-rose-300/25 bg-rose-300/12 text-rose-100 light:text-rose-700",
    muted: "border-white/10 bg-white/7 text-white/55 light:border-slate-200 light:text-slate-500",
  };
  return <span className={`rounded-full border px-3 py-2 text-center ${styles[tone] || styles.teal}`}>{label}</span>;
}

function archiveMeetingName(meeting) {
  const name = meeting.meeting_title || meeting.title;
  if (!name || ["Manual Teams Transcript", "Microsoft Teams Transcript"].includes(name)) {
    return "Operational Meeting Record";
  }
  return name;
}

function formatArchiveDate(value) {
  if (!value) return "Not recorded";
  const normalized = normalizeArchiveDate(value);
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function normalizeArchiveDate(value) {
  const match = String(value).match(/^(\d{1,2})[-/]([A-Za-z]{3,9})[-/](\d{2,4})$/);
  if (!match) return value;
  const [, day, month, year] = match;
  return `${month} ${day}, ${year.length === 2 ? `20${year}` : year}`;
}

function archiveStatusLabel(status = "") {
  const normalized = status.toLowerCase();
  if (normalized === "complete") return "Analysis Completed";
  if (normalized === "failed") return "Analysis Failed";
  if (normalized === "analyzing") return "AI Analysis In Progress";
  return "Analysis Pending";
}

function deliveryStatusLabel(meeting) {
  if (meeting.delivery_status && meeting.delivery_status !== "Awaiting AI Review") return meeting.delivery_status;
  const riskScore = (meeting.risk_count || 0) + (meeting.blocker_count || 0) * 2;
  if (meeting.analysis_status !== "complete") return "Awaiting AI Review";
  if (riskScore >= 6) return "High Delivery Risk";
  if (riskScore >= 2) return "Moderate Risk";
  return "Delivery On Track";
}

function deliveryStatusTone(meeting) {
  const label = deliveryStatusLabel(meeting);
  if (label.includes("High")) return "rose";
  if (label.includes("Moderate") || label.includes("Awaiting")) return "amber";
  return "teal";
}

function extractPreviewUrl(code) {
  const srcMatch = code.match(/src=["']([^"']+)["']/i);
  if (srcMatch) return srcMatch[1];
  const urlMatch = code.match(/https?:\/\/[^\s"'<>]+/i);
  return urlMatch?.[0] || code;
}

function detectPlatform(value) {
  const lower = value.toLowerCase();
  if (lower.includes("teams.microsoft") || lower.includes("teams.live")) return "Microsoft Teams";
  if (lower.includes("stream.microsoft") || lower.includes("microsoftstream")) return "Microsoft Stream";
  if (lower.includes("sharepoint.com")) return "SharePoint";
  if (/^https?:\/\//.test(value)) return "Generic URL";
  return "Unknown";
}

function AnalysisSkeleton() {
  return (
    <div>
      <div className="mb-5 rounded-lg border border-teal-300/20 bg-teal-300/10 p-4">
        <div className="mb-3 flex items-center gap-3">
          <Sparkles className="agent-pulse text-teal-200 light:text-teal-700" />
          <div>
            <p className="font-bold glow-text">Analyzing Meeting Intelligence...</p>
            <p className="text-sm text-white/60 light:text-slate-600">Sending transcript to GPT-4o-mini and generating operational insights.</p>
          </div>
        </div>
        <ProgressBar value={72} />
      </div>
      <SkeletonBlock className="h-24 w-full" />
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((item) => <SkeletonBlock key={item} className="h-40 w-full" />)}
      </div>
    </div>
  );
}

function ReportPanel({ report, onGenerate, loading }) {
  const sections = report ? managementReportSections(report) : [];
  return (
    <section className="premium-card rounded-lg p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Management Report</h2>
          <p className="mt-1 text-sm text-white/55 light:text-slate-500">Leadership-ready operational narrative</p>
        </div>
        <CommandButton icon={loading ? Loader2 : Sparkles} onClick={onGenerate} disabled={loading}>
          {loading ? "Writing..." : "Generate"}
        </CommandButton>
      </div>
      {loading ? (
        <div className="rounded-lg border border-teal-300/20 bg-teal-300/10 p-5">
          <div className="mb-3 flex items-center gap-3">
            <Sparkles className="agent-pulse text-teal-200 light:text-teal-700" />
            <div>
              <p className="font-bold glow-text">Drafting executive operational report...</p>
              <p className="text-sm text-white/60 light:text-slate-600">Converting extracted intelligence into a professional management narrative.</p>
            </div>
          </div>
          <ProgressBar value={78} />
          <div className="mt-5 space-y-3">
            <SkeletonBlock className="h-20 w-full" />
            <SkeletonBlock className="h-24 w-full" />
            <SkeletonBlock className="h-20 w-full" />
          </div>
        </div>
      ) : report ? (
        <div className="overflow-hidden rounded-lg border border-white/10 bg-slate-950/35 shadow-2xl shadow-teal-950/20 light:bg-white">
          <div className="border-b border-white/10 bg-gradient-to-r from-teal-300/12 via-sky-300/10 to-white/5 p-6 light:border-slate-200 light:from-teal-50 light:via-sky-50 light:to-white">
            <p className="text-xs font-bold uppercase tracking-[.2em] text-teal-200 light:text-teal-700">Operational Management Report</p>
            <h3 className="mt-2 text-2xl font-black text-white light:text-slate-950">Learning & Delivery Readiness Update</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="rounded-full border border-teal-300/30 bg-teal-300/10 px-3 py-1 text-xs font-bold text-teal-100 light:text-teal-700">
                Delivery Confidence: {report.delivery_confidence || "Medium"}
              </span>
              <span className="rounded-full border border-white/10 bg-white/7 px-3 py-1 text-xs font-bold text-white/65 light:border-slate-200 light:text-slate-600">
                Executive Format
              </span>
            </div>
          </div>
          <div className="space-y-6 p-6">
            {sections.map((section) => (
              <ReportBlock key={section.title} title={section.title} content={section.content} />
            ))}
          </div>
        </div>
      ) : (
        <p className="rounded-lg bg-white/7 p-4 text-sm text-white/60 light:bg-white/70 light:text-slate-600">Generate a manager-ready delivery report after analysis.</p>
      )}
    </section>
  );
}

function EmailPanel({ emails, onSend, onError }) {
  const [drafts, setDrafts] = useState({});
  const [recipientDrafts, setRecipientDrafts] = useState({});
  const [sendingId, setSendingId] = useState(null);
  const [activeEmailTab, setActiveEmailTab] = useState("manager_report");

  function draftFor(email) {
    return drafts[email.id] || { subject: email.subject, body: email.body };
  }

  function recipientsFor(email) {
    return recipientDrafts[email.id] || "";
  }

  async function copyEmail(email) {
    const draft = draftFor(email);
    await navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
  }

  async function sendEmail(email) {
    const draft = draftFor(email);
    const recipientList = recipientsFor(email).split(/[;,]/).map((item) => item.trim()).filter(Boolean);
    setSendingId(email.id);
    onError("");
    try {
      await onSend({
        email_id: email.id,
        meeting_id: email.meeting_id,
        recipients: recipientList,
        subject: draft.subject,
        body: draft.body,
      });
    } catch (err) {
      onError(apiErrorMessage(err, "Email sending failed. Check SMTP settings in backend/.env."));
    } finally {
      setSendingId(null);
    }
  }

  return (
    <section className="premium-card rounded-lg p-5">
      <h2 className="text-xl font-bold">Email Automation Preview</h2>
      <p className="mt-1 text-sm text-white/55 light:text-slate-500">Generate and edit concise operational emails for leadership reporting and internal team follow-up.</p>
      {emails.length > 0 && (
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {[
            { id: "manager_report", label: "Manager Report Email" },
            { id: "team_follow_up", label: "Team Follow-up Email" },
            { id: "learner_consultation", label: "Learner Consultation" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveEmailTab(tab.id)}
              className={`rounded-lg border px-4 py-3 text-sm font-bold transition ${
                activeEmailTab === tab.id
                  ? "ai-glow border-teal-300/40 bg-teal-300 text-slate-950"
                  : "border-white/10 bg-white/7 text-white/70 hover:bg-white/12 light:text-slate-600"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
      <div className="mt-4 space-y-4">
        {emails.filter((email) => email.email_type === activeEmailTab).map((email) => {
          const draft = draftFor(email);
          const isTeamEmail = email.email_type === "team_follow_up";
          const isLearnerEmail = email.email_type === "learner_consultation";
          const label = isLearnerEmail ? "Learner Email Recipient" : isTeamEmail ? "Team Email Preview Recipients" : "Manager Email Preview Recipients";
          return (
            <div key={`${email.email_type}-${email.id}`} className="rounded-lg border border-white/10 bg-white/7 p-4 light:bg-white/70">
              <p className="text-xs font-bold uppercase tracking-[.18em] text-teal-200 light:text-teal-700">
                {isLearnerEmail ? "Learner Consultation Email" : isTeamEmail ? "Team Follow-up Email" : "Manager Reporting Email"}
              </p>
              <label className="mt-3 block">
                <span className="text-sm font-semibold text-white/65 light:text-slate-600">{label}</span>
                <input
                  className="mt-2 w-full rounded-lg border border-white/12 bg-black/20 px-4 py-3 outline-none transition focus:border-teal-300 light:bg-white/70"
                  value={recipientsFor(email)}
                  onChange={(event) => setRecipientDrafts({ ...recipientDrafts, [email.id]: event.target.value })}
                  placeholder={isLearnerEmail ? "learner.email@example.com" : isTeamEmail ? "team.member1@company.com, team.member2@company.com" : "manager@company.com, stakeholder@company.com"}
                />
                <span className="mt-2 block text-xs text-white/45 light:text-slate-500">Use commas or semicolons to send to multiple recipients.</span>
              </label>
              <input
                className="mt-3 w-full rounded-lg border border-white/12 bg-black/20 px-4 py-3 font-bold outline-none focus:border-teal-300 light:bg-white/70"
                value={draft.subject}
                onChange={(event) => setDrafts({ ...drafts, [email.id]: { ...draft, subject: event.target.value } })}
              />
              <textarea
                className="thin-scroll mt-3 min-h-72 w-full resize-none rounded-lg border border-white/12 bg-black/20 p-4 text-sm leading-6 text-white/70 outline-none focus:border-teal-300 light:bg-slate-100 light:text-slate-700"
                value={draft.body}
                onChange={(event) => setDrafts({ ...drafts, [email.id]: { ...draft, body: event.target.value } })}
              />
              <div className="mt-3 flex flex-wrap gap-2">
                <button className="rounded-lg border border-white/12 px-4 py-2 text-sm font-bold text-white/70 hover:bg-white/10 light:text-slate-600" onClick={() => copyEmail(email)}>
                  Copy
                </button>
                <CommandButton icon={sendingId === email.id ? Loader2 : Send} onClick={() => sendEmail(email)} disabled={sendingId === email.id}>
                  {sendingId === email.id ? "Sending..." : "Send"}
                </CommandButton>
              </div>
            </div>
          );
        })}
        {emails.length > 0 && emails.filter((email) => email.email_type === activeEmailTab).length === 0 && (
          <p className="rounded-lg bg-white/7 p-4 text-sm text-white/60 light:bg-white/70 light:text-slate-600">
            Generate emails again to create this communication preview for the selected tab.
          </p>
        )}
        {emails.length === 0 && <p className="rounded-lg bg-white/7 p-4 text-sm text-white/60 light:bg-white/70 light:text-slate-600">Generated management, team, and learner consultation emails will appear here.</p>}
      </div>
    </section>
  );
}

function InfoList({ title, items = [], tone = "teal" }) {
  const color = tone === "rose" ? "text-rose-200 light:text-rose-700" : tone === "amber" ? "text-amber-200 light:text-amber-700" : "text-teal-200 light:text-teal-700";
  return (
    <div className="rounded-lg bg-white/7 p-4 light:bg-white/70">
      <h3 className={`font-bold ${color}`}>{title}</h3>
      <div className="mt-3 space-y-2 text-sm leading-6 text-white/70 light:text-slate-600">
        {items.map((item) => <p key={item}>{item}</p>)}
      </div>
    </div>
  );
}

function ReportBlock({ title, content }) {
  return (
    <article className="border-l-2 border-teal-300/45 pl-4">
      <h3 className="text-sm font-black uppercase tracking-[.16em] text-teal-200 light:text-teal-700">{title}</h3>
      <p className="mt-3 whitespace-pre-line text-[15px] leading-7 text-white/78 light:text-slate-700">{content}</p>
    </article>
  );
}

function managementReportSections(report) {
  const fallbackList = (items = []) => items.filter(Boolean).join(" ");
  return [
    {
      title: "Executive Operational Summary",
      content: report.executive_operational_summary || report.executive_summary,
    },
    {
      title: "Delivery Readiness Overview",
      content: report.delivery_readiness_overview || report.delivery_status,
    },
    {
      title: "Operational Risks & Concerns",
      content: report.operational_risks_concerns || fallbackList(report.operational_concerns),
    },
    {
      title: "Facilitator & Content Readiness",
      content: report.facilitator_content_readiness || "Facilitator and content readiness were not explicitly addressed in the meeting record.",
    },
    {
      title: "Assessment & LMS Readiness",
      content: report.assessment_lms_readiness || "Assessment and LMS readiness were not explicitly addressed in the meeting record.",
    },
    {
      title: "Stakeholder Coordination Updates",
      content: report.stakeholder_coordination_updates || "Stakeholder coordination updates should be confirmed through the assigned follow-ups.",
    },
    {
      title: "Recommended Next Actions",
      content: report.recommended_next_actions || fallbackList(report.recommended_actions),
    },
    {
      title: "Next Meeting Focus Areas",
      content: report.next_meeting_focus_areas || "The next meeting should focus on open actions, readiness gaps, delivery risks, and stakeholder decisions.",
    },
  ].filter((section) => section.content);
}

function apiErrorMessage(err, fallback) {
  if (err?.code === "ECONNABORTED") {
    return "The Meeting Agent request timed out. The backend may be re-running AI analysis instead of using saved data, or the model response is taking too long.";
  }
  if (err?.message === "Network Error") {
    return `The Meeting Agent could not reach ${apiBaseLabel}. Restart the frontend dev server so it reloads the current proxy configuration, then try again.`;
  }
  return err?.response?.data?.detail || err?.message || fallback;
}
