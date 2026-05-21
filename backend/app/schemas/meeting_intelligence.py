from datetime import datetime
from pydantic import BaseModel


class MeetingUploadResponse(BaseModel):
    id: int
    title: str
    meeting_title: str = "Operational Meeting Record"
    meeting_date: str = ""
    operational_category: str = "Operational Meeting Intelligence"
    source: str
    source_type: str = "Transcript"
    source_url: str = ""
    ingestion_method: str = "manual"
    platform_name: str = "Manual Transcript"
    ingestion_status: str = "ready"
    analysis_status: str = "pending"
    transcript_preview: str
    transcript_text: str = ""
    status: str


class MeetingSourceRequest(BaseModel):
    source_url: str
    title: str | None = None


class MeetingEmbedRequest(BaseModel):
    embed_code: str
    title: str | None = None


class MeetingIngestionResponse(BaseModel):
    id: int
    title: str
    meeting_title: str = "Operational Meeting Record"
    meeting_date: str = ""
    operational_category: str = "Operational Meeting Intelligence"
    source_url: str
    source_type: str
    ingestion_method: str
    platform_name: str
    source_status: str
    ingestion_status: str
    analysis_status: str
    transcript_preview: str
    transcript_text: str = ""
    retrieval_status: str
    confidence: float
    fallback_used: bool = False
    processing_steps: list[str]


class MeetingAnalyzeRequest(BaseModel):
    meeting_id: int | None = None
    title: str = "Manual Teams Transcript"
    transcript: str | None = None


class ActionItemSchema(BaseModel):
    id: int | None = None
    task: str
    owner: str
    deadline: str
    priority: str
    status: str


class MeetingAnalysisResponse(BaseModel):
    id: int
    agent: str
    title: str
    meeting_title: str = "Operational Meeting Record"
    meeting_date: str = ""
    operational_category: str = "Operational Meeting Intelligence"
    summary: str
    decisions: list[str]
    action_items: list[ActionItemSchema]
    blockers: list[str]
    risks: list[str]
    deadlines: list[str]
    stakeholders: list[str]
    owners: list[str] = []
    recommendations: list[str] = []
    delivery_concerns: list[str] = []
    stakeholder_followups: list[str] = []
    next_meeting_preparation: list[str] = []
    manager_summary: str = ""
    ai_provider: str = "openai"
    analysis_status: str = "pending"
    ai_status: str = "pending"
    delivery_status: str = "Awaiting AI Review"
    status: str


class MeetingListItem(BaseModel):
    id: int
    title: str
    meeting_title: str = "Operational Meeting Record"
    meeting_date: str = ""
    operational_category: str = "Operational Meeting Intelligence"
    source: str
    source_type: str = "Transcript"
    platform_name: str = "Manual Transcript"
    ingestion_method: str = "manual"
    ingestion_status: str = "ready"
    analysis_status: str = "pending"
    ai_status: str = "pending"
    delivery_status: str = "Awaiting AI Review"
    summary: str
    status: str
    action_count: int
    risk_count: int
    blocker_count: int
    risks: list[str] = []
    blockers: list[str] = []
    action_items: list[ActionItemSchema] = []
    report_count: int = 0
    email_count: int = 0
    sent_email_count: int = 0
    reports_generated: int = 0
    stakeholder_emails: int = 0
    created_at: datetime | None
    analysis_timestamp: datetime | None = None


class MeetingDetail(MeetingAnalysisResponse):
    transcript: str
    reports: list[dict]
    emails: list[dict]
    created_at: datetime | None
    analysis_timestamp: datetime | None = None


class ReportRequest(BaseModel):
    meeting_id: int


class ReportResponse(BaseModel):
    id: int
    meeting_id: int
    executive_summary: str
    delivery_status: str
    operational_concerns: list[str]
    recommended_actions: list[str]
    executive_operational_summary: str = ""
    delivery_readiness_overview: str = ""
    operational_risks_concerns: str = ""
    facilitator_content_readiness: str = ""
    assessment_lms_readiness: str = ""
    stakeholder_coordination_updates: str = ""
    recommended_next_actions: str = ""
    next_meeting_focus_areas: str = ""
    delivery_confidence: str = "Medium"


class EmailRequest(BaseModel):
    meeting_id: int


class EmailResponse(BaseModel):
    id: int
    meeting_id: int
    email_type: str
    subject: str
    body: str
    recipients: list[str] = []
    sent_status: str = "draft"


class EmailSendRequest(BaseModel):
    email_id: int | None = None
    meeting_id: int | None = None
    recipients: list[str]
    subject: str
    body: str


class EmailSendResponse(BaseModel):
    sent: bool
    message: str
    email_id: int | None = None


class MeetingChatRequest(BaseModel):
    meeting_id: int
    question: str


class MeetingChatEmailDraft(BaseModel):
    id: int | None = None
    meeting_id: int
    email_type: str
    audience: str
    recipients: list[str] = []
    subject: str
    body: str
    sent_status: str = "draft"
    send_message: str = ""


class MeetingChatResponse(BaseModel):
    answer: str
    suggested_actions: list[str] = []
    confidence: str = "Medium"
    email_draft: MeetingChatEmailDraft | None = None
    email_sent: bool = False


class MeetingAnalyticsResponse(BaseModel):
    total_meetings: int
    pending_actions: int
    blocker_count: int
    risk_count: int
    productivity_score: int
    meetings: list[MeetingListItem]
