import { AnimatePresence, motion } from "framer-motion";
import { Fragment, useEffect, useMemo, useState } from "react";
import { Bell, BrainCircuit, CalendarDays, CheckCircle2, ChevronDown, ClipboardCheck, Download, Eraser, FileSpreadsheet, FileText, Layers3, Loader2, Mail, MessageSquare, Presentation, Save, Send, Sparkles, UploadCloud, UserRound, Users } from "lucide-react";
import AgentBadge from "../components/AgentBadge.jsx";
import CommandButton from "../components/CommandButton.jsx";
import PageHeader from "../components/PageHeader.jsx";
import ProgressBar from "../components/ProgressBar.jsx";
import SkeletonBlock from "../components/SkeletonBlock.jsx";
import { clearLearningContentHistoryApi, clearLearningContentRecordApi, getLearningContentHistoryApi, learningContentChatApi, learningIUBlueprintApi, learningIUDownloadUrl, learningProjectBriefDownloadUrl, learningProductPlanApi, notifyLearningAssignmentsApi, remindLearningAssignmentsApi, saveLearningAssignmentsApi, saveLearningProductPlanApi } from "../services/api.js";

const tabs = [
  { id: "upload", label: "Product Plan Upload", icon: UploadCloud },
  { id: "analysis", label: "AI Curriculum Analysis", icon: BrainCircuit },
  { id: "iu", label: "IU Breakdown Viewer", icon: Layers3 },
  { id: "blueprint", label: "Content Blueprint Generator", icon: FileText },
  { id: "assessment", label: "Assessment Planning", icon: ClipboardCheck },
  { id: "project", label: "Project Brief Generator", icon: Presentation },
  { id: "history", label: "Production Handoff", icon: Users },
];

const processingSteps = [
  "Reading Product Plan document...",
  "Extracting curriculum intelligence...",
  "Detecting modules, IUs, outcomes, and hours...",
  "Preparing IU Breakdown fetch workflow...",
];

