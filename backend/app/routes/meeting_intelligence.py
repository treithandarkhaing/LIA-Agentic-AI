import json
import logging
import re
from io import BytesIO
from datetime import datetime

from docx import Document
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.agents.meeting_agent import MeetingIntelligenceAgent
from app.database import get_db
from app.models.meeting_intelligence import ActionItem, GeneratedEmail, GeneratedReport, Meeting
from app.schemas.meeting_intelligence import (
    EmailRequest,
    EmailResponse,
    EmailSendRequest,
    EmailSendResponse,
    MeetingChatRequest,
    MeetingChatResponse,
    MeetingEmbedRequest,
    MeetingIngestionResponse,
    MeetingAnalysisResponse,
    MeetingAnalyticsResponse,
    MeetingAnalyzeRequest,
    MeetingDetail,
    MeetingListItem,
    MeetingSourceRequest,
    MeetingUploadResponse,
    ReportRequest,
    ReportResponse,
)
from app.services.email_agent import EmailAgent
from app.services.meeting_source_service import MeetingSourceService
from app.services.openai_service import OpenAIService, OpenAIServiceError
from app.services.smtp_service import SMTPService, SMTPServiceError
from app.services.transcript_ingestion_service import TranscriptIngestionService


router = APIRouter(tags=["Meeting Intelligence"])
agent = MeetingIntelligenceAgent()
source_service = MeetingSourceService()
ingestion_service = TranscriptIngestionService()
openai_service = OpenAIService()
email_agent = EmailAgent()
smtp_service = SMTPService()
logger = logging.getLogger("lia.meetings")


@router.post("/meetings/upload", response_model=MeetingUploadResponse)
async def upload_meeting(
    title: str = Form("Microsoft Teams Transcript"),
    transcript_text: str | None = Form(None),
    file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
) -> MeetingUploadResponse:
    transcript = transcript_text.strip() if transcript_text else ""
    source = "manual"
    platform_name = "Microsoft Teams" if "teams" in title.lower() else "Manual Transcript"
    retrieval_status = "Transcript provided by user"

    if file:
        source = file.filename or "upload"
        content = await file.read()
        transcript = _extract_transcript(content, file.filename or "")
        retrieval_status = "Transcript extracted from uploaded file"

    if not transcript:
        transcript = ingestion_service.ensure_transcript(transcript, title=title, platform=platform_name)
        retrieval_status = ingestion_service.fallback_notice

    metadata = _metadata_for(transcript, title, platform_name)
    meeting = Meeting(
        title=metadata["meeting_title"],
        meeting_title=metadata["meeting_title"],
        meeting_date=metadata["meeting_date"],
        operational_category=metadata["operational_category"],
        source=source,
        source_type="Transcript",
        ingestion_method="file" if file else "manual",
        platform_name=platform_name,
        ingestion_status=retrieval_status,
        analysis_status="pending",
        ai_status="pending",
        delivery_status="Awaiting AI Review",
        transcript=transcript,
        status="uploaded",
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)

    return MeetingUploadResponse(
        id=meeting.id,
        title=meeting.title,
        meeting_title=meeting.meeting_title,
        meeting_date=meeting.meeting_date,
        operational_category=meeting.operational_category,
        source=meeting.source,
        source_type=meeting.source_type,
        source_url=meeting.source_url,
        ingestion_method=meeting.ingestion_method,
        platform_name=meeting.platform_name,
        ingestion_status=meeting.ingestion_status,
        analysis_status=meeting.analysis_status,
        transcript_preview=meeting.transcript[:700],
        transcript_text=meeting.transcript,
        status=meeting.status,
    )


