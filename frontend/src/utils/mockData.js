export const meetings = [
  {
    title: "Global onboarding cohort launch readiness",
    time: "09:15",
    duration: "45 min",
    attendees: 8,
    owner: "Maya Chen",
    type: "Delivery checkpoint",
    risk: "Medium",
    outcome: "Confirm facilitator coverage and learner reminder timing",
  },
  {
    title: "APAC facilitator calibration",
    time: "10:30",
    duration: "30 min",
    attendees: 5,
    owner: "Arun Patel",
    type: "Quality review",
    risk: "Low",
    outcome: "Align scoring rubric for scenario assessments",
  },
  {
    title: "Program owner escalation sync",
    time: "13:00",
    duration: "25 min",
    attendees: 4,
    owner: "Lina Gomez",
    type: "Escalation",
    risk: "High",
    outcome: "Resolve missing attendance feed from EMEA region",
  },
  {
    title: "Enterprise AI learning path governance",
    time: "15:45",
    duration: "50 min",
    attendees: 11,
    owner: "Noah Williams",
    type: "Stakeholder review",
    risk: "Medium",
    outcome: "Approve next sprint content and reporting cadence",
  },
];

export const deadlines = [
  { item: "Cohort welcome email package", due: "Today 11:30", owner: "Maya", status: "Due today", impact: "Learner communications", completion: 82 },
  { item: "Facilitator readiness checklist", due: "Today 14:00", owner: "Arun", status: "At risk", impact: "Session quality", completion: 68 },
  { item: "Assessment analytics dashboard", due: "Tomorrow 16:00", owner: "Lina", status: "On track", impact: "Program reporting", completion: 74 },
  { item: "Executive delivery summary", due: "Friday 12:00", owner: "Noah", status: "Planned", impact: "Stakeholder confidence", completion: 35 },
  { item: "AI prompt library review", due: "Monday 10:00", owner: "Priya", status: "Planned", impact: "Content operations", completion: 28 },
];

export const overdueTasks = [
  {
    title: "Resolve EMEA learner roster exceptions",
    deadline: "Yesterday 17:00",
    priority: "High",
    status: "overdue",
    effort: 2,
    owner: "Maya",
    cohort: "Global Manager Essentials",
    blockedBy: "Regional HRIS export",
    escalation: "Program Owner",
  },
  {
    title: "Confirm captions for accessibility review",
    deadline: "Yesterday 12:00",
    priority: "High",
    status: "overdue",
    effort: 1,
    owner: "Arun",
    cohort: "AI Productivity Foundations",
    blockedBy: "Vendor QA queue",
    escalation: "Learning Ops Lead",
  },
  {
    title: "Close post-session survey anomaly",
    deadline: "Monday 09:00",
    priority: "Medium",
    status: "overdue",
    effort: 2,
    owner: "Lina",
    cohort: "Enterprise Sales Enablement",
    blockedBy: "Duplicate learner records",
    escalation: "Data Operations",
  },
];

export const tasks = [
  ...overdueTasks,
  { title: "Finalize facilitator readiness pack", deadline: "Today 14:00", priority: "High", status: "open", effort: 3, owner: "Arun", cohort: "Global Onboarding" },
  { title: "Publish assessment analytics report", deadline: "Tomorrow 16:00", priority: "Medium", status: "open", effort: 2, owner: "Lina", cohort: "AI Productivity Foundations" },
  { title: "Confirm APAC cohort communications", deadline: "Today 18:00", priority: "Medium", status: "open", effort: 1, owner: "Maya", cohort: "Manager Essentials" },
  { title: "Review post-session feedback themes", deadline: "Friday", priority: "Low", status: "open", effort: 2, owner: "Noah", cohort: "Sales Enablement" },
];

export const learnerProgress = [
  { cohort: "Global Manager Essentials", learners: 186, completion: 78, attendance: 91, quizAverage: 84, satisfaction: 4.6, risk: "Medium" },
  { cohort: "AI Productivity Foundations", learners: 142, completion: 64, attendance: 86, quizAverage: 79, satisfaction: 4.4, risk: "High" },
  { cohort: "Enterprise Sales Enablement", learners: 98, completion: 88, attendance: 94, quizAverage: 87, satisfaction: 4.7, risk: "Low" },
  { cohort: "New Hire Compliance Sprint", learners: 231, completion: 72, attendance: 89, quizAverage: 81, satisfaction: 4.3, risk: "Medium" },
];

export const productivityAnalytics = [
  { day: "Mon", focusHours: 4.2, meetingHours: 3.1, tasksClosed: 11, aiHoursSaved: 2.4, productivity: 78 },
  { day: "Tue", focusHours: 3.5, meetingHours: 4.4, tasksClosed: 9, aiHoursSaved: 2.1, productivity: 72 },
  { day: "Wed", focusHours: 5.1, meetingHours: 2.6, tasksClosed: 14, aiHoursSaved: 3.2, productivity: 86 },
  { day: "Thu", focusHours: 4.8, meetingHours: 3.3, tasksClosed: 13, aiHoursSaved: 2.9, productivity: 83 },
  { day: "Fri", focusHours: 5.6, meetingHours: 2.1, tasksClosed: 16, aiHoursSaved: 3.8, productivity: 91 },
];

export const teamPerformance = [
  { name: "Maya Chen", role: "Delivery Manager", workload: 86, completed: 24, atRisk: 2, sentiment: "Focused", capacity: "Tight" },
  { name: "Arun Patel", role: "Facilitator Lead", workload: 72, completed: 19, atRisk: 1, sentiment: "Steady", capacity: "Healthy" },
  { name: "Lina Gomez", role: "Learning Analyst", workload: 91, completed: 21, atRisk: 3, sentiment: "Stretched", capacity: "Overloaded" },
  { name: "Noah Williams", role: "Program Owner", workload: 64, completed: 17, atRisk: 1, sentiment: "Clear", capacity: "Available" },
  { name: "Priya Raman", role: "Content Designer", workload: 69, completed: 15, atRisk: 0, sentiment: "Creative", capacity: "Healthy" },
];

export const sampleTranscript = `Maya: We need learner roster validation completed before final reminders go out.
Arun: I can send the revised facilitator guide tomorrow morning.
Lina: The assessment report is blocked because the regional data source is not confirmed.
Program Owner: Please escalate missing attendance data today and keep the delivery schedule unchanged.`;