export default function LearningGenerator() {
  const [active, setActive] = useState("upload");
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [iuLoading, setIuLoading] = useState("");
  const [error, setError] = useState("");
  const [savedMessage, setSavedMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [assignmentEmailing, setAssignmentEmailing] = useState("");
  const [historyClearing, setHistoryClearing] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [processingStep, setProcessingStep] = useState(processingSteps[0]);
  const [selectedIUCode, setSelectedIUCode] = useState("");
  const units = useMemo(() => normalizeUnits(result?.instruction_units), [result?.instruction_units]);
  const selectedUnit = useMemo(
    () => units.find((unit) => unit.iu_code === selectedIUCode) || units[0],
    [selectedIUCode, units]
  );
  const showUploadPanel = active === "upload";

  useEffect(() => {
    if (units.length && !units.some((unit) => unit.iu_code === selectedIUCode)) {
      setSelectedIUCode(units[0].iu_code);
    }
    if (!units.length) {
      setSelectedIUCode("");
    }
  }, [selectedIUCode, units]);

  useEffect(() => {
    if (active === "history") {
      loadHistory();
    }
  }, [active]);

  async function generateBlueprint() {
    if (!file) {
      setError("Upload a Product Plan PDF, DOC, or DOCX before generating a blueprint.");
      return;
    }
    setLoading(true);
    setError("");
    setProcessingStep(processingSteps[0]);
    let stepIndex = 0;
    const timer = window.setInterval(() => {
      stepIndex = Math.min(stepIndex + 1, processingSteps.length - 1);
      setProcessingStep(processingSteps[stepIndex]);
    }, 2200);
    try {
      const data = new FormData();
      data.append("file", file);
      const response = await learningProductPlanApi(data);
      setResult(response);
      setSelectedIUCode(response?.instruction_units?.[0]?.iu_code || "");
      setActive("iu");
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "LIA Content Agentic AI could not analyze this Product Plan.");
    } finally {
      window.clearInterval(timer);
      setLoading(false);
    }
  }

  async function fetchIUBlueprint(iuCode) {
    if (!result?.id || !iuCode) return;
    setIuLoading(iuCode);
    setError("");
    try {
      const generated = await learningIUBlueprintApi(result.id, iuCode);
      setResult((current) => ({
        ...current,
        instruction_units: (current?.instruction_units || []).map((unit) => (unit.iu_code === generated.iu_code ? generated : unit)),
      }));
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || `LIA could not fetch ${iuCode} blueprint.`);
    } finally {
      setIuLoading("");
    }
  }

  async function saveReview() {
    if (!result?.id) return;
    setSaving(true);
    setError("");
    setSavedMessage("");
    try {
      await saveLearningProductPlanApi(result.id, result);
      setSavedMessage("Curriculum review and IU edits saved to database.");
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "LIA could not save the reviewed curriculum content.");
    } finally {
      setSaving(false);
    }
  }

  async function loadHistory() {
    setHistoryLoading(true);
    setError("");
    try {
      const response = await getLearningContentHistoryApi();
      setHistory(response.records || []);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "LIA could not load production handoff history.");
    } finally {
      setHistoryLoading(false);
    }
  }

  function updateHistoryAssignment(productId, iuCode, rowIndex, field, value) {
    setHistory((current) => current.map((record) => (
      record.id !== productId ? record : {
        ...record,
        units: (record.units || []).map((unit) => (
          unit.iu_code !== iuCode ? unit : {
            ...unit,
            assignments: (unit.assignments || []).map((assignment, index) => (
              index === rowIndex ? { ...assignment, [field]: value } : assignment
            )),
          }
        )),
      }
    )));
  }

  async function saveHistoryAssignments() {
    const rows = history.flatMap((record) => (record.units || []).flatMap((unit) => unit.assignments || []));
    setAssignmentSaving(true);
    setError("");
    setSavedMessage("");
    try {
      await saveLearningAssignmentsApi(rows);
      setSavedMessage("Production assignment board saved to database.");
      await loadHistory();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "LIA could not save production assignments.");
    } finally {
      setAssignmentSaving(false);
    }
  }

  function unitPayload(record, unit, extra = {}) {
    return {
      product_id: record.id,
      iu_code: unit.iu_code,
      assignments: unit.assignments || [],
      ...extra,
    };
  }

  async function sendIUHandoff(record, unit, format = "docx") {
    const key = `${record.id}-${unit.iu_code}-send`;
    setAssignmentEmailing(key);
    setError("");
    setSavedMessage("");
    try {
      const rows = unit.assignments || [];
      const hasDeadlineGap = rows.some((row) => !(row.deadline || "").trim());
      if (hasDeadlineGap) {
        setError(`Set deadline for all ${unit.iu_code} tasks before sending handoff.`);
        setAssignmentEmailing("");
        return;
      }
      await notifyLearningAssignmentsApi(unitPayload(record, unit, { format }));
      setSavedMessage(`${unit.iu_code} handoff email sent to assigned team members.`);
      await loadHistory();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "LIA could not send the IU handoff email. Check assignee emails and SMTP settings.");
    } finally {
      setAssignmentEmailing("");
    }
  }

  async function sendIUReminder(record, unit) {
    const key = `${record.id}-${unit.iu_code}-remind`;
    setAssignmentEmailing(key);
    setError("");
    setSavedMessage("");
    try {
      await remindLearningAssignmentsApi(unitPayload(record, unit));
      setSavedMessage(`${unit.iu_code} reminder email sent for incomplete tasks.`);
      await loadHistory();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "LIA could not send reminders. Check assignee emails and SMTP settings.");
    } finally {
      setAssignmentEmailing("");
    }
  }

  async function clearHistory() {
    setHistoryClearing(true);
    setError("");
    setSavedMessage("");
    try {
      await clearLearningContentHistoryApi();
      setHistory([]);
      setSavedMessage("Content history cleared successfully.");
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "LIA could not clear content history.");
    } finally {
      setHistoryClearing(false);
    }
  }

  async function clearHistoryRecord(productId) {
    setHistoryClearing(true);
    setError("");
    setSavedMessage("");
    try {
      await clearLearningContentRecordApi(productId);
      setSavedMessage("Selected history record cleared successfully.");
      await loadHistory();
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || "LIA could not clear this history record.");
    } finally {
      setHistoryClearing(false);
    }
  }

  function updateTopLevelList(field, index, value) {
    setResult((current) => setNestedValue(current, [field, index], value));
  }

  function updateProjectField(field, value) {
    setResult((current) => setNestedValue(current, ["project_brief", field], value));
  }

  function updateProjectList(field, index, value) {
    setResult((current) => setNestedValue(current, ["project_brief", field, index], value));
  }

  function updateUnitField(iuCode, path, value) {
    setResult((current) => ({
      ...current,
      instruction_units: (current?.instruction_units || []).map((unit) => (
        unit.iu_code === iuCode ? setNestedValue(unit, path, value) : unit
      )),
    }));
  }

  function handleFileSelect(selectedFile) {
    if (!selectedFile) return;
    setFile(selectedFile);
    setResult(null);
    setSelectedIUCode("");
    setActive("upload");
    setError("");
  }

  return (
    <div>
      {/* ── Agent Hero Header ── */}
      <div
        className="agent-card mb-5 rounded-xl p-5"
        style={{ border: "1px solid var(--violet-strong, rgba(124,58,237,0.5))", boxShadow: "0 0 32px rgba(124,58,237,0.12)" }}
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2">
              <BrainCircuit size={14} style={{ color: "var(--violet)" }} />
              <p className="mono text-[10px] font-bold uppercase tracking-[.28em]" style={{ color: "var(--violet)" }}>
                // ContentAgent · Adaptive Curriculum Intelligence
              </p>
              <span className="status-live mono text-[10px] ml-2">ACTIVE</span>
            </div>
            <h1 className="text-2xl font-bold md:text-3xl" style={{ fontFamily: "Space Grotesk, sans-serif", color: "var(--text-primary)" }}>
              Content Intelligence Platform
            </h1>
            <p className="mt-2 max-w-2xl text-[13px] leading-6" style={{ color: "var(--text-secondary)" }}>
              Upload Product Plan · Extract curriculum structure · Generate IU blueprints · Manage production handoff
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              id="content-chat-btn"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold transition-all hover:-translate-y-0.5"
              style={{ background: "var(--violet-dim)", border: "1px solid rgba(124,58,237,0.28)", color: "var(--violet)" }}
              onClick={() => setChatOpen(true)}
              title={result?.id ? "Open LIA Content Chat" : "Analyze a Product Plan first"}
            >
              <MessageSquare size={15} />
              LIA Chat
            </button>
            {result?.id && (
              <CommandButton icon={saving ? Loader2 : Save} onClick={saveReview} disabled={saving}>
                {saving ? "Saving..." : "Approve & Save"}
              </CommandButton>
            )}
            <CommandButton icon={loading ? Loader2 : Sparkles} onClick={generateBlueprint} disabled={loading || !file}>
              {loading ? "Analyzing..." : "Analyze Curriculum"}
            </CommandButton>
          </div>
        </div>
      </div>

      {/* ── LIA Content Chat Drawer ── */}
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
                  <p className="mono text-[10px] font-bold uppercase tracking-[.28em]" style={{ color: "var(--violet)" }}>// ContentAgent Copilot</p>
                  <h2 className="mt-1 text-xl font-bold" style={{ color: "var(--text-primary)" }}>LIA Content Chat</h2>
                </div>
                <button
                  className="rounded-xl px-3 py-2 text-[12px] font-bold transition-all hover:bg-white/10"
                  style={{ border: "1px solid var(--border)", color: "var(--text-muted)" }}
                  onClick={() => setChatOpen(false)}
                >Close</button>
              </div>
              {result?.id ? (
                <LiaContentChatPanel
                  productId={result.id}
                  units={units}
                  onIUGenerated={(generated) => {
                    setResult((current) => ({
                      ...current,
                      instruction_units: (current?.instruction_units || []).map((unit) => (unit.iu_code === generated.iu_code ? generated : unit)),
                    }));
                    setSelectedIUCode(generated.iu_code);
                  }}
                />
              ) : (
                <div className="rounded-xl p-5" style={{ background: "var(--violet-dim)", border: "1px solid rgba(124,58,237,0.25)" }}>
                  <p className="mono text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--violet)" }}>⚡ Awaiting Analysis</p>
                  <p className="mt-2 text-[13px] leading-6" style={{ color: "var(--text-secondary)" }}>Upload a Product Plan, run Analyze Curriculum, then ask about IU knowledge, skills evidence, rubrics, and production handoff priorities.</p>
                </div>
              )}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Status Banners ── */}
      {error && (
        <div className="mb-4 rounded-xl p-4" style={{ background: "var(--rose-dim)", border: "1px solid rgba(251,75,110,0.25)" }}>
          <p className="mono text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--rose)" }}>⚠ Agent Error</p>
          <p className="mt-1 text-[13px]" style={{ color: "var(--text-secondary)" }}>{error}</p>
        </div>
      )}
      {savedMessage && (
        <div className="mb-4 rounded-xl p-4" style={{ background: "var(--emerald-dim)", border: "1px solid rgba(0,255,163,0.2)" }}>
          <p className="mono text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--emerald)" }}>✓ {savedMessage}</p>
        </div>
      )}

      {/* ── Tab Navigation ── */}
      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={`content-tab-${tab.id}`}
            onClick={() => result || ["upload", "history"].includes(tab.id) ? setActive(tab.id) : null}
            disabled={!result && !["upload", "history"].includes(tab.id)}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[12px] font-bold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40"
            style={active === tab.id
              ? { background: "var(--violet-dim)", border: "1px solid rgba(124,58,237,0.4)", color: "var(--violet)", boxShadow: "0 0 16px rgba(124,58,237,0.2)" }
              : { background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }
            }
          >
            <tab.icon size={14} />
            <span className="mono">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className={`grid gap-5 ${showUploadPanel ? "xl:grid-cols-[400px_1fr]" : "xl:grid-cols-1"}`}>
        {showUploadPanel && <section className="agent-card rounded-xl p-5 xl:p-6">
          <div className="space-y-4">
            <div>
              <p className="mono text-[10px] font-bold uppercase tracking-[.28em]" style={{ color: "var(--violet)" }}>// Document Intelligence</p>
              <h2 className="mt-2 text-xl font-bold" style={{ color: "var(--text-primary)" }}>Product Plan Ingestion</h2>
              <p className="mt-2 text-[13px] leading-6" style={{ color: "var(--text-secondary)" }}>
                Upload one Product Plan. ContentAgent extracts curriculum intelligence, learning structure, delivery modes, and assessment workflows.
              </p>
            </div>
            <div className="flex">
              <AgentBadge name="Document Intelligence Agent" status={loading ? "Analyzing" : file ? "Ready" : "Waiting"} />
            </div>
          </div>
          <div className="mt-6 space-y-4">
            <label
              className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-5 py-6 text-center transition-all hover:-translate-y-0.5"
              style={{ borderColor: "rgba(124,58,237,0.35)", background: "rgba(124,58,237,0.05)" }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => { event.preventDefault(); handleFileSelect(event.dataTransfer.files?.[0]); }}
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "var(--violet-dim)", border: "1px solid rgba(124,58,237,0.3)" }}>
                <UploadCloud size={28} style={{ color: "var(--violet)" }} />
              </div>
              <h3 className="mt-4 text-[15px] font-bold" style={{ color: "var(--text-primary)" }}>
                {file ? "Product Plan Ready" : "Drop Product Plan Here"}
              </h3>
              <p className="mt-1 mono text-[11px]" style={{ color: "var(--text-muted)" }}>PDF · DOC · DOCX supported</p>
              <div className="mt-4 w-full max-w-[280px] rounded-xl p-3" style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.15)" }}>
                <p className="mono text-[10px] font-bold uppercase tracking-[.18em] mb-2" style={{ color: "var(--violet)" }}>ContentAgent extracts</p>
                <div className="grid grid-cols-2 gap-1.5 text-left">
                  {["Modules", "IUs", "Learning hours", "Learner types", "Delivery modes", "Assessments"].map((item) => (
                    <span key={item} className="mono rounded-lg px-2 py-1.5 text-[10px]" style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)" }}>{item}</span>
                  ))}
                </div>
              </div>
              <input className="hidden" type="file" accept=".pdf,.doc,.docx" onChange={(event) => handleFileSelect(event.target.files?.[0])} />
              <span className="mt-4 rounded-xl px-5 py-2.5 text-[13px] font-bold" style={{ background: "var(--violet)", color: "#fff" }}>Choose File</span>
            </label>

            {file && (
              <div className="rounded-xl p-4" style={{ background: "var(--emerald-dim)", border: "1px solid rgba(0,255,163,0.2)" }}>
                <div className="flex items-center gap-3">
                  <CheckCircle2 size={16} style={{ color: "var(--emerald)" }} />
                  <div>
                    <p className="mono text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--emerald)" }}>Ready to analyze</p>
                    <p className="text-[12px]" style={{ color: "var(--text-secondary)" }}>{file.name}</p>
                  </div>
                </div>
              </div>
            )}

            {loading && <ProcessingTimeline current={processingStep} />}

            <CommandButton className="w-full" icon={loading ? Loader2 : Sparkles} onClick={generateBlueprint} disabled={loading || !file}>
              {loading ? processingStep : "Analyze Curriculum"}
            </CommandButton>
          </div>
        </section>}

        <section className="agent-card rounded-xl p-5">
          {active === "history" ? (
            <ProductionHandoffBoard
              history={history}
              loading={historyLoading}
              saving={assignmentSaving}
              emailing={assignmentEmailing}
              onRefresh={loadHistory}
              onSave={saveHistoryAssignments}
              onClear={clearHistory}
              onClearRecord={clearHistoryRecord}
              onUpdateAssignment={updateHistoryAssignment}
              onSendIU={sendIUHandoff}
              onRemindIU={sendIUReminder}
            />
          ) : !result && !loading ? (
            <DocumentIntelligencePlaceholder file={file} />
          ) : loading ? <LoadingBlueprint label={processingStep} /> : (
            <>
              <ExtractedIntelligenceHeader result={result} units={units} />
              {active === "upload" && <Roadmap result={result} units={units} />}
              {active === "analysis" && (
                <InsightGrid result={result} onUpdateList={updateTopLevelList} />
              )}
              {active === "iu" && (
                <IUBreakdown
                  units={units}
                  selectedIUCode={selectedIUCode}
                  onSelectIU={setSelectedIUCode}
                  onFetchIU={fetchIUBlueprint}
                  onUpdateUnitField={updateUnitField}
                  loadingCode={iuLoading}
                  productId={result.id}
                />
              )}
              {active === "blueprint" && (
                <BlueprintViewer
                  units={units}
                  unit={selectedUnit}
                  selectedIUCode={selectedIUCode}
                  onSelectIU={setSelectedIUCode}
                  onFetchIU={fetchIUBlueprint}
                  onUpdateUnitField={updateUnitField}
                  loadingCode={iuLoading}
                />
              )}
              {active === "assessment" && (
                <AssessmentViewer
                  units={units}
                  checks={result.assessment_alignment_checks}
                  onUpdateChecks={updateTopLevelList}
                  onUpdateUnitField={updateUnitField}
                  selectedIUCode={selectedIUCode}
                  onSelectIU={setSelectedIUCode}
                />
              )}
              {active === "project" && (
                <ProjectBriefViewer
                  productId={result.id}
                  project={result.project_brief}
                  onUpdateField={updateProjectField}
                  onUpdateList={updateProjectList}
                />
              )}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function DocumentIntelligencePlaceholder({ file }) {
  return (
    <div className="flex min-h-[480px] flex-col items-center justify-center rounded-xl p-8 text-center"
      style={{ background: "rgba(124,58,237,0.04)", border: "1px solid rgba(124,58,237,0.15)" }}>
      <div className="agent-pulse flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "var(--violet-dim)", border: "1px solid rgba(124,58,237,0.3)" }}>
        <Sparkles size={32} style={{ color: "var(--violet)" }} />
      </div>
      <p className="mono mt-6 text-[10px] font-bold uppercase tracking-[.28em]" style={{ color: "var(--violet)" }}>// ContentAgent · Awaiting Input</p>
      <h2 className="mt-3 text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Curriculum Intelligence Waiting</h2>
      <p className="mx-auto mt-3 max-w-xl text-[13px] leading-7" style={{ color: "var(--text-secondary)" }}>
        {file
          ? "Product Plan uploaded. Click Analyze Curriculum — ContentAgent will extract curriculum structure, learning hours, IUs, learner profile, assessment scope, and adaptive roadmap."
          : "Upload a Product Plan PDF, DOC, or DOCX. The intelligence dashboard appears after ContentAgent completes document analysis."}
      </p>
      <div className="mx-auto mt-8 grid w-full max-w-2xl gap-3 md:grid-cols-3">
        {[
          { step: "01", label: "Upload", detail: "Product Plan document" },
          { step: "02", label: "Analyze", detail: "AI document intelligence" },
          { step: "03", label: "Blueprint", detail: "Production-ready roadmap" },
        ].map(({ step, label, detail }) => (
          <div key={step} className="rounded-xl p-4" style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.15)" }}>
            <p className="mono text-[10px] font-bold" style={{ color: "var(--violet)" }}>{step}</p>
            <p className="mt-1 text-[15px] font-bold" style={{ color: "var(--text-primary)" }}>{label}</p>
            <p className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>{detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProcessingTimeline({ current }) {
  return (
    <div className="rounded-xl p-4" style={{ background: "var(--violet-dim)", border: "1px solid rgba(124,58,237,0.3)", boxShadow: "0 0 20px rgba(124,58,237,0.1)" }}>
      <div className="flex items-center gap-3">
        <Loader2 className="animate-spin" size={16} style={{ color: "var(--violet)" }} />
        <p className="mono text-[12px] font-bold" style={{ color: "var(--violet)" }}>{current}</p>
      </div>
      <div className="mt-4 space-y-2">
        {processingSteps.map((step) => {
          const isActive = step === current;
          const isComplete = processingSteps.indexOf(step) < processingSteps.indexOf(current);
          return (
            <div key={step} className="flex items-center gap-3">
              <span className="h-2 w-2 rounded-full" style={{ background: isActive || isComplete ? "var(--violet)" : "rgba(255,255,255,0.15)" }} />
              <span className="mono text-[11px]" style={{ color: isActive ? "var(--text-primary)" : "var(--text-muted)" }}>{step}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ExtractedIntelligenceHeader({ result, units }) {
  const aiMode = getAIMode(result);
  return (
    <div className="mb-5 rounded-xl p-5" style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)" }}>
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div>
          <p className="mono text-[10px] font-bold uppercase tracking-[.24em]" style={{ color: "var(--violet)" }}>// ContentAgent · Extracted Product Plan Intelligence</p>
          <p className="mt-2 mono text-[10px] font-bold uppercase tracking-[.14em]" style={{ color: "var(--text-muted)" }}>Module Title</p>
          <h2 className="mt-1 text-xl font-bold uppercase leading-snug" style={{ color: "var(--text-primary)" }}>{result.title || "Adaptive Learning Production Blueprint"}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="mono rounded-full px-3 py-1 text-[10px] font-bold" style={aiMode.live
              ? { background: "var(--emerald-dim)", border: "1px solid rgba(0,255,163,0.2)", color: "var(--emerald)" }
              : { background: "var(--amber-dim)", border: "1px solid rgba(251,191,36,0.2)", color: "var(--amber)" }}>
              {aiMode.label}
            </span>
            <span className="mono rounded-full px-3 py-1 text-[10px] font-bold" style={{ background: "var(--violet-dim)", border: "1px solid rgba(124,58,237,0.2)", color: "var(--violet)" }}>
              Module: {result.module_code || "Not detected"}
            </span>
            <span className="mono rounded-full px-3 py-1 text-[10px] font-bold" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>
              {result.course_name || result.subtitle || "Adaptive Learning Platform"}
            </span>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[420px]">
          <Metric title="Hours" value={`${result.total_learning_hours || 0}`} detail="Learning hours extracted" />
          <Metric title="IUs" value={units.length} detail="Instruction Units detected" />
          <Metric title="Status" value="Ready" detail="Curriculum review completed" />
        </div>
      </div>
    </div>
  );
}

function Roadmap({ result, units }) {
  const aiMode = getAIMode(result);
  const productionTypes = ["Knowledge", "Skills", "Assessment", "Case Studies"];
  return (
    <div className="space-y-5">
      <div className="rounded-xl p-5" style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)" }}>
        <p className="mono text-[10px] font-bold uppercase tracking-[.22em]" style={{ color: "var(--violet)" }}>// Product Plan Summary</p>
        <h3 className="mt-2 text-xl font-bold" style={{ color: "var(--text-primary)" }}>{result.title || "Extracted Product Plan"}</h3>
        <p className="mt-3 text-[13px] leading-7" style={{ color: "var(--text-secondary)" }}>
          {safeList(result.curriculum_analysis)[0] || "ContentAgent extracted the curriculum structure and prepared it for adaptive learning production planning."}
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Metric title="Learning Hours" value={`${result.total_learning_hours || 0} hrs`} detail="Extracted from session plan" />
        <Metric title="Production Scope" value={`${units.length} IUs`} detail={productionTypes.join(", ")} />
        <Metric title="Learner Mode" value={inferLearnerMode(result.audience_profile)} detail={result.audience_profile || "Mode extracted by ContentAgent"} />
      </div>
      <div className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <p className="mono text-[10px] font-bold uppercase tracking-[.22em]" style={{ color: "var(--violet)" }}>// Adaptive Learning Roadmap</p>
            <h3 className="mt-1 text-[15px] font-bold" style={{ color: "var(--text-primary)" }}>Instruction Units</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="mono rounded-full px-3 py-1 text-[10px] font-bold" style={aiMode.live
              ? { background: "var(--emerald-dim)", border: "1px solid rgba(0,255,163,0.2)", color: "var(--emerald)" }
              : { background: "var(--amber-dim)", border: "1px solid rgba(251,191,36,0.2)", color: "var(--amber)" }}>
              {aiMode.label}
            </span>
            <span className="mono rounded-full px-3 py-1 text-[10px] font-bold" style={{ background: "var(--violet-dim)", border: "1px solid rgba(124,58,237,0.2)", color: "var(--violet)" }}>Blueprint Ready</span>
          </div>
        </div>
        <div className="mt-4 grid gap-3 xl:grid-cols-5">
          {units.map((unit, index) => (
            <div key={unit.iu_code} className="rounded-xl p-4 transition-all hover:-translate-y-0.5" style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.18)" }}>
              <p className="mono text-[11px] font-bold" style={{ color: "var(--violet)" }}>{unit.iu_code}</p>
              <h4 className="mt-2 text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>{unit.title}</h4>
              <ProgressBar value={(index + 1) * 18} color="violet" />
              <p className="mt-3 text-[11px] leading-5" style={{ color: "var(--text-muted)" }}>{unit.adaptive_focus}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="mono rounded-full px-2 py-1 text-[10px]" style={{ background: "rgba(124,58,237,0.1)", color: "var(--violet)" }}>{unit.estimated_hours} hrs</span>
                <span className="mono rounded-full px-2 py-1 text-[10px]" style={{ background: "rgba(255,255,255,0.04)", color: "var(--text-muted)" }}>{unit.complexity_indicator}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InsightGrid({ result, onUpdateList }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <InfoPanel title="Curriculum Analysis" items={safeList(result.curriculum_analysis)} onChangeItem={(index, value) => onUpdateList("curriculum_analysis", index, value)} />
      <InfoPanel title="Adaptive Learning Recommendations" items={safeList(result.adaptive_learning_recommendations)} onChangeItem={(index, value) => onUpdateList("adaptive_learning_recommendations", index, value)} />
      <InfoPanel title="Learning Complexity Indicators" items={safeList(result.complexity_indicators)} onChangeItem={(index, value) => onUpdateList("complexity_indicators", index, value)} />
      <InfoPanel title="Content Production Estimation" items={safeList(result.content_production_estimation)} onChangeItem={(index, value) => onUpdateList("content_production_estimation", index, value)} />
      <InfoPanel title="Delivery Readiness Insights" items={safeList(result.delivery_readiness_insights)} onChangeItem={(index, value) => onUpdateList("delivery_readiness_insights", index, value)} className="lg:col-span-2" />
    </div>
  );
}

function IUBreakdown({ units, selectedIUCode, onSelectIU, onFetchIU, onUpdateUnitField, loadingCode, productId }) {
  if (!units.length) {
    return <EmptyState title="No Instruction Units Generated" detail="Click Generate Production Blueprint again. The IU viewer will populate after the product plan response includes IU1-IU5." />;
  }

  const activeUnit = units.find((unit) => unit.iu_code === selectedIUCode) || units[0];

  return (
    <div className="space-y-5">
      <div className="rounded-xl p-5" style={{ background: "rgba(124,58,237,0.06)", border: "1px solid rgba(124,58,237,0.2)" }}>
        <p className="mono text-[10px] font-bold uppercase tracking-[.22em]" style={{ color: "var(--violet)" }}>// Instructional Production Intelligence</p>
        <h3 className="mt-1 text-xl font-bold" style={{ color: "var(--text-primary)" }}>IU Breakdown Viewer</h3>
        <p className="mt-2 text-[13px] leading-6" style={{ color: "var(--text-secondary)" }}>
          Detailed production workspace for each IU. Review and edit Knowledge, Skills, case studies, learning sequence, glossary, adaptive support, working hours, and downloadable IU content.
        </p>
      </div>

      <IUTabSelector units={units} selectedIUCode={activeUnit?.iu_code} onSelectIU={onSelectIU} />

      {activeUnit && (
        <IUWorkspace
          unit={activeUnit}
          onFetchIU={onFetchIU}
          onUpdateUnitField={onUpdateUnitField}
          loadingCode={loadingCode}
          productId={productId}
        />
      )}
    </div>
  );
}

function IUWorkspace({ unit, onFetchIU, onUpdateUnitField, loadingCode, productId }) {
  const iuFallback = (unit?.blueprint?.readiness_insight || "").toLowerCase().includes("network fallback mode");
  return (
    <div className="rounded-xl p-5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)" }}>
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div>
          <p className="mono text-[10px] font-bold uppercase tracking-[.2em]" style={{ color: "var(--violet)" }}>{unit.iu_code} · {unit.complexity_indicator}</p>
          <p className="mt-1 mono text-[10px] font-bold uppercase tracking-[.14em]" style={{ color: "var(--text-muted)" }}>Module Title</p>
          <h3 className="mt-1 text-xl font-bold uppercase leading-snug" style={{ color: "var(--text-primary)" }}>{unit.title}</h3>
          <textarea
            className="thin-scroll mt-3 min-h-[100px] w-full max-w-3xl resize-y rounded-xl px-4 py-3 text-[13px] leading-6 outline-none"
            style={{ background: "rgba(124,58,237,0.05)", border: "1px solid rgba(124,58,237,0.2)", color: "var(--text-secondary)", fontFamily: "JetBrains Mono, monospace" }}
            value={unit.adaptive_focus}
            onChange={(event) => onUpdateUnitField(unit.iu_code, ["adaptive_focus"], event.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mono rounded-full px-3 py-1 text-[11px] font-bold" style={{ background: "var(--violet-dim)", border: "1px solid rgba(124,58,237,0.25)", color: "var(--violet)" }}>{unit.estimated_hours} hrs</span>
          <span className="mono rounded-full px-3 py-1 text-[10px] font-bold" style={hasIUContent(unit)
            ? { background: "var(--emerald-dim)", border: "1px solid rgba(0,255,163,0.2)", color: "var(--emerald)" }
            : { background: "var(--amber-dim)", border: "1px solid rgba(251,191,36,0.2)", color: "var(--amber)" }}>
            {hasIUContent(unit) ? "Blueprint fetched" : "Ready to fetch"}
          </span>
          <span className="mono rounded-full px-3 py-1 text-[10px] font-bold" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-subtle)", color: "var(--text-muted)" }}>Adaptive</span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <Metric title="Learning Objective" value={unit.learning_goal} detail="Outcome-aligned IU objective" compactValue />
        <Metric title="Delivery Mode" value="Adaptive Agentic" detail={unit.delivery_mode || "Practical self-guided learning with no faculty dependency"} />
        <Metric title="Complexity" value={unit.complexity_indicator} detail="Progressive adaptive flow" />
        <Metric title="Estimated Content Working Hours" value={unit.blueprint.production_estimate} detail="Generated after IU fetch" />
      </div>

      {hasIUContent(unit) ? (
        <>
          <div className="mt-4 rounded-lg border border-[#B3A124]/20 bg-[#B3A124]/10 p-5">
            <h4 className="font-black text-[#e9dc71] light:text-[#8a7d19]">Estimated Content Working Hours</h4>
            <div className="mt-4 grid gap-3 md:grid-cols-5">
              {Object.entries(unit.blueprint.production_effort).map(([label, value]) => (
                <Metric key={label} title={label} value={value} detail="Estimated effort" />
              ))}
            </div>
            <textarea
              className="thin-scroll mt-4 min-h-[120px] w-full resize-y rounded-lg border border-white/12 bg-black/15 p-4 text-sm leading-6 text-white/68 outline-none focus:border-[#B3A124] light:bg-white/70 light:text-slate-700"
              value={unit.blueprint.readiness_insight}
              onChange={(event) => onUpdateUnitField(unit.iu_code, ["blueprint", "readiness_insight"], event.target.value)}
            />
            {productId && (
              <div className="mt-4">
                <CommandButton icon={Download} onClick={() => window.open(learningIUDownloadUrl(productId, unit.iu_code), "_blank")}>
                  Download IU Content
                </CommandButton>
              </div>
            )}
          </div>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <ProductionFolder
              title="01. Knowledge"
              sections={[
                {
                  title: "A. Instructional Content Text (Word/PDF Ready)",
                  topics: unit.knowledge.instructional_content_text,
                  onChangeTopic: (index, field, value) => onUpdateUnitField(unit.iu_code, ["knowledge", "instructional_content_text", index, field], value),
                },
                {
                  title: "B. PPT Text",
                  topics: unit.knowledge.ppt_text,
                  onChangeTopic: (index, field, value) => onUpdateUnitField(unit.iu_code, ["knowledge", "ppt_text", index, field], value),
                },
                {
                  title: "C. PPT Videos / Podcast",
                  topics: unit.knowledge.ppt_videos_podcast,
                  onChangeTopic: (index, field, value) => onUpdateUnitField(unit.iu_code, ["knowledge", "ppt_videos_podcast", index, field], value),
                },
                {
                  title: "D. E-learning Activities",
                  topics: unit.knowledge.e_learning,
                  onChangeTopic: (index, field, value) => onUpdateUnitField(unit.iu_code, ["knowledge", "e_learning", index, field], value),
                },
              ]}
            />
            <ProductionFolder
              title="02. Skills"
              sections={[
                {
                  title: "A. Case Study Word Document",
                  topics: unit.skills.case_study_word_document,
                  onChangeTopic: (index, field, value) => onUpdateUnitField(unit.iu_code, ["skills", "case_study_word_document", index, field], value),
                },
                {
                  title: "B. Case Study PPT",
                  topics: unit.skills.case_study_ppt,
                  onChangeTopic: (index, field, value) => onUpdateUnitField(unit.iu_code, ["skills", "case_study_ppt", index, field], value),
                },
                {
                  title: "C. Case Study PPT Videos / Demo Videos",
                  topics: unit.skills.case_study_demo_videos,
                  onChangeTopic: (index, field, value) => onUpdateUnitField(unit.iu_code, ["skills", "case_study_demo_videos", index, field], value),
                },
                {
                  title: "D. Case Study Assignment",
                  topics: unit.skills.case_study_assignment,
                  onChangeTopic: (index, field, value) => onUpdateUnitField(unit.iu_code, ["skills", "case_study_assignment", index, field], value),
                },
              ]}
            />
            <div className="space-y-4">
              <IUContentBlock title="Learning Sequence" subtitle="Adaptive agentic flow for independent zero-level learners" items={unit.blueprint.learning_sequence} onChangeItem={(index, value) => onUpdateUnitField(unit.iu_code, ["blueprint", "learning_sequence", index], value)} />
              <IUContentBlock title="Glossary Concepts" subtitle="Concepts that need beginner-friendly explanations" items={unit.blueprint.glossary_concepts} onChangeItem={(index, value) => onUpdateUnitField(unit.iu_code, ["blueprint", "glossary_concepts", index], value)} />
              <IUContentBlock title="Adaptive Learning Support" subtitle="Scaffolding, confusion areas, and extra practice guidance" items={unit.blueprint.adaptive_learning_support} onChangeItem={(index, value) => onUpdateUnitField(unit.iu_code, ["blueprint", "adaptive_learning_support", index], value)} />
              <IUContentBlock title="Learning Outcome Alignment" subtitle="How outcomes connect to topics, practice, and assessment" items={unit.blueprint.learning_outcome_alignment} onChangeItem={(index, value) => onUpdateUnitField(unit.iu_code, ["blueprint", "learning_outcome_alignment", index], value)} />
            </div>
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-lg border border-[#B3A124]/25 bg-[#B3A124]/10 p-5">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h4 className="font-black text-[#e9dc71] light:text-[#8a7d19]">IU Blueprint Not Generated Yet</h4>
              <p className="mt-2 text-sm leading-6 text-white/65 light:text-slate-600">Fetch this IU to call OpenAI for curriculum-specific production topics and working-hour estimates.</p>
            </div>
            <CommandButton icon={loadingCode === unit.iu_code ? Loader2 : Sparkles} onClick={() => onFetchIU(unit.iu_code)} disabled={loadingCode === unit.iu_code}>
              {loadingCode === unit.iu_code ? `Fetching ${unit.iu_code}...` : `Fetch ${unit.iu_code} Blueprint`}
            </CommandButton>
          </div>
        </div>
      )}
    </div>
  );
}

function BlueprintViewer({ units, unit, selectedIUCode, onSelectIU, onFetchIU, onUpdateUnitField, loadingCode }) {
  if (!units.length) {
    return <EmptyState title="No Blueprint Selected" detail="Generate a production blueprint first, then return to this tab." />;
  }

  if (!unit) {
    return <EmptyState title="No IU Selected" detail="Choose an Instruction Unit to review or fetch its blueprint." />;
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-[#B3A124]/25 bg-[#B3A124]/10 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#e9dc71] light:text-[#8a7d19]">Content Blueprint Generator</p>
            <h3 className="mt-1 text-xl font-black">Adaptive Content Creator Guide</h3>
            <p className="mt-2 text-sm leading-6 text-white/65 light:text-slate-600">
              Use this tab to expand each IU topic into creator-ready guidance: suggested subtitles, real-world examples, learner steps, gamified/adaptive interactions, and demo recording ideas for learners who must complete the IU without faculty support.
            </p>
          </div>
          <IUTabSelector units={units} selectedIUCode={selectedIUCode} onSelectIU={onSelectIU} compact />
        </div>
      </div>

      {!hasIUContent(unit) ? (
        <div className="rounded-lg border border-[#B3A124]/25 bg-[#B3A124]/10 p-5">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <h4 className="font-black text-[#e9dc71] light:text-[#8a7d19]">{unit.iu_code} blueprint is not generated yet</h4>
              <p className="mt-2 text-sm leading-6 text-white/65 light:text-slate-600">Fetch this IU to generate curriculum-specific content topics, case study assets, and assessment structure.</p>
            </div>
            <CommandButton icon={loadingCode === unit.iu_code ? Loader2 : Sparkles} onClick={() => onFetchIU(unit.iu_code)} disabled={loadingCode === unit.iu_code}>
              {loadingCode === unit.iu_code ? `Fetching ${unit.iu_code}...` : `Fetch ${unit.iu_code} Blueprint`}
            </CommandButton>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 xl:grid-cols-2">
            <ProductionFolder
              title="Knowledge Asset Guidance"
              sections={[
                {
                  title: "Instructional Context Text",
                  topics: unit.knowledge.instructional_content_text,
                  onChangeTopic: (index, field, value) => onUpdateUnitField(unit.iu_code, ["knowledge", "instructional_content_text", index, field], value),
                },
                {
                  title: "PPT Slide Content",
                  topics: unit.knowledge.ppt_text,
                  onChangeTopic: (index, field, value) => onUpdateUnitField(unit.iu_code, ["knowledge", "ppt_text", index, field], value),
                },
              ]}
            />
            <ProductionFolder
              title="Interactive Media Guidance"
              sections={[
                {
                  title: "PPT Video / Podcast / Demo Recording",
                  topics: unit.knowledge.ppt_videos_podcast,
                  onChangeTopic: (index, field, value) => onUpdateUnitField(unit.iu_code, ["knowledge", "ppt_videos_podcast", index, field], value),
                },
                {
                  title: "Gamified E-learning Activities",
                  topics: unit.knowledge.e_learning,
                  onChangeTopic: (index, field, value) => onUpdateUnitField(unit.iu_code, ["knowledge", "e_learning", index, field], value),
                },
              ]}
            />
            <ProductionFolder
              title="Real Industry Case Study Guidance"
              sections={[
                {
                  title: "Case Study Scenario",
                  topics: unit.skills.case_study_word_document,
                  onChangeTopic: (index, field, value) => onUpdateUnitField(unit.iu_code, ["skills", "case_study_word_document", index, field], value),
                },
                {
                  title: "Case Study PPT / Demo / Assignment",
                  topics: [...unit.skills.case_study_ppt, ...unit.skills.case_study_demo_videos, ...unit.skills.case_study_assignment],
                  onChangeTopic: (index, field, value) => {
                    const pptCount = unit.skills.case_study_ppt.length;
                    const videoCount = unit.skills.case_study_demo_videos.length;
                    if (index < pptCount) {
                      onUpdateUnitField(unit.iu_code, ["skills", "case_study_ppt", index, field], value);
                    } else if (index < pptCount + videoCount) {
                      onUpdateUnitField(unit.iu_code, ["skills", "case_study_demo_videos", index - pptCount, field], value);
                    } else {
                      onUpdateUnitField(unit.iu_code, ["skills", "case_study_assignment", index - pptCount - videoCount, field], value);
                    }
                  },
                },
              ]}
            />
            <div className="space-y-4">
              <IUContentBlock title="Adaptive Agentic Learning Flow" subtitle="No faculty support, no missing steps, practical and game-like progression" items={unit.blueprint.learning_sequence} onChangeItem={(index, value) => onUpdateUnitField(unit.iu_code, ["blueprint", "learning_sequence", index], value)} />
              <IUContentBlock title="Real-World Examples and Glossary" subtitle="Simple explanations for zero-level learners" items={unit.blueprint.glossary_concepts} onChangeItem={(index, value) => onUpdateUnitField(unit.iu_code, ["blueprint", "glossary_concepts", index], value)} />
              <IUContentBlock title="Creator Suggestions" subtitle="Scaffolding, hints, feedback loops, checkpoints, and practice guidance" items={unit.blueprint.adaptive_learning_support} onChangeItem={(index, value) => onUpdateUnitField(unit.iu_code, ["blueprint", "adaptive_learning_support", index], value)} />
              <IUContentBlock title="Outcome Alignment" subtitle="How each asset closes learner gaps" items={unit.blueprint.learning_outcome_alignment} onChangeItem={(index, value) => onUpdateUnitField(unit.iu_code, ["blueprint", "learning_outcome_alignment", index], value)} />
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/7 p-5 light:bg-white/70">
            <h3 className="font-black text-[#e9dc71] light:text-[#8a7d19]">Case Study Text</h3>
            <textarea
              className="thin-scroll mt-3 min-h-[180px] w-full resize-y rounded-lg border border-white/12 bg-black/15 px-4 py-3 text-sm leading-7 text-white/68 outline-none focus:border-[#B3A124] light:bg-white light:text-slate-700"
              value={unit.blueprint.case_study_text}
              onChange={(event) => onUpdateUnitField(unit.iu_code, ["blueprint", "case_study_text"], event.target.value)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function AssessmentViewer({ units, checks, onUpdateChecks, onUpdateUnitField, selectedIUCode, onSelectIU }) {
  if (!units.length) {
    return <EmptyState title="No Assessments Generated" detail="Generate a production blueprint first to create IU assessment plans." />;
  }

  const activeUnit = units.find((unit) => unit.iu_code === selectedIUCode) || units[0];

  return (
    <div className="space-y-4">
      <InfoPanel title="Assessment Alignment Checks" items={checks} onChangeItem={onUpdateChecks} />
      <div className="rounded-lg border border-[#B3A124]/25 bg-[#B3A124]/10 p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#e9dc71] light:text-[#8a7d19]">Assessment Planning</p>
            <h3 className="mt-1 text-xl font-black">Review Each IU Assessment Separately</h3>
            <p className="mt-2 text-sm leading-6 text-white/65 light:text-slate-600">Use the same IU tabs to move through MCQs, assessment assignments, and marking rubrics one unit at a time.</p>
          </div>
          <IUTabSelector units={units} selectedIUCode={activeUnit?.iu_code} onSelectIU={onSelectIU} compact />
        </div>
      </div>
      {activeUnit && (
        <div className="grid gap-4 rounded-lg border border-white/10 bg-white/7 p-5 light:bg-white/70 lg:grid-cols-2">
          <InfoPanel title={`${activeUnit.iu_code} MCQ Assessment`} items={activeUnit.assessment.mcqs} compact onChangeItem={(index, value) => {
            onUpdateUnitField(activeUnit.iu_code, ["assessment", "mcqs", index], value);
            onUpdateUnitField(activeUnit.iu_code, ["assessment_blueprint", "mcq_assessment", index, "description"], value);
          }} />
          <InfoPanel title={`${activeUnit.iu_code} Quiz`} items={activeUnit.assessment.quizzes} compact onChangeItem={(index, value) => {
            onUpdateUnitField(activeUnit.iu_code, ["assessment", "quizzes", index], value);
            onUpdateUnitField(activeUnit.iu_code, ["assessment_blueprint", "quiz", index, "description"], value);
          }} />
          <InfoPanel title={`${activeUnit.iu_code} Assessment Assignment`} items={activeUnit.assessment.assignments} compact onChangeItem={(index, value) => {
            onUpdateUnitField(activeUnit.iu_code, ["assessment", "assignments", index], value);
            onUpdateUnitField(activeUnit.iu_code, ["assessment_blueprint", "assessment_assignment", index, "description"], value);
          }} />
          <InfoPanel title={`${activeUnit.iu_code} Marking Rubrics`} items={activeUnit.assessment.evaluation_objectives} compact onChangeItem={(index, value) => {
            onUpdateUnitField(activeUnit.iu_code, ["assessment", "evaluation_objectives", index], value);
            onUpdateUnitField(activeUnit.iu_code, ["assessment_blueprint", "marking_rubrics", index, "description"], value);
          }} />
          <textarea
            className="thin-scroll min-h-[120px] w-full resize-y rounded-lg border border-[#B3A124]/20 bg-[#B3A124]/10 p-4 text-sm leading-6 text-white/70 outline-none focus:border-[#B3A124] light:text-slate-700 lg:col-span-2"
            value={activeUnit.assessment.alignment_check}
            onChange={(event) => onUpdateUnitField(activeUnit.iu_code, ["assessment", "alignment_check"], event.target.value)}
          />
        </div>
      )}
    </div>
  );
}

function IUTabSelector({ units, selectedIUCode, onSelectIU, compact = false }) {
  return (
    <div className="flex flex-wrap gap-2">
      {units.map((unit) => (
        <button
          key={unit.iu_code}
          onClick={() => onSelectIU(unit.iu_code)}
          className={`rounded-lg border text-left transition ${
            compact ? "px-3 py-2" : "px-4 py-3"
          } ${
            selectedIUCode === unit.iu_code
              ? "border-[#B3A124]/50 bg-[#B3A124] text-[#10263f]"
              : "border-white/10 bg-white/7 text-white/75 hover:bg-white/12 light:bg-white/70 light:text-slate-700"
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em]">
            <span>{unit.iu_code}</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] ${
              hasIUContent(unit)
                ? "bg-emerald-400/20 text-emerald-100 light:text-emerald-700"
                : "bg-black/15 text-white/70 light:bg-slate-100 light:text-slate-600"
            }`}>
              {hasIUContent(unit) ? "Fetched" : "Ready"}
            </span>
          </div>
          <p className={`mt-2 font-bold leading-5 ${compact ? "max-w-[10rem] text-xs" : "max-w-[14rem] text-sm"}`}>{unit.title}</p>
        </button>
      ))}
    </div>
  );
}

function ProjectBriefViewer({ productId, project, onUpdateField, onUpdateList }) {
  if (!project) {
    return <EmptyState title="No Project Brief Generated" detail="Generate a production blueprint first to prepare final assessment project planning." />;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-lg border border-[#B3A124]/25 bg-[#B3A124]/10 p-5 lg:col-span-2">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#e9dc71] light:text-[#8a7d19]">IU Assignment Based Document</p>
            <h3 className="mt-1 text-xl font-black">Final Assessment Project Brief</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/65 light:text-slate-600">
              Review and save the curriculum first. The generated document pulls the saved IU knowledge, skills, assessment assignments, and marking rubrics into a complete project brief.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CommandButton icon={Download} onClick={() => window.open(learningProjectBriefDownloadUrl(productId, "docx"), "_blank")} disabled={!productId}>
              Download DOCX
            </CommandButton>
            <CommandButton icon={Presentation} onClick={() => window.open(learningProjectBriefDownloadUrl(productId, "ppt"), "_blank")} disabled={!productId}>
              Download PPT
            </CommandButton>
          </div>
        </div>
        <textarea className="thin-scroll mt-3 min-h-[150px] w-full resize-y rounded-lg border border-white/12 bg-black/15 p-4 text-sm leading-7 text-white/70 outline-none focus:border-[#B3A124] light:bg-white light:text-slate-700" value={project.project_brief} onChange={(event) => onUpdateField("project_brief", event.target.value)} />
        <textarea className="thin-scroll mt-3 min-h-[140px] w-full resize-y rounded-lg border border-white/12 bg-black/15 p-4 text-sm leading-7 outline-none focus:border-[#B3A124] light:bg-white/70" value={project.capstone_scenario} onChange={(event) => onUpdateField("capstone_scenario", event.target.value)} />
      </div>
      <InfoPanel title="Generated Document Sections" items={["Project Scenario", "Project Objectives", "Learning Outcomes", "Project Format - DOCX / PPT", "Tasks - Task 1, Task 2, etc.", "Marking Rubrics - Details"]} />
      <InfoPanel title="Project Deliverables" items={project.project_deliverables} onChangeItem={(index, value) => onUpdateList("project_deliverables", index, value)} />
      <InfoPanel title="Presentation Outline" items={project.presentation_outline} onChangeItem={(index, value) => onUpdateList("presentation_outline", index, value)} />
      <InfoPanel title="Evaluation Criteria" items={project.evaluation_criteria} onChangeItem={(index, value) => onUpdateList("evaluation_criteria", index, value)} className="lg:col-span-2" />
    </div>
  );
}

function LiaContentChatPanel({ productId, units = [], onIUGenerated }) {
  const nextReadyUnit = units.find((unit) => !hasIUContent(unit)) || units[0];
  const quickPrompts = [
    nextReadyUnit ? `Fetch ${nextReadyUnit.iu_code}` : "Fetch IU01",
    "What should be in the project brief?",
    "Which IU knowledge should be covered?",
    "Which skills evidence should learners submit?",
    "How should I structure the marking rubrics?",
    "What production handoff tasks need attention?",
    "What should I review before saving?",
  ];
  const [question, setQuestion] = useState(quickPrompts[0]);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Ask LIA about project brief tasks, IU knowledge, skills evidence, marking rubrics, production handoff, or review readiness for this Product Plan.",
      actions: ["Type 'Fetch IU01' or use the Fetch quick prompt if the chat says no saved IU data exists yet."],
      confidence: "Ready",
    },
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");

  async function askLia(prompt = question) {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt || !productId) {
      return;
    }
    setChatLoading(true);
    setChatError("");
    setMessages((items) => [...items, { role: "user", text: cleanPrompt }]);
    setQuestion("");
    try {
      const result = await learningContentChatApi({ product_id: productId, question: cleanPrompt });
      if (result.fetched_iu && onIUGenerated) {
        onIUGenerated(result.fetched_iu);
      }
      setMessages((items) => [
        ...items,
        {
          role: "assistant",
          text: result.answer,
          actions: result.suggested_actions || [],
          confidence: result.confidence || "Medium",
        },
      ]);
    } catch (err) {
      setChatError(learningErrorMessage(err, "LIA Content Chat could not answer right now."));
    } finally {
      setChatLoading(false);
    }
  }

  return (
    <section className="rounded-lg border border-[#B3A124]/30 bg-[#1A3E6B]/55 p-5 shadow-2xl shadow-[#1A3E6B]/25 backdrop-blur light:bg-white">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-[#B3A124]/35 bg-[#B3A124]/15 p-2">
            <MessageSquare className="agent-pulse text-[#f1e47a]" size={18} />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#e9dc71] light:text-[#8a7d19]">LIA Content Agentic AI</p>
            <h3 className="text-lg font-black">Curriculum copilot</h3>
          </div>
        </div>
        <ContentChatBadge label="Context Aware" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {quickPrompts.map((prompt) => (
          <button
            key={prompt}
            onClick={() => askLia(prompt)}
            disabled={chatLoading || !productId}
            className="rounded-lg border border-white/10 bg-white/8 px-3 py-2 text-left text-xs font-bold text-white/70 transition hover:border-[#B3A124]/40 hover:bg-[#B3A124]/15 disabled:cursor-not-allowed disabled:opacity-50 light:text-slate-600"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="thin-scroll mt-4 max-h-[360px] space-y-3 overflow-y-auto pr-1">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={`rounded-lg border p-3 ${message.role === "user" ? "ml-8 border-[#B3A124]/25 bg-[#B3A124]/12" : "border-white/10 bg-black/15 light:border-slate-200 light:bg-slate-50"}`}>
            <div className="mb-2 flex items-center gap-2">
              {message.role === "user" ? <UserRound size={14} className="text-[#f1e47a]" /> : <Sparkles size={14} className="text-[#f1e47a]" />}
              <span className="text-xs font-black uppercase tracking-[.14em] text-white/45 light:text-slate-500">{message.role === "user" ? "You" : "LIA"}</span>
              {message.confidence && <span className="ml-auto text-[11px] font-bold text-[#e9dc71] light:text-[#8a7d19]">{message.confidence}</span>}
            </div>
            <p className="whitespace-pre-line text-sm leading-6 text-white/72 light:text-slate-700">{message.text}</p>
            {message.actions?.length > 0 && (
              <div className="mt-3 space-y-2">
                {message.actions.map((action) => (
                  <p key={action} className="rounded-md border border-[#B3A124]/20 bg-[#B3A124]/10 px-3 py-2 text-xs leading-5 text-white/70 light:text-slate-700">{action}</p>
                ))}
              </div>
            )}
          </div>
        ))}
        {chatLoading && (
          <div className="rounded-lg border border-[#B3A124]/20 bg-[#B3A124]/10 p-3">
            <div className="flex items-center gap-2 text-sm font-bold text-[#f1e47a]">
              <Loader2 className="animate-spin" size={16} />
              LIA is reading the saved IU content...
            </div>
          </div>
        )}
      </div>

      {chatError && <p className="mt-3 rounded-lg border border-rose-300/20 bg-rose-300/10 p-3 text-sm text-rose-100 light:text-rose-700">{chatError}</p>}

      <div className="mt-4 flex gap-2">
        <input
          className="min-w-0 flex-1 rounded-lg border border-white/12 bg-black/20 px-4 py-3 text-sm outline-none transition focus:border-[#B3A124] light:bg-white/70"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") askLia();
          }}
          placeholder="Ask about project tasks, IU knowledge, skills, or rubrics..."
          disabled={chatLoading || !productId}
        />
        <button
          className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-[#B3A124] text-[#10263f] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => askLia()}
          disabled={chatLoading || !question.trim() || !productId}
          title="Ask LIA"
        >
          {chatLoading ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
        </button>
      </div>
    </section>
  );
}

function ContentChatBadge({ label }) {
  return <span className="rounded-full border border-[#B3A124]/25 bg-[#B3A124]/15 px-3 py-1 text-xs font-black text-[#f1e47a] light:text-[#8a7d19]">{label}</span>;
}

function ProductionHandoffBoard({ history, loading, saving, emailing, onRefresh, onSave, onClear, onClearRecord, onUpdateAssignment, onSendIU, onRemindIU }) {
  const [openModules, setOpenModules] = useState({});
  const [openUnits, setOpenUnits] = useState({});
  const totalTasks = history.reduce((count, record) => count + (record.units || []).reduce((sum, unit) => sum + (unit.assignments || []).length, 0), 0);
  const completedTasks = history.reduce(
    (count, record) => count + (record.units || []).reduce((sum, unit) => sum + (unit.assignments || []).filter((row) => row.status === "Completed").length, 0),
    0
  );
  const activeTasks = Math.max(totalTasks - completedTasks, 0);
  const totalModules = history.length;
  const memberStats = buildTeamStats(history);
  const statusCounts = ["Pending", "In Progress", "Under Review", "Completed"].map((status) => ({
    label: status,
    value: history.reduce((sum, record) => sum + (record.units || []).reduce((inner, unit) => inner + (unit.assignments || []).filter((row) => (row.status || "Pending") === status).length, 0), 0),
  }));

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-[#B3A124]/25 bg-[#B3A124]/10 p-5">
        <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-[#e9dc71] light:text-[#8a7d19]">Production Handoff History</p>
            <h3 className="mt-1 text-xl font-black">Module Content Assignment Board</h3>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/65 light:text-slate-600">
              Review module versions first, open an IU only when you need topic-level assignment, then send the IU package and task brief to the assigned production team by SMTP.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["Board View", "Timeline", "Workload", "Files"].map((label, index) => (
                <span key={label} className={`rounded-lg border px-3 py-1.5 text-xs font-black ${index === 0 ? "border-[#B3A124]/30 bg-[#B3A124]/20 text-[#fff4a6] light:text-[#8a7d19]" : "border-white/10 bg-white/7 text-white/55 light:bg-white light:text-slate-500"}`}>
                  {label}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <CommandButton icon={loading ? Loader2 : Sparkles} onClick={onRefresh} disabled={loading}>
              {loading ? "Loading..." : "Refresh History"}
            </CommandButton>
            <CommandButton icon={saving ? Loader2 : Save} onClick={onSave} disabled={saving || totalTasks === 0}>
              {saving ? "Saving..." : "Save Assignments"}
            </CommandButton>
            <button className="inline-flex items-center gap-2 rounded-lg border border-red-300/25 bg-red-300/10 px-3 py-2 text-xs font-black text-red-100 transition hover:bg-red-300/20 light:text-red-700" onClick={onClear}>
              <Eraser size={14} />
              Clear History
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Metric title="Total Modules" value={totalModules} detail="Saved module records" />
        <Metric title="Active Tasks" value={activeTasks} detail="Pending, in progress, or review" />
        <Metric title="Completed" value={completedTasks} detail="Marked completed by team" />
      </div>
      <div className="grid gap-3 xl:grid-cols-2">
        <PerformancePie data={statusCounts} />
        <TeamLineGraph data={memberStats} />
      </div>

      {loading ? (
        <LoadingBlueprint />
      ) : history.length === 0 ? (
        <EmptyState title="No Module Content History Yet" detail="Analyze a Product Plan, fetch IU blueprints, approve/save the review, then return here for assignment tracking and downloads." />
      ) : (
        <div className="space-y-5">
          {history.map((record, recordIndex) => {
            const moduleOpen = openModules[record.id] ?? recordIndex === 0;
            const moduleTasks = (record.units || []).reduce((sum, unit) => sum + (unit.assignments || []).length, 0);
            const moduleCompleted = (record.units || []).reduce((sum, unit) => sum + (unit.assignments || []).filter((row) => row.status === "Completed").length, 0);
            const versionLabel = `Version ${record.version || history.length - recordIndex}`;
            return (
              <div key={record.id} className="rounded-lg border border-white/10 bg-white/7 p-5 light:bg-white/70">
                <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-center">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-xs font-black uppercase tracking-[.16em] text-[#e9dc71] light:text-[#8a7d19]">Module-wise Production Record</p>
                      <span className="rounded-full border border-[#B3A124]/25 bg-[#B3A124]/10 px-2 py-1 text-[10px] font-black text-[#e9dc71] light:text-[#8a7d19]">{versionLabel}</span>
                    </div>
                    <h4 className="mt-2 text-lg font-black">Module: {record.title} ({record.module_code || "N/A"})</h4>
                    <p className="mt-1 text-sm text-white/55 light:text-slate-600">{record.course_name || "Course name pending"} | {record.readiness_status}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-xs font-black text-white/70 light:bg-slate-100 light:text-slate-600">{record.total_learning_hours || 0} learner hrs</span>
                    <span className="rounded-full border border-white/10 bg-black/15 px-3 py-1 text-xs font-black text-white/70 light:bg-slate-100 light:text-slate-600">{moduleCompleted}/{moduleTasks} completed</span>
                    <button className="inline-flex items-center gap-2 rounded-lg border border-red-300/25 bg-red-300/10 px-3 py-2 text-xs font-black text-red-100 transition hover:bg-red-300/20 light:text-red-700" onClick={(event) => { event.stopPropagation(); onClearRecord(record.id); }}>
                      <Eraser size={14} />
                      Clear This Record
                    </button>
                    <button className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/8 px-3 py-2 text-xs font-black text-white/75 transition hover:bg-white/12 light:bg-white light:text-slate-700" onClick={() => setOpenModules((current) => ({ ...current, [record.id]: !moduleOpen }))}>
                      <ChevronDown size={15} className={`transition ${moduleOpen ? "rotate-180" : ""}`} />
                      {moduleOpen ? "Hide IUs" : "Show IUs"}
                    </button>
                  </div>
                </div>
                {moduleOpen && (
                  <div className="mt-4 grid gap-4">
                    {(record.units || []).map((unit) => {
                      const unitKey = `${record.id}-${unit.iu_code}`;
                      return (
                        <IUHandoffCard
                          key={unitKey}
                          record={record}
                          unit={unit}
                          open={!!openUnits[unitKey]}
                          emailing={emailing}
                          onToggle={() => setOpenUnits((current) => ({ ...current, [unitKey]: !current[unitKey] }))}
                          onUpdateAssignment={onUpdateAssignment}
                          onSendIU={onSendIU}
                          onRemindIU={onRemindIU}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function IUHandoffCard({ record, unit, open, emailing, onToggle, onUpdateAssignment, onSendIU, onRemindIU }) {
  const [bulkOwner, setBulkOwner] = useState("");
  const [bulkEmail, setBulkEmail] = useState("");
  const [bulkStart, setBulkStart] = useState("");
  const [bulkDeadline, setBulkDeadline] = useState("");
  const rows = unit.assignments || [];
  const completed = rows.filter((row) => row.status === "Completed").length;
  const active = rows.filter((row) => ["Pending", "In Progress", "Under Review"].includes(row.status || "Pending")).length;
  const owners = new Set(rows.map((row) => row.owner).filter(Boolean)).size;
  const progress = rows.length ? Math.round((completed / rows.length) * 100) : 0;
  const sendKey = `${record.id}-${unit.iu_code}-send`;
  const reminderKey = `${record.id}-${unit.iu_code}-remind`;
  const missingDeadline = rows.some((row) => !(row.deadline || "").trim());

  function applyBulkAssignment() {
    rows.forEach((_, index) => {
      if (bulkOwner) onUpdateAssignment(record.id, unit.iu_code, index, "owner", bulkOwner);
      if (bulkEmail) onUpdateAssignment(record.id, unit.iu_code, index, "owner_email", bulkEmail);
      if (bulkStart) onUpdateAssignment(record.id, unit.iu_code, index, "start_date", bulkStart);
      if (bulkDeadline) onUpdateAssignment(record.id, unit.iu_code, index, "deadline", bulkDeadline);
    });
  }

  return (
    <div className="rounded-lg border border-white/10 bg-black/15 p-4 light:border-slate-200 light:bg-slate-50">
      <div className="flex flex-col gap-4 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs font-black uppercase tracking-[.16em] text-[#e9dc71] light:text-[#8a7d19]">{unit.iu_code}</p>
            <span className={`rounded-full px-2 py-1 text-[10px] font-black ${progress === 100 ? "bg-teal-300/15 text-teal-100 light:text-teal-700" : "bg-[#B3A124]/10 text-[#e9dc71] light:text-[#8a7d19]"}`}>{progress}% complete</span>
            <span className="rounded-full bg-white/7 px-2 py-1 text-[10px] font-black text-white/55 light:bg-white light:text-slate-500">{unit.status}</span>
          </div>
          <h5 className="mt-2 font-black">{unit.iu_title}</h5>
          <p className="mt-1 max-w-4xl text-xs leading-5 text-white/50 light:text-slate-500">{unit.learning_goal || "Topic-level production tasks appear after the IU blueprint is saved."}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <DownloadButton productId={record.id} iuCode={unit.iu_code} format="docx" label="DOCX" icon={FileText} />
          <DownloadButton productId={record.id} iuCode={unit.iu_code} format="xls" label="XLS" icon={FileSpreadsheet} />
          <DownloadButton productId={record.id} iuCode={unit.iu_code} format="pdf" label="PDF" icon={Download} />
          <button className="inline-flex items-center gap-2 rounded-lg border border-[#B3A124]/25 bg-[#B3A124]/10 px-3 py-2 text-xs font-black text-[#e9dc71] transition hover:bg-[#B3A124]/15 light:text-[#8a7d19] disabled:opacity-50" onClick={() => onSendIU(record, unit)} disabled={!rows.length || emailing === sendKey}>
            {emailing === sendKey ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
            Send Handoff
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs font-black text-amber-100 transition hover:bg-amber-300/15 light:text-amber-700 disabled:opacity-50" onClick={() => onRemindIU(record, unit)} disabled={!rows.length || active === 0 || emailing === reminderKey}>
            {emailing === reminderKey ? <Loader2 size={15} className="animate-spin" /> : <Bell size={15} />}
            Reminder
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/8 px-3 py-2 text-xs font-black text-white/75 transition hover:bg-white/12 light:bg-white light:text-slate-700" onClick={onToggle}>
            <ChevronDown size={15} className={`transition ${open ? "rotate-180" : ""}`} />
            {open ? "Hide Topics" : "Assign Topics"}
          </button>
        </div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-4">
        {["Pending", "In Progress", "Under Review", "Completed"].map((status) => (
          <StatusLane key={status} status={status} count={rows.filter((row) => (row.status || "Pending") === status).length} />
        ))}
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8 light:bg-slate-200">
        <div className="h-full rounded-full bg-[#B3A124]" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-[.12em] text-white/45 light:text-slate-500">
        <span>{rows.length} production topics</span>
        <span>{owners} assigned owners</span>
        <span>{active} open tasks</span>
        {missingDeadline && <span className="text-amber-200 light:text-amber-700">Deadline required before handoff</span>}
      </div>
      <div className="mt-3 rounded-lg border border-white/10 bg-white/7 p-3 light:bg-white">
        <p className="text-xs font-black uppercase tracking-[.12em] text-[#e9dc71] light:text-[#8a7d19]">Assign One Person to Whole IU</p>
        <div className="mt-2 grid gap-2 lg:grid-cols-5">
          <input className="rounded-md border border-white/10 bg-black/15 px-3 py-2 text-sm outline-none focus:border-[#B3A124] light:bg-slate-50" placeholder="Owner name" value={bulkOwner} onChange={(event) => setBulkOwner(event.target.value)} />
          <input className="rounded-md border border-white/10 bg-black/15 px-3 py-2 text-sm outline-none focus:border-[#B3A124] light:bg-slate-50" placeholder="Owner email" value={bulkEmail} onChange={(event) => setBulkEmail(event.target.value)} />
          <input type="date" className="rounded-md border border-white/10 bg-black/15 px-3 py-2 text-sm outline-none focus:border-[#B3A124] light:bg-slate-50" value={bulkStart} onChange={(event) => setBulkStart(event.target.value)} />
          <input type="date" className="rounded-md border border-white/10 bg-black/15 px-3 py-2 text-sm outline-none focus:border-[#B3A124] light:bg-slate-50" value={bulkDeadline} onChange={(event) => setBulkDeadline(event.target.value)} />
          <button className="rounded-md border border-[#B3A124]/30 bg-[#B3A124]/20 px-3 py-2 text-sm font-black text-[#fff4a6] transition hover:bg-[#B3A124]/30 light:text-[#8a7d19]" onClick={applyBulkAssignment}>
            Apply to all tasks
          </button>
        </div>
      </div>
      {open && <AssignmentTable productId={record.id} unit={unit} onUpdateAssignment={onUpdateAssignment} />}
    </div>
  );
}

function StatusLane({ status, count }) {
  const tone = statusTone(status);
  return (
    <div className={`rounded-lg border px-3 py-2 ${tone.lane}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[.12em]">{status}</p>
        <span className={`rounded-md px-2 py-0.5 text-xs font-black ${tone.badge}`}>{count}</span>
      </div>
    </div>
  );
}

function DownloadButton({ productId, iuCode, format, label, icon: Icon }) {
  return (
    <button
      className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/8 px-3 py-2 text-xs font-black text-white/75 transition hover:bg-white/12 light:bg-white light:text-slate-700"
      onClick={() => window.open(learningIUDownloadUrl(productId, iuCode, format), "_blank")}
    >
      <Icon size={15} />
      {label}
    </button>
  );
}

function AssignmentTable({ productId, unit, onUpdateAssignment }) {
  const rows = unit.assignments || [];
  if (!rows.length) {
    return <p className="mt-4 rounded-lg bg-white/7 p-3 text-sm text-white/55 light:bg-white light:text-slate-500">Fetch and save this IU blueprint to generate assignable production topics.</p>;
  }
  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-white/10 bg-white/[0.04] light:bg-white">
      <div className="flex flex-col justify-between gap-3 border-b border-white/10 bg-[#1A3E6B]/35 px-4 py-3 md:flex-row md:items-center light:bg-slate-100">
        <div>
          <p className="text-xs font-black uppercase tracking-[.16em] text-[#e9dc71] light:text-[#8a7d19]">Topic Assignment Board</p>
          <p className="mt-1 text-sm text-white/55 light:text-slate-600">Assign by content asset, owner, timeline, and production status.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <BoardChip label="Owner" />
          <BoardChip label="Timeline" />
          <BoardChip label="Status" />
          <BoardChip label="Notification" />
        </div>
      </div>
      <div className="thin-scroll overflow-x-auto">
      <table className="min-w-[1180px] w-full border-separate border-spacing-0 text-left text-sm">
        <thead className="bg-black/20 text-xs uppercase tracking-[.14em] text-white/45 light:bg-slate-50 light:text-slate-500">
          <tr>
            <th className="w-[320px] px-4 py-3">Task</th>
            <th className="w-[250px] px-4 py-3">Assignee</th>
            <th className="w-[300px] px-4 py-3">Timeline</th>
            <th className="w-[190px] px-4 py-3">Status</th>
            <th className="w-[170px] px-4 py-3">Notification</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const tone = statusTone(row.status);
            const overdue = isOverdue(row.deadline, row.status);
            const showGroup = index === 0 || rows[index - 1]?.asset_type !== row.asset_type;
            return (
            <Fragment key={`${row.asset_type}-${row.topic_code}-${index}`}>
            {showGroup && (
              <tr key={`${row.asset_type}-group`}>
                <td colSpan={5} className="border-t border-white/10 bg-[#1A3E6B]/20 px-4 py-2 text-xs font-black uppercase tracking-[.16em] text-[#e9dc71] light:bg-slate-100 light:text-[#8a7d19]">
                  {row.asset_type}
                </td>
              </tr>
            )}
            <tr key={`${row.asset_type}-${row.topic_code}-${index}`} className="group border-b border-white/10 bg-white/[0.03] transition hover:bg-white/[0.08] light:bg-white light:hover:bg-slate-50">
              <td className={`border-l-4 px-4 py-3 ${tone.border}`}>
                <div className="flex items-start gap-3">
                  <span className={`mt-1 rounded-md px-2 py-1 text-[11px] font-black ${tone.badge}`}>{row.topic_code || "Task"}</span>
                  <div>
                    <p className="font-black leading-5">{row.topic_title}</p>
                    <p className="mt-1 text-xs font-semibold text-white/45 light:text-slate-500">{row.asset_type}</p>
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#B3A124] text-xs font-black text-[#10263f]">
                    {ownerInitials(row.owner)}
                  </div>
                  <div className="min-w-0 flex-1 space-y-2">
                    <input className="w-full rounded-md border border-white/10 bg-black/15 px-3 py-2 text-sm outline-none focus:border-[#B3A124] light:bg-slate-50" value={row.owner || ""} onChange={(event) => onUpdateAssignment(productId, unit.iu_code, index, "owner", event.target.value)} placeholder="Team member" />
                    <input type="email" className="w-full rounded-md border border-white/10 bg-black/15 px-3 py-2 text-xs outline-none focus:border-[#B3A124] light:bg-slate-50" value={row.owner_email || ""} onChange={(event) => onUpdateAssignment(productId, unit.iu_code, index, "owner_email", event.target.value)} placeholder="name@company.com" />
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <div className={`rounded-lg border p-2 ${overdue ? "border-red-300/30 bg-red-300/10" : "border-white/10 bg-black/10 light:bg-slate-50"}`}>
                  <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[.12em] text-white/45 light:text-slate-500">
                    <CalendarDays size={13} />
                    {overdue ? "Overdue" : "Production Window"}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="date" className="w-full rounded-md border border-white/10 bg-black/15 px-2 py-2 text-xs outline-none focus:border-[#B3A124] light:bg-white" value={row.start_date || ""} onChange={(event) => onUpdateAssignment(productId, unit.iu_code, index, "start_date", event.target.value)} />
                    <input type="date" className="w-full rounded-md border border-white/10 bg-black/15 px-2 py-2 text-xs outline-none focus:border-[#B3A124] light:bg-white" value={row.deadline || ""} onChange={(event) => onUpdateAssignment(productId, unit.iu_code, index, "deadline", event.target.value)} />
                  </div>
                </div>
              </td>
              <td className="px-4 py-3">
                <select className={`w-full rounded-lg border px-3 py-2 text-sm font-black outline-none transition focus:border-[#B3A124] ${tone.select}`} value={row.status || "Pending"} onChange={(event) => onUpdateAssignment(productId, unit.iu_code, index, "status", event.target.value)}>
                  {["Pending", "In Progress", "Under Review", "Completed"].map((status) => (
                    <option key={status} value={status} className="bg-[#10263f] text-white">{status}</option>
                  ))}
                </select>
              </td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-1 text-[11px] font-black ${notificationTone(row.email_status)}`}>{row.email_status || "Not Sent"}</span>
              </td>
            </tr>
            </Fragment>
          )})}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function BoardChip({ label }) {
  return <span className="rounded-md border border-white/10 bg-black/15 px-2.5 py-1 text-[11px] font-black text-white/55 light:bg-white light:text-slate-500">{label}</span>;
}

function statusTone(status = "Pending") {
  const tones = {
    Pending: {
      lane: "border-slate-300/20 bg-slate-300/10 text-slate-100 light:text-slate-600",
      badge: "bg-slate-300/20 text-slate-100 light:text-slate-700",
      border: "border-slate-300/45",
      select: "border-slate-300/25 bg-slate-300/15 text-slate-100 light:bg-slate-100 light:text-slate-700",
    },
    "In Progress": {
      lane: "border-[#B3A124]/25 bg-[#B3A124]/10 text-[#fff4a6] light:text-[#8a7d19]",
      badge: "bg-[#B3A124]/25 text-[#fff4a6] light:text-[#8a7d19]",
      border: "border-[#B3A124]",
      select: "border-[#B3A124]/35 bg-[#B3A124]/20 text-[#fff4a6] light:bg-[#B3A124]/15 light:text-[#8a7d19]",
    },
    "Under Review": {
      lane: "border-sky-300/25 bg-sky-300/10 text-sky-100 light:text-sky-700",
      badge: "bg-sky-300/20 text-sky-100 light:text-sky-700",
      border: "border-sky-300/65",
      select: "border-sky-300/35 bg-sky-300/15 text-sky-100 light:bg-sky-100 light:text-sky-700",
    },
    Completed: {
      lane: "border-teal-300/25 bg-teal-300/10 text-teal-100 light:text-teal-700",
      badge: "bg-teal-300/20 text-teal-100 light:text-teal-700",
      border: "border-teal-300/65",
      select: "border-teal-300/35 bg-teal-300/15 text-teal-100 light:bg-teal-100 light:text-teal-700",
    },
  };
  return tones[status] || tones.Pending;
}

function notificationTone(status = "Not Sent") {
  if (status === "Sent" || status === "Reminder Sent") return "bg-teal-300/15 text-teal-100 light:text-teal-700";
  return "bg-white/7 text-white/55 light:bg-slate-100 light:text-slate-500";
}

function ownerInitials(name = "") {
  const clean = String(name || "").trim();
  if (!clean) return "NA";
  return clean.split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

function isOverdue(deadline, status) {
  if (!deadline || status === "Completed") return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(`${deadline}T00:00:00`);
  return !Number.isNaN(due.getTime()) && due < today;
}

function buildTeamStats(history) {
  const stats = {};
  for (const record of history || []) {
    for (const unit of record.units || []) {
      for (const task of unit.assignments || []) {
        const owner = (task.owner || "Unassigned").trim() || "Unassigned";
        if (!stats[owner]) {
          stats[owner] = { owner, total: 0, completed: 0, active: 0 };
        }
        stats[owner].total += 1;
        if ((task.status || "Pending") === "Completed") stats[owner].completed += 1;
        else stats[owner].active += 1;
      }
    }
  }
  return Object.values(stats).sort((a, b) => b.completed - a.completed || b.total - a.total).slice(0, 8);
}

function PerformancePie({ data }) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  const colors = {
    Pending: "#8b95a7",
    "In Progress": "#B3A124",
    "Under Review": "#4ea8de",
    Completed: "#21b997",
  };
  let angle = 0;
  const wedges = data.map((item) => {
    const ratio = item.value / total;
    const large = ratio > 0.5 ? 1 : 0;
    const start = polar(angle);
    const end = polar(angle + ratio * 360);
    const path = `M 50 50 L ${start.x} ${start.y} A 40 40 0 ${large} 1 ${end.x} ${end.y} Z`;
    angle += ratio * 360;
    return { ...item, path, color: colors[item.label] || "#8b95a7" };
  });
  return (
    <div className="rounded-lg border border-white/10 bg-white/7 p-4 light:bg-white/70">
      <p className="text-xs font-black uppercase tracking-[.14em] text-[#e9dc71] light:text-[#8a7d19]">Task Distribution</p>
      <div className="mt-3 flex items-center gap-4">
        <svg viewBox="0 0 100 100" className="h-32 w-32">
          {wedges.map((wedge) => <path key={wedge.label} d={wedge.path} fill={wedge.color} stroke="#10263f" strokeWidth="0.5" />)}
        </svg>
        <div className="space-y-1 text-sm">
          {data.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colors[item.label] || "#8b95a7" }} />
              <span>{item.label}: {item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function TeamLineGraph({ data }) {
  const maxValue = Math.max(1, ...data.map((item) => item.completed));
  const points = data.map((item, index) => {
    const x = data.length === 1 ? 50 : 5 + (index * 90) / (data.length - 1);
    const y = 95 - (item.completed / maxValue) * 80;
    return { x, y, item };
  });
  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  return (
    <div className="rounded-lg border border-white/10 bg-white/7 p-4 light:bg-white/70">
      <p className="text-xs font-black uppercase tracking-[.14em] text-[#e9dc71] light:text-[#8a7d19]">Team Completion Trend</p>
      {data.length === 0 ? (
        <p className="mt-8 text-sm text-white/55 light:text-slate-600">No assignment data yet.</p>
      ) : (
        <>
          <svg viewBox="0 0 100 100" className="mt-3 h-32 w-full">
            <polyline fill="none" stroke="#B3A124" strokeWidth="2.2" points={polyline} />
            {points.map((point) => <circle key={point.item.owner} cx={point.x} cy={point.y} r="2.5" fill="#e9dc71" />)}
          </svg>
          <div className="mt-2 grid gap-1 text-xs text-white/70 light:text-slate-600">
            {data.map((item) => <div key={item.owner}>{item.owner}: {item.completed} completed / {item.total} total</div>)}
          </div>
        </>
      )}
    </div>
  );
}

function polar(angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: 50 + 40 * Math.cos(rad), y: 50 + 40 * Math.sin(rad) };
}

function learningErrorMessage(err, fallback) {
  const detail = err?.response?.data?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) return detail.map((item) => item.msg || item.message || JSON.stringify(item)).join(" ");
  return err?.message || fallback;
}

function Field({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-white/65 light:text-slate-600">{label}</span>
      <input className="mt-2 w-full rounded-lg border border-white/12 bg-black/20 px-4 py-3 outline-none focus:border-[#B3A124] light:bg-white/70" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectField({ label, value, options, onChange }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-white/65 light:text-slate-600">{label}</span>
      <select
        className="mt-2 w-full rounded-lg border border-white/12 bg-black/20 px-4 py-3 outline-none focus:border-[#B3A124] light:bg-white/70"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option} value={option} className="bg-[#10263f] text-white">
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextField({ label, value, onChange, rows = 3 }) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-white/65 light:text-slate-600">{label}</span>
      <textarea className="thin-scroll mt-2 w-full resize-none rounded-lg border border-white/12 bg-black/20 px-4 py-3 text-sm leading-6 outline-none focus:border-[#B3A124] light:bg-white/70" rows={rows} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function InfoPanel({ title, items, className = "", compact = false, onChangeItem }) {
  const displayItems = safeList(items);

  return (
    <div className={`rounded-lg border border-white/10 bg-white/7 p-5 light:bg-white/70 ${className}`}>
      <h3 className="font-black text-[#e9dc71] light:text-[#8a7d19]">{title}</h3>
      <div className={`mt-3 space-y-2 ${compact ? "text-xs" : "text-sm"} leading-6 text-white/68 light:text-slate-600`}>
        {displayItems.length ? displayItems.map((item, index) => (
          <textarea
            key={`${title}-${index}`}
            className="thin-scroll min-h-[110px] w-full resize-y rounded-lg border border-white/12 bg-black/15 p-3 outline-none focus:border-[#B3A124] light:bg-slate-100"
            value={item}
            onChange={(event) => onChangeItem?.(index, event.target.value)}
          />
        )) : <p className="rounded-lg bg-black/15 p-3 light:bg-slate-100">LIA will populate this section after document analysis.</p>}
      </div>
    </div>
  );
}

function IUContentBlock({ title, subtitle = "", items = [], onChangeItem }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/15 p-4 light:border-slate-200 light:bg-slate-50">
      <h4 className="font-black text-[#e9dc71] light:text-[#8a7d19]">{title}</h4>
      {subtitle && <p className="mt-1 text-xs leading-5 text-white/45 light:text-slate-500">{subtitle}</p>}
      <div className="mt-3 space-y-2">
        {items.length > 0 ? (
          items.map((item, index) => (
            <textarea
              key={`${title}-${index}`}
              className="thin-scroll min-h-[100px] w-full resize-y rounded-lg border border-white/12 bg-white/7 p-3 text-sm leading-6 text-white/68 outline-none focus:border-[#B3A124] light:bg-white light:text-slate-700"
              value={item}
              onChange={(event) => onChangeItem?.(index, event.target.value)}
            />
          ))
        ) : (
          <p className="rounded-lg bg-white/7 p-3 text-sm text-white/55 light:bg-white light:text-slate-500">Content pending for this IU section.</p>
        )}
      </div>
    </div>
  );
}

function ProductionFolder({ title, sections = [] }) {
  return (
    <div className="rounded-lg border border-[#B3A124]/25 bg-[#1A3E6B]/35 p-4 light:bg-white">
      <h4 className="text-lg font-black text-[#e9dc71] light:text-[#8a7d19]">{title}</h4>
      <div className="mt-4 space-y-3">
        {sections.map(({ title: sectionTitle, topics, onChangeTopic }) => (
          <details key={sectionTitle} className="group rounded-lg border border-white/10 bg-black/15 light:border-slate-200 light:bg-slate-50" open={sectionTitle.includes("Instructional") || sectionTitle.includes("Practice") || sectionTitle.includes("MCQ")}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-3">
              <span className="text-sm font-black">{sectionTitle}</span>
              <ChevronDown className="transition group-open:rotate-180" size={16} />
            </summary>
            <div className="space-y-2 border-t border-white/10 p-3 light:border-slate-200">
              {safeTopics(topics).length ? safeTopics(topics).map((topic, index) => (
                <div key={`${topic.code}-${index}`} className="rounded-lg bg-white/7 p-3 light:bg-white">
                  <input
                    className="w-full rounded-md border border-white/12 bg-black/10 px-3 py-2 text-xs font-black uppercase tracking-[.14em] text-[#e9dc71] outline-none focus:border-[#B3A124] light:text-[#8a7d19]"
                    value={topic.code}
                    onChange={(event) => onChangeTopic?.(index, "code", event.target.value)}
                  />
                  <input
                    className="mt-2 w-full rounded-md border border-white/12 bg-black/10 px-3 py-2 font-bold outline-none focus:border-[#B3A124]"
                    value={topic.title}
                    onChange={(event) => onChangeTopic?.(index, "title", event.target.value)}
                  />
                  <textarea
                    className="thin-scroll mt-2 min-h-[110px] w-full resize-y rounded-md border border-white/12 bg-black/10 px-3 py-2 text-sm leading-6 text-white/64 outline-none focus:border-[#B3A124] light:text-slate-600"
                    value={topic.description}
                    onChange={(event) => onChangeTopic?.(index, "description", event.target.value)}
                  />
                </div>
              )) : <p className="text-sm text-white/50 light:text-slate-500">Production topics pending.</p>}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

function Metric({ title, value, detail, compactValue = false }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/15 p-4 light:border-slate-200 light:bg-slate-50">
      <p className="text-xs font-bold uppercase tracking-[.16em] text-white/45 light:text-slate-500">{title}</p>
      <p className={`mt-2 font-black text-[#e9dc71] light:text-[#8a7d19] ${compactValue ? "text-sm leading-6" : "text-xl"}`}>{value}</p>
      <p className="mt-1 text-xs leading-5 text-white/55 light:text-slate-500">{detail}</p>
    </div>
  );
}

function setNestedValue(target, path, value) {
  if (!path.length) {
    return value;
  }

  const [key, ...rest] = path;
  const source = target ?? (typeof key === "number" ? [] : {});
  const clone = Array.isArray(source) ? [...source] : { ...source };
  clone[key] = setNestedValue(source?.[key], rest, value);
  return clone;
}

function EmptyState({ title, detail }) {
  return (
    <div className="rounded-lg border border-[#B3A124]/25 bg-[#B3A124]/10 p-6">
      <h3 className="text-lg font-black text-[#e9dc71] light:text-[#8a7d19]">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-white/65 light:text-slate-600">{detail}</p>
    </div>
  );
}

function normalizeUnits(units) {
  if (!Array.isArray(units)) {
    return [];
  }
  return units.map((unit, index) => ({
    iu_code: unit.iu_code || `IU${index + 1}`,
    title: unit.title || "Instruction Unit",
    adaptive_focus: unit.adaptive_focus || "Adaptive self-paced learning focus pending.",
    estimated_hours: unit.estimated_hours || 0,
    complexity_indicator: unit.complexity_indicator || "Foundational",
    delivery_mode: unit.delivery_mode || "Adaptive agentic practical learning",
    learning_goal: unit.learning_goal || "Learner goal pending.",
    knowledge: {
      instructional_content_text: safeTopics(unit.knowledge?.instructional_content_text),
      ppt_text: safeTopics(unit.knowledge?.ppt_text),
      ppt_videos_podcast: safeTopics(unit.knowledge?.ppt_videos_podcast),
      e_learning: safeTopics(unit.knowledge?.e_learning),
      guided_examples: safeTopics(unit.knowledge?.guided_examples),
      learning_activities: safeTopics(unit.knowledge?.learning_activities),
    },
    skills: {
      practice_activities: safeTopics(unit.skills?.practice_activities),
      labs: safeTopics(unit.skills?.labs),
      guided_tasks: safeTopics(unit.skills?.guided_tasks),
      mini_projects: safeTopics(unit.skills?.mini_projects),
      case_study_word_document: safeTopics(unit.skills?.case_study_word_document),
      case_study_ppt: safeTopics(unit.skills?.case_study_ppt),
      case_study_demo_videos: safeTopics(unit.skills?.case_study_demo_videos),
      case_study_assignment: safeTopics(unit.skills?.case_study_assignment),
    },
    assessment_blueprint: {
      mcq_topics: safeTopics(unit.assessment_blueprint?.mcq_topics),
      assignments: safeTopics(unit.assessment_blueprint?.assignments),
      case_studies: safeTopics(unit.assessment_blueprint?.case_studies),
      evaluation_criteria: safeTopics(unit.assessment_blueprint?.evaluation_criteria),
      mcq_assessment: safeTopics(unit.assessment_blueprint?.mcq_assessment),
      quiz: safeTopics(unit.assessment_blueprint?.quiz),
      assessment_assignment: safeTopics(unit.assessment_blueprint?.assessment_assignment),
      marking_rubrics: safeTopics(unit.assessment_blueprint?.marking_rubrics),
    },
    blueprint: {
      knowledge_instructional_text: safeList(unit.blueprint?.knowledge_instructional_text),
      learning_sequence: safeList(unit.blueprint?.learning_sequence),
      glossary_concepts: safeList(unit.blueprint?.glossary_concepts),
      ppt_content_topics: safeList(unit.blueprint?.ppt_content_topics),
      ppt_visual_flow: safeList(unit.blueprint?.ppt_visual_flow),
      ppt_video_topics: safeList(unit.blueprint?.ppt_video_topics),
      video_demo_ideas: safeList(unit.blueprint?.video_demo_ideas),
      elearning_activities: safeList(unit.blueprint?.elearning_activities),
      case_study_text: unit.blueprint?.case_study_text || "",
      case_study_ppt_video_topics: safeList(unit.blueprint?.case_study_ppt_video_topics),
      case_study_assignments: safeList(unit.blueprint?.case_study_assignments),
      adaptive_learning_support: safeList(unit.blueprint?.adaptive_learning_support),
      production_effort: unit.blueprint?.production_effort || {},
      learning_outcome_alignment: safeList(unit.blueprint?.learning_outcome_alignment),
      production_estimate: unit.blueprint?.production_estimate || "Production estimate pending.",
      readiness_insight: unit.blueprint?.readiness_insight || "Readiness insight pending.",
    },
    assessment: {
      mcqs: safeList(unit.assessment?.mcqs),
      focus_areas: safeList(unit.assessment?.focus_areas),
      quizzes: safeList(unit.assessment?.quizzes),
      assignments: safeList(unit.assessment?.assignments),
      evaluation_objectives: safeList(unit.assessment?.evaluation_objectives),
      alignment_check: unit.assessment?.alignment_check || "Assessment alignment pending.",
    },
  }));
}

function safeList(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function getAIMode(result) {
  const corpus = [
    ...(safeList(result?.curriculum_analysis)),
    ...(safeList(result?.delivery_readiness_insights)),
    ...(safeList(result?.complexity_indicators)),
  ].join(" ").toLowerCase();
  const fallback = corpus.includes("fallback") || corpus.includes("unstable") || corpus.includes("connection note");
  return {
    live: !fallback,
    label: fallback ? "Fallback Mode" : "OpenAI Live",
  };
}

function hasIUContent(unit) {
  return (
    unit?.knowledge?.instructional_content_text?.length > 0 ||
    unit?.skills?.case_study_word_document?.length > 0 ||
    unit?.assessment_blueprint?.mcq_assessment?.length > 0
  );
}

function inferLearnerMode(profile = "") {
  const lowered = profile.toLowerCase();
  if (lowered.includes("beginner")) return "Beginner";
  if (lowered.includes("advanced")) return "Advanced";
  if (lowered.includes("self-paced")) return "Self-paced";
  return "Adaptive";
}

function safeTopics(value) {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map((item, index) => {
    if (typeof item === "object" && item !== null) {
      return {
        code: item.code || `T${index + 1}`,
        title: item.title || "Production Topic",
        description: item.description || "OpenAI did not provide a description for this production item.",
      };
    }
    return { code: `T${index + 1}`, title: String(item), description: "OpenAI returned this item without a structured description." };
  });
}

function LoadingBlueprint() {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-[#B3A124]/20 bg-[#B3A124]/10 p-5">
        <div className="mb-3 flex items-center gap-3">
          <Sparkles className="agent-pulse text-[#e9dc71]" />
          <div>
            <p className="font-bold">LIA is converting the product plan into adaptive production blueprints...</p>
            <p className="text-sm text-white/55 light:text-slate-500">Mapping outcomes, IU flow, content formats, assessments, and project readiness.</p>
          </div>
        </div>
        <ProgressBar value={76} />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="rounded-lg border border-white/10 bg-white/7 p-5 light:bg-white/70">
            <SkeletonBlock className="h-4 w-3/4" />
            <SkeletonBlock className="mt-4 h-4 w-full" />
            <SkeletonBlock className="mt-2 h-4 w-5/6" />
          </div>
        ))}
      </div>
    </div>
  );
}