@router.post("/meetings/ingest-link", response_model=MeetingIngestionResponse)
def ingest_meeting_link(payload: MeetingSourceRequest, db: Session = Depends(get_db)) -> MeetingIngestionResponse:
    try:
        source = source_service.normalize_link(payload.source_url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if payload.title:
        source["meeting_title"] = payload.title
    return _store_ingested_source(source, db)


@router.post("/meetings/ingest-embed", response_model=MeetingIngestionResponse)
def ingest_meeting_embed(payload: MeetingEmbedRequest, db: Session = Depends(get_db)) -> MeetingIngestionResponse:
    try:
        source = source_service.normalize_embed(payload.embed_code)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if payload.title:
        source["meeting_title"] = payload.title
    return _store_ingested_source(source, db)


@router.post("/meetings/analyze", response_model=MeetingAnalysisResponse)
def analyze_meeting(payload: MeetingAnalyzeRequest, db: Session = Depends(get_db)) -> MeetingAnalysisResponse:
    meeting = _get_or_create_meeting(payload, db)
    if _can_reuse_saved_analysis(meeting):
        return _analysis_response(meeting, agent.name)
    try:
        analysis = _analyze_and_persist(meeting, db)
    except OpenAIServiceError as exc:
        meeting.analysis_status = "failed"
        meeting.ai_status = "failed"
        db.commit()
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    return _analysis_response(meeting, analysis["agent"])


@router.get("/meetings", response_model=MeetingAnalyticsResponse)
def list_meetings(db: Session = Depends(get_db)) -> MeetingAnalyticsResponse:
    return _meeting_analytics(db)


@router.delete("/meetings", response_model=MeetingAnalyticsResponse)
def clear_meetings(db: Session = Depends(get_db)) -> MeetingAnalyticsResponse:
    db.query(GeneratedEmail).delete()
    db.query(GeneratedReport).delete()
    db.query(ActionItem).delete()
    db.query(Meeting).delete()
    db.commit()
    return _meeting_analytics(db)


@router.post("/meetings/chat", response_model=MeetingChatResponse)
def chat_about_meeting(payload: MeetingChatRequest, db: Session = Depends(get_db)) -> MeetingChatResponse:
    try:
        meeting = _require_analyzed_meeting(payload.meeting_id, db)
        if _is_email_request(payload.question):
            chat = _handle_conversational_email(meeting, payload.question, db)
        else:
            chat = openai_service.chat_about_meeting(_analysis_dict(meeting), meeting.transcript, payload.question)
    except OpenAIServiceError as exc:
        logger.warning("Meeting chat OpenAI failure for meeting_id=%s. Using local fallback. Error: %s", payload.meeting_id, exc.message)
        meeting = _require_analyzed_meeting(payload.meeting_id, db)
        chat = _fallback_meeting_chat(meeting, payload.question)
    except Exception as exc:
        logger.exception("Unexpected meeting chat failure for meeting_id=%s", payload.meeting_id)
        meeting = _require_analyzed_meeting(payload.meeting_id, db)
        chat = _fallback_meeting_chat(meeting, payload.question)

    return MeetingChatResponse(**chat)


def _handle_conversational_email(meeting: Meeting, question: str, db: Session) -> dict:
    audience = _detect_email_audience(question)
    recipients = _extract_email_addresses(question)
    wants_send = _wants_email_send(question)
    draft = openai_service.draft_chat_email(_analysis_dict(meeting), meeting.transcript, question, audience)

    db_email = GeneratedEmail(
        meeting_id=meeting.id,
        email_type=draft["email_type"],
        subject=draft["subject"],
        body=draft["body"],
        recipients=json.dumps(recipients),
        sent_status="draft",
    )
    db.add(db_email)
    meeting.stakeholder_emails = len(meeting.emails) + 1
    send_message = ""
    email_sent = False

    if wants_send:
        if recipients:
            try:
                smtp_service.send(recipients, draft["subject"], draft["body"])
                db_email.sent_status = "sent"
                db_email.sent_at = datetime.utcnow()
                db_email.send_error = ""
                email_sent = True
                send_message = "Email sent successfully."
            except SMTPServiceError as exc:
                db_email.sent_status = "failed"
                db_email.send_error = exc.message
                send_message = exc.message
        else:
            send_message = "Email draft is ready, but no recipient email address was found. Add a recipient and click Send."

    db.commit()
    db.refresh(db_email)

    audience_label = draft.get("audience") or audience
    if email_sent:
        answer = f"I drafted and sent the {audience_label.lower()} email to {', '.join(recipients)}."
    elif wants_send:
        answer = f"I drafted the {audience_label.lower()} email, but it was not sent. {send_message}"
    else:
        answer = f"I drafted a {audience_label.lower()} email from this meeting. Please review or edit it, then click Send when ready."

    return {
        "answer": answer,
        "suggested_actions": [
            "Review the email body for tone and recipient-specific details before sending.",
            "Confirm recipient email addresses and any approvals needed.",
        ],
        "confidence": "High",
        "email_sent": email_sent,
        "email_draft": {
            "id": db_email.id,
            "meeting_id": meeting.id,
            "email_type": db_email.email_type,
            "audience": audience_label,
            "recipients": recipients,
            "subject": db_email.subject,
            "body": db_email.body,
            "sent_status": db_email.sent_status,
            "send_message": send_message,
        },
    }


def _is_email_request(text: str) -> bool:
    normalized = text.lower()
    return any(word in normalized for word in ["email", "mail", "send to", "send this", "draft for", "write to"])


def _wants_email_send(text: str) -> bool:
    normalized = text.lower()
    return bool(re.search(r"\b(send|send it|send this|email it|mail it)\b", normalized))


def _detect_email_audience(text: str) -> str:
    normalized = text.lower()
    if any(word in normalized for word in ["learner", "student", "participant", "trainee"]):
        return "Learner"
    if any(word in normalized for word in ["team", "facilitator", "internal", "colleagues"]):
        return "Team"
    return "Manager"


def _extract_email_addresses(text: str) -> list[str]:
    matches = re.findall(r"[\w.\-+%]+@[\w.\-]+\.[A-Za-z]{2,}", text)
    seen = set()
    recipients = []
    for match in matches:
        lower = match.lower()
        if lower not in seen:
            seen.add(lower)
            recipients.append(match)
    return recipients


def _meeting_analytics(db: Session) -> MeetingAnalyticsResponse:
    meetings = db.query(Meeting).order_by(Meeting.created_at.desc()).all()
    items = [_list_item(meeting) for meeting in meetings]
    pending_actions = sum(1 for meeting in meetings for item in meeting.action_items if item.status.lower() != "completed")
    blocker_count = sum(len(_loads(meeting.blockers)) for meeting in meetings)
    risk_count = sum(len(_loads(meeting.risks)) for meeting in meetings)
    productivity_score = max(55, min(96, 92 - blocker_count * 3 - risk_count * 2 + len(meetings)))
    return MeetingAnalyticsResponse(
        total_meetings=len(meetings),
        pending_actions=pending_actions,
        blocker_count=blocker_count,
        risk_count=risk_count,
        productivity_score=productivity_score,
        meetings=items,
    )


@router.get("/meetings/{meeting_id}", response_model=MeetingDetail)
def get_meeting(meeting_id: int, db: Session = Depends(get_db)) -> MeetingDetail:
    meeting = db.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")

    base = _analysis_response(meeting, agent.name).model_dump()
    return MeetingDetail(
        **base,
        transcript=meeting.transcript,
        reports=[_report_dict(report) for report in meeting.reports],
        emails=[_email_dict(email) for email in meeting.emails],
        created_at=meeting.created_at,
        analysis_timestamp=meeting.analysis_timestamp,
    )


@router.post("/reports/generate", response_model=ReportResponse)
def generate_report(payload: ReportRequest, db: Session = Depends(get_db)) -> ReportResponse:
    existing = _latest_report(payload.meeting_id, db)
    if existing:
        return ReportResponse(**_report_dict(existing))

    try:
        meeting = _require_analyzed_meeting(payload.meeting_id, db)
        report = openai_service.generate_management_report(_analysis_dict(meeting), meeting.transcript)
    except OpenAIServiceError as exc:
        logger.warning("OpenAI report generation failed for meeting_id=%s. Using local fallback. Error: %s", payload.meeting_id, exc.message)
        meeting = _require_analyzed_meeting(payload.meeting_id, db)
        report = _fallback_report_payload(meeting)
    except Exception as exc:
        logger.exception("Unexpected report generation failure for meeting_id=%s", payload.meeting_id)
        meeting = _require_analyzed_meeting(payload.meeting_id, db)
        report = _fallback_report_payload(meeting)

    db_report = GeneratedReport(
        meeting_id=meeting.id,
        executive_summary=report["executive_operational_summary"],
        delivery_status=f"{report['delivery_confidence']} confidence: {report['delivery_readiness_overview']}",
        operational_concerns=json.dumps([report["operational_risks_concerns"]]),
        recommended_actions=json.dumps([report["recommended_next_actions"], report["next_meeting_focus_areas"]]),
        executive_operational_summary=report["executive_operational_summary"],
        delivery_readiness_overview=report["delivery_readiness_overview"],
        operational_risks_concerns=report["operational_risks_concerns"],
        facilitator_content_readiness=report["facilitator_content_readiness"],
        assessment_lms_readiness=report["assessment_lms_readiness"],
        stakeholder_coordination_updates=report["stakeholder_coordination_updates"],
        recommended_next_actions=report["recommended_next_actions"],
        next_meeting_focus_areas=report["next_meeting_focus_areas"],
        delivery_confidence=report["delivery_confidence"],
    )
    db.add(db_report)
    meeting.reports_generated = len(meeting.reports) + 1
    db.commit()
    db.refresh(db_report)
    return ReportResponse(**_report_dict(db_report))


@router.post("/emails/generate", response_model=list[EmailResponse])
def generate_emails(payload: EmailRequest, db: Session = Depends(get_db)) -> list[EmailResponse]:
    existing_emails = _existing_email_set(payload.meeting_id, db)
    if existing_emails:
        return [EmailResponse(**_email_dict(email)) for email in existing_emails]

    try:
        meeting = _require_analyzed_meeting(payload.meeting_id, db)
    except OpenAIServiceError as exc:
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc
    analysis = _analysis_dict(meeting)
    try:
        email_payloads = openai_service.generate_operational_emails(analysis, meeting.transcript)
    except OpenAIServiceError as exc:
        logger.warning("OpenAI email generation failed for meeting_id=%s. Using polished local EmailAgent fallback. Error: %s", meeting.id, exc.message)
        email_payloads = email_agent.generate(analysis)
    except Exception as exc:
        logger.exception("Unexpected email generation failure for meeting_id=%s", meeting.id)
        email_payloads = email_agent.generate(analysis)
    emails = []
    for item in email_payloads:
        email = GeneratedEmail(meeting_id=meeting.id, **item)
        db.add(email)
        emails.append(email)
    meeting.stakeholder_emails = len(meeting.emails) + len(emails)
    db.commit()
    for email in emails:
        db.refresh(email)
    return [EmailResponse(**_email_dict(email)) for email in emails]


@router.post("/emails/send", response_model=EmailSendResponse)
def send_email(payload: EmailSendRequest, db: Session = Depends(get_db)) -> EmailSendResponse:
    email = db.get(GeneratedEmail, payload.email_id) if payload.email_id else None
    db_email = email or GeneratedEmail(
        meeting_id=payload.meeting_id or 0,
        email_type="manual_send",
        subject=payload.subject,
        body=payload.body,
    )
    db_email.subject = payload.subject
    db_email.body = payload.body
    db_email.recipients = json.dumps(payload.recipients)

    try:
        smtp_service.send(payload.recipients, payload.subject, payload.body)
        db_email.sent_status = "sent"
        db_email.sent_at = datetime.utcnow()
        db_email.send_error = ""
        if not email:
            db.add(db_email)
        db.commit()
        db.refresh(db_email)
        return EmailSendResponse(sent=True, message="Email sent successfully.", email_id=db_email.id)
    except SMTPServiceError as exc:
        db_email.sent_status = "failed"
        db_email.send_error = exc.message
        if not email:
            db.add(db_email)
        db.commit()
        raise HTTPException(status_code=exc.status_code, detail=exc.message) from exc


def _extract_transcript(content: bytes, filename: str) -> str:
    try:
        if filename.lower().endswith(".docx"):
            document = Document(BytesIO(content))
            return ingestion_service.normalize_transcript("\n".join(paragraph.text for paragraph in document.paragraphs if paragraph.text.strip()))
        return ingestion_service.normalize_transcript(content.decode("utf-8", errors="ignore"))
    except Exception:
        return ""


def _metadata_for(transcript: str, provided_title: str = "", platform: str = "Manual Transcript") -> dict:
    metadata = ingestion_service.extract_metadata(transcript, provided_title=provided_title, platform=platform)
    if not metadata["meeting_date"]:
        metadata["meeting_date"] = datetime.utcnow().date().isoformat()
    return metadata


def _apply_metadata(meeting: Meeting, provided_title: str | None = None) -> None:
    metadata = _metadata_for(
        meeting.transcript or "",
        provided_title if provided_title is not None else meeting.meeting_title or meeting.title,
        meeting.platform_name or "Manual Transcript",
    )
    meeting.meeting_title = metadata["meeting_title"]
    meeting.title = metadata["meeting_title"]
    meeting.meeting_date = metadata["meeting_date"]
    meeting.operational_category = metadata["operational_category"]


def _delivery_status(risks: list, blockers: list) -> str:
    score = len(risks or []) + len(blockers or []) * 2
    if score >= 6:
        return "High Delivery Risk"
    if score >= 2:
        return "Moderate Risk"
    return "Delivery On Track"


def _record_title(meeting: Meeting) -> str:
    generic = {"", "operational meeting record", "manual teams transcript", "microsoft teams transcript", "meeting recording"}
    meeting_title = (meeting.meeting_title or "").strip()
    title = (meeting.title or "").strip()
    if meeting_title.lower() not in generic:
        return meeting_title
    if title.lower() not in generic:
        return title
    return "Operational Meeting Record"


def _ai_status(meeting: Meeting) -> str:
    ai_status = (meeting.ai_status or "").strip().lower()
    analysis_status = (meeting.analysis_status or "").strip().lower()
    if ai_status and ai_status != "pending":
        return ai_status
    if analysis_status:
        return analysis_status
    return "pending"


def _record_delivery_status(meeting: Meeting) -> str:
    stored = (meeting.delivery_status or "").strip()
    if stored and stored != "Awaiting AI Review":
        return stored
    if (meeting.analysis_status or "").lower() != "complete":
        return "Awaiting AI Review"
    return _delivery_status(_loads(meeting.risks), _loads(meeting.blockers))


def _store_ingested_source(source: dict, db: Session) -> MeetingIngestionResponse:
    payload = ingestion_service.simulate_extraction(source)
    metadata = _metadata_for(payload["transcript"], source.get("meeting_title", ""), source["platform_name"])
    meeting = Meeting(
        title=metadata["meeting_title"],
        meeting_title=metadata["meeting_title"],
        meeting_date=metadata["meeting_date"],
        operational_category=metadata["operational_category"],
        source=source["source_url"],
        source_type=source["source_type"],
        source_url=source["source_url"],
        embed_code=source.get("embed_code", ""),
        ingestion_method=source["ingestion_method"],
        platform_name=source["platform_name"],
        ingestion_status=payload["retrieval_status"],
        analysis_status="pending",
        ai_status="pending",
        delivery_status="Awaiting AI Review",
        transcript=payload["transcript"],
        status="ingested",
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)

    return MeetingIngestionResponse(
        id=meeting.id,
        title=meeting.title,
        meeting_title=meeting.meeting_title,
        meeting_date=meeting.meeting_date,
        operational_category=meeting.operational_category,
        source_url=meeting.source_url,
        source_type=meeting.source_type,
        ingestion_method=meeting.ingestion_method,
        platform_name=meeting.platform_name,
        source_status=source["source_status"],
        ingestion_status=meeting.ingestion_status,
        analysis_status=meeting.analysis_status,
        transcript_preview=meeting.transcript[:700],
        transcript_text=meeting.transcript,
        retrieval_status=payload["retrieval_status"],
        confidence=payload["confidence"],
        fallback_used=payload.get("fallback_used", False),
        processing_steps=payload["processing_steps"],
    )


def _get_or_create_meeting(payload: MeetingAnalyzeRequest, db: Session) -> Meeting:
    if payload.meeting_id:
        meeting = db.get(Meeting, payload.meeting_id)
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found")
        if payload.transcript and payload.transcript.strip():
            normalized_transcript = ingestion_service.normalize_transcript(payload.transcript)
            existing_transcript = ingestion_service.normalize_transcript(meeting.transcript or "")
            if _normalize_lookup_text(normalized_transcript) != _normalize_lookup_text(existing_transcript):
                meeting.transcript = normalized_transcript
                _apply_metadata(meeting, provided_title=payload.title)
                meeting.ingestion_status = "Transcript edited by user before OpenAI analysis"
                meeting.analysis_status = "pending"
                meeting.ai_status = "pending"
                db.commit()
                db.refresh(meeting)
        _ensure_meeting_transcript(meeting, db)
        return meeting
    transcript = ingestion_service.ensure_transcript(payload.transcript, title=payload.title, platform="Manual Transcript")
    existing = _find_existing_meeting_by_transcript(transcript, db)
    if existing:
        return existing
    ingestion_status = "Transcript provided by user" if payload.transcript and payload.transcript.strip() else ingestion_service.fallback_notice
    metadata = _metadata_for(transcript, payload.title, "Manual Transcript")
    meeting = Meeting(
        title=metadata["meeting_title"],
        meeting_title=metadata["meeting_title"],
        meeting_date=metadata["meeting_date"],
        operational_category=metadata["operational_category"],
        source="manual",
        source_type="Transcript",
        ingestion_method="manual",
        platform_name="Manual Transcript",
        ingestion_status=ingestion_status,
        analysis_status="pending",
        ai_status="pending",
        delivery_status="Awaiting AI Review",
        transcript=transcript,
        status="uploaded",
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    return meeting


def _find_existing_meeting_by_transcript(transcript: str, db: Session) -> Meeting | None:
    normalized = _normalize_lookup_text(transcript)
    if not normalized:
        return None
    meetings = db.query(Meeting).order_by(Meeting.created_at.desc()).all()
    for meeting in meetings:
        if meeting.status == "analyzed" and _normalize_lookup_text(meeting.transcript or "") == normalized:
            return meeting
    return None


def _normalize_lookup_text(value: str) -> str:
    return " ".join((value or "").lower().split())


def _can_reuse_saved_analysis(meeting: Meeting) -> bool:
    return (
        meeting.status == "analyzed"
        and (meeting.analysis_status or "").lower() == "complete"
        and bool((meeting.summary or "").strip())
    )


def _latest_report(meeting_id: int, db: Session) -> GeneratedReport | None:
    return (
        db.query(GeneratedReport)
        .filter(GeneratedReport.meeting_id == meeting_id)
        .order_by(GeneratedReport.id.desc())
        .first()
    )


def _existing_email_set(meeting_id: int, db: Session) -> list[GeneratedEmail]:
    emails = (
        db.query(GeneratedEmail)
        .filter(GeneratedEmail.meeting_id == meeting_id)
        .order_by(GeneratedEmail.id.desc())
        .all()
    )
    if not emails:
        return []

    preferred_order = ["manager_report", "team_follow_up", "learner_consultation"]
    by_type: dict[str, GeneratedEmail] = {}
    for email in emails:
        email_type = (email.email_type or "").strip()
        if email_type and email_type not in by_type:
            by_type[email_type] = email

    selected = [by_type[email_type] for email_type in preferred_order if email_type in by_type]
    return selected or emails[:3]


def _fallback_report_payload(meeting: Meeting) -> dict[str, str]:
    analysis = _analysis_dict(meeting)
    summary = analysis.get("manager_summary") or analysis.get("summary") or "The meeting was completed and the team captured follow-up items for delivery readiness."
    risks = _sentence_list(analysis.get("risks") or analysis.get("delivery_concerns"))
    blockers = _sentence_list(analysis.get("blockers"))
    actions = _action_summary(analysis.get("action_items"))
    followups = _sentence_list(analysis.get("stakeholder_followups") or analysis.get("recommendations"))
    prep = _sentence_list(analysis.get("next_meeting_preparation"))
    confidence = "Low" if analysis.get("blockers") else "Medium" if analysis.get("risks") else "High"
    return {
        "executive_operational_summary": summary,
        "delivery_readiness_overview": f"Delivery readiness is being tracked through the current meeting actions. {risks or 'No major delivery risks were explicitly captured, but follow-up ownership should still be confirmed.'}",
        "operational_risks_concerns": blockers or risks or "No critical blockers were explicitly recorded, but operational dependencies should be reviewed before the next checkpoint.",
        "facilitator_content_readiness": "Facilitator and content readiness should be confirmed against the current action items and learner support needs discussed in the meeting.",
        "assessment_lms_readiness": "Assessment and LMS readiness were not deeply detailed in the fallback summary, so operational owners should validate platform readiness separately.",
        "stakeholder_coordination_updates": followups or "Stakeholder coordination should focus on the open owners, pending communications, and any learner-impacting escalations.",
        "recommended_next_actions": actions or "Confirm action ownership, deadlines, and the next stakeholder update before the next delivery checkpoint.",
        "next_meeting_focus_areas": prep or "Review open risks, blockers, and the status of follow-up actions before the next meeting.",
        "delivery_confidence": confidence,
    }


def _fallback_meeting_chat(meeting: Meeting, question: str) -> dict:
    analysis = _analysis_dict(meeting)
    normalized = (question or "").lower()
    if "risk" in normalized or "blocker" in normalized:
        answer = _sentence_list(analysis.get("risks") or analysis.get("blockers")) or "No major operational risks were explicitly captured in the saved meeting analysis."
        action = "Review the highest-risk learner or delivery dependency and confirm the mitigation owner."
    elif "owner" in normalized or "action" in normalized or "follow" in normalized:
        answer = _action_summary(analysis.get("action_items")) or "The saved meeting analysis does not contain detailed action ownership."
        action = "Confirm each open action owner and deadline before the next checkpoint."
    elif "next" in normalized or "prepare" in normalized:
        answer = _sentence_list(analysis.get("next_meeting_preparation")) or "The next meeting should focus on unresolved actions, delivery readiness, and stakeholder follow-ups."
        action = "Prepare a short readiness update covering risks, blockers, and open follow-ups."
    else:
        answer = analysis.get("manager_summary") or analysis.get("summary") or "The meeting analysis is available, but the fallback response only has a limited summary."
        action = "Use the saved meeting analysis to confirm risks, owners, and the next meeting focus."

    return {
        "answer": answer,
        "suggested_actions": [action],
        "confidence": "Medium",
        "email_draft": None,
        "email_sent": False,
    }


def _sentence_list(items: list | None) -> str:
    cleaned = [str(item).strip().rstrip(".") for item in (items or []) if str(item).strip()]
    if not cleaned:
        return ""
    if len(cleaned) == 1:
        return f"{cleaned[0]}."
    return ", ".join(cleaned[:-1]) + f", and {cleaned[-1]}."


def _action_summary(items: list | None) -> str:
    actions = items or []
    sentences = []
    for item in actions[:4]:
        if not isinstance(item, dict):
            continue
        task = str(item.get("task") or "follow-up action").strip()
        owner = str(item.get("owner") or "Unassigned").strip()
        deadline = str(item.get("deadline") or "TBD").strip()
        sentences.append(f"{owner} owns {task} by {deadline}")
    if not sentences:
        return ""
    if len(sentences) == 1:
        return sentences[0] + "."
    return "; ".join(sentences) + "."


def _require_analyzed_meeting(meeting_id: int, db: Session) -> Meeting:
    meeting = db.get(Meeting, meeting_id)
    if not meeting:
        raise HTTPException(status_code=404, detail="Meeting not found")
    if meeting.status != "analyzed":
        _analyze_and_persist(meeting, db)
    return meeting


def _ensure_meeting_transcript(meeting: Meeting, db: Session) -> None:
    transcript = ingestion_service.normalize_transcript(meeting.transcript or "")
    if transcript:
        meeting.transcript = transcript
        _apply_metadata(meeting)
        return

    meeting.transcript = ingestion_service.ensure_transcript("", title=meeting.title, platform=meeting.platform_name or "Enterprise source")
    _apply_metadata(meeting)
    meeting.ingestion_status = ingestion_service.fallback_notice
    meeting.status = "ingested"
    db.commit()
    db.refresh(meeting)


def _analyze_and_persist(meeting: Meeting, db: Session) -> dict:
    _ensure_meeting_transcript(meeting, db)
    meeting.analysis_status = "analyzing"
    meeting.ai_status = "analyzing"
    db.flush()
    logger.info("Sending transcript to OpenAI for meeting_id=%s", meeting.id)
    analysis = openai_service.analyze_transcript(meeting.transcript)

    meeting.summary = analysis["summary"]
    meeting.decisions = json.dumps(analysis["decisions"])
    meeting.blockers = json.dumps(analysis["blockers"])
    meeting.risks = json.dumps(analysis["risks"])
    meeting.deadlines = json.dumps(analysis["deadlines"])
    meeting.stakeholders = json.dumps(analysis["stakeholders"])
    meeting.owners = json.dumps(analysis["owners"])
    meeting.recommendations = json.dumps(analysis["recommendations"])
    meeting.delivery_concerns = json.dumps(analysis["delivery_concerns"])
    meeting.stakeholder_followups = json.dumps(analysis["stakeholder_followups"])
    meeting.next_meeting_preparation = json.dumps(analysis["next_meeting_preparation"])
    meeting.manager_summary = analysis["manager_summary"]
    meeting.status = "analyzed"
    meeting.analysis_status = "complete"
    meeting.ai_status = "complete"
    meeting.delivery_status = _delivery_status(analysis["risks"], analysis["blockers"])
    meeting.analysis_timestamp = datetime.utcnow()

    meeting.action_items.clear()
    db.flush()
    for item in analysis["action_items"]:
        db.add(ActionItem(meeting_id=meeting.id, **item))

    db.commit()
    db.refresh(meeting)
    logger.info("Database saved successfully for meeting_id=%s", meeting.id)
    return analysis


def _analysis_response(meeting: Meeting, agent_name: str) -> MeetingAnalysisResponse:
    return MeetingAnalysisResponse(
        id=meeting.id,
        agent=agent_name,
        title=meeting.title,
        meeting_title=_record_title(meeting),
        meeting_date=meeting.meeting_date or "",
        operational_category=meeting.operational_category or "Operational Meeting Intelligence",
        summary=meeting.summary,
        decisions=_loads(meeting.decisions),
        action_items=[
            {
                "id": item.id,
                "task": item.task,
                "owner": item.owner,
                "deadline": item.deadline,
                "priority": item.priority,
                "status": item.status,
            }
            for item in meeting.action_items
        ],
        blockers=_loads(meeting.blockers),
        risks=_loads(meeting.risks),
        deadlines=_loads(meeting.deadlines),
        stakeholders=_loads(meeting.stakeholders),
        owners=_loads(meeting.owners),
        recommendations=_loads(meeting.recommendations),
        delivery_concerns=_loads(meeting.delivery_concerns),
        stakeholder_followups=_loads(meeting.stakeholder_followups),
        next_meeting_preparation=_loads(meeting.next_meeting_preparation),
        manager_summary=meeting.manager_summary or "",
        ai_provider="openai",
        analysis_status=meeting.analysis_status or "pending",
        ai_status=_ai_status(meeting),
        delivery_status=_record_delivery_status(meeting),
        status=meeting.status,
    )


def _analysis_dict(meeting: Meeting) -> dict:
    return {
        "summary": meeting.summary,
        "decisions": _loads(meeting.decisions),
        "action_items": [
            {"task": item.task, "owner": item.owner, "deadline": item.deadline, "priority": item.priority, "status": item.status}
            for item in meeting.action_items
        ],
        "blockers": _loads(meeting.blockers),
        "risks": _loads(meeting.risks),
        "deadlines": _loads(meeting.deadlines),
        "stakeholders": _loads(meeting.stakeholders),
        "owners": _loads(meeting.owners),
        "recommendations": _loads(meeting.recommendations),
        "delivery_concerns": _loads(meeting.delivery_concerns),
        "stakeholder_followups": _loads(meeting.stakeholder_followups),
        "next_meeting_preparation": _loads(meeting.next_meeting_preparation),
        "manager_summary": meeting.manager_summary or meeting.summary,
    }


def _list_item(meeting: Meeting) -> MeetingListItem:
    return MeetingListItem(
        id=meeting.id,
        title=meeting.title,
        meeting_title=_record_title(meeting),
        meeting_date=meeting.meeting_date or "",
        operational_category=meeting.operational_category or "Operational Meeting Intelligence",
        source=meeting.source,
        source_type=meeting.source_type or "Transcript",
        platform_name=meeting.platform_name or "Manual Transcript",
        ingestion_method=meeting.ingestion_method or "manual",
        ingestion_status=meeting.ingestion_status or "ready",
        analysis_status=meeting.analysis_status or "pending",
        ai_status=_ai_status(meeting),
        delivery_status=_record_delivery_status(meeting),
        summary=meeting.summary or "Transcript uploaded. Analysis pending.",
        status=meeting.status,
        action_count=len(meeting.action_items),
        risk_count=len(_loads(meeting.risks)),
        blocker_count=len(_loads(meeting.blockers)),
        risks=_loads(meeting.risks),
        blockers=_loads(meeting.blockers),
        action_items=[
            {
                "id": item.id,
                "task": item.task,
                "owner": item.owner,
                "deadline": item.deadline,
                "priority": item.priority,
                "status": item.status,
            }
            for item in meeting.action_items
        ],
        report_count=len(meeting.reports),
        email_count=len(meeting.emails),
        sent_email_count=sum(1 for email in meeting.emails if (email.sent_status or "").lower() == "sent"),
        reports_generated=meeting.reports_generated or len(meeting.reports),
        stakeholder_emails=meeting.stakeholder_emails or len(meeting.emails),
        created_at=meeting.created_at,
        analysis_timestamp=meeting.analysis_timestamp,
    )


def _report_dict(report: GeneratedReport) -> dict:
    return {
        "id": report.id,
        "meeting_id": report.meeting_id,
        "executive_summary": report.executive_summary,
        "delivery_status": report.delivery_status,
        "operational_concerns": _loads(report.operational_concerns),
        "recommended_actions": _loads(report.recommended_actions),
        "executive_operational_summary": report.executive_operational_summary or report.executive_summary,
        "delivery_readiness_overview": report.delivery_readiness_overview or report.delivery_status,
        "operational_risks_concerns": report.operational_risks_concerns or " ".join(_loads(report.operational_concerns)),
        "facilitator_content_readiness": report.facilitator_content_readiness or "",
        "assessment_lms_readiness": report.assessment_lms_readiness or "",
        "stakeholder_coordination_updates": report.stakeholder_coordination_updates or "",
        "recommended_next_actions": report.recommended_next_actions or " ".join(_loads(report.recommended_actions)),
        "next_meeting_focus_areas": report.next_meeting_focus_areas or "",
        "delivery_confidence": report.delivery_confidence or "Medium",
    }


def _email_dict(email: GeneratedEmail) -> dict:
    return {
        "id": email.id,
        "meeting_id": email.meeting_id,
        "email_type": email.email_type,
        "subject": email.subject,
        "body": email.body,
        "recipients": _loads(email.recipients),
        "sent_status": email.sent_status or "draft",
    }


def _loads(value: str | None) -> list:
    if not value:
        return []
    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return []
