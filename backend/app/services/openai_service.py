from __future__ import annotations

import json
import logging
import os
from typing import Any

from dotenv import load_dotenv
from openai import APIConnectionError, APIError, APITimeoutError, AuthenticationError, OpenAI, RateLimitError


load_dotenv()
logger = logging.getLogger("lia.openai")


class OpenAIServiceError(Exception):
    def __init__(self, message: str, status_code: int = 503) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class OpenAIService:
    model = "gpt-4o-mini"

    def __init__(self) -> None:
        api_key = self._normalize_api_key(os.getenv("OPENAI_API_KEY"))
        if not api_key:
            self.client = None
            logger.warning("OpenAI API key missing. Set OPENAI_API_KEY in backend/.env.")
            return

        self.client = OpenAI(api_key=api_key, timeout=45.0, max_retries=1)
        logger.info("OpenAI API initialized")

    def analyze_transcript(self, transcript: str) -> dict[str, Any]:
        if not transcript or not transcript.strip():
            raise OpenAIServiceError("Transcript is empty after ingestion. Please retry ingestion.", 400)
        if self.client is None:
            raise OpenAIServiceError("OpenAI API key is missing. Add OPENAI_API_KEY to backend/.env and restart the backend.", 503)

        logger.info("Transcript received. Sending transcript to GPT-4o-mini")
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                response_format={"type": "json_object"},
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are an enterprise Meeting Intelligence Analyst, Learning Delivery Manager, "
                            "and Operations Coordinator. Analyze learning and delivery operations meetings with "
                            "focus on operational execution, accountability, stakeholder communication, delivery "
                            "risks, blockers, deadlines, learner impact, and recommended next steps. Return only "
                            "valid JSON. Do not include markdown."
                        ),
                    },
                    {
                        "role": "user",
                        "content": (
                            "Analyze this meeting transcript and return JSON with this exact shape:\n"
                            "{\n"
                            '  "summary": "string",\n'
                            '  "decisions": ["string"],\n'
                            '  "action_items": [{"task":"string","owner":"string","deadline":"string","priority":"High|Medium|Low","status":"Pending|At Risk|Completed"}],\n'
                            '  "owners": ["string"],\n'
                            '  "risks": ["string"],\n'
                            '  "blockers": ["string"],\n'
                            '  "delivery_concerns": ["string"],\n'
                            '  "deadlines": ["string"],\n'
                            '  "stakeholders": ["string"],\n'
                            '  "stakeholder_followups": ["string"],\n'
                            '  "next_meeting_preparation": ["string"],\n'
                            '  "recommendations": ["string"],\n'
                            '  "manager_summary": "string"\n'
                            "}\n\n"
                            "Only use facts present in the transcript. If an item is unclear, mark it as TBD rather than inventing details. "
                            "Prioritize operational accountability, learning delivery readiness, stakeholder follow-up, risks, blockers, and next meeting readiness.\n\n"
                            f"Transcript:\n{transcript[:9000]}"
                        ),
                    },
                ],
                temperature=0.2,
                max_tokens=1400,
            )
        except AuthenticationError as exc:
            logger.exception("OpenAI authentication failed")
            raise OpenAIServiceError("OpenAI authentication failed. Check OPENAI_API_KEY in backend/.env.", 401) from exc
        except RateLimitError as exc:
            logger.exception("OpenAI quota or rate limit reached")
            raise OpenAIServiceError("OpenAI quota or rate limit reached. Please retry later or check billing limits.", 429) from exc
        except APITimeoutError as exc:
            logger.exception("OpenAI request timed out")
            raise OpenAIServiceError("OpenAI analysis timed out. Please retry the meeting analysis.", 504) from exc
        except APIConnectionError as exc:
            logger.exception("OpenAI connection error")
            raise OpenAIServiceError("Could not connect to OpenAI. Check network connectivity and retry.", 503) from exc
        except APIError as exc:
            logger.exception("OpenAI API error")
            raise OpenAIServiceError("OpenAI API returned an error while analyzing the transcript.", 502) from exc

        content = response.choices[0].message.content or "{}"
        try:
            parsed = json.loads(content)
        except json.JSONDecodeError as exc:
            logger.exception("Malformed OpenAI JSON response")
            raise OpenAIServiceError("OpenAI returned malformed JSON. Please retry analysis.", 502) from exc

        normalized = self._normalize_analysis(parsed)
        logger.info("AI analysis completed")
        return normalized

    def generate_management_report(self, analysis: dict[str, Any], transcript: str = "") -> dict[str, str]:
        if self.client is None:
            raise OpenAIServiceError("OpenAI API key is missing. Add OPENAI_API_KEY to backend/.env and restart the backend.", 503)

        logger.info("Generating narrative management report with GPT-4o-mini")
        source_payload = {
            "analysis": analysis,
            "transcript_excerpt": (transcript or "")[:7000],
        }
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                response_format={"type": "json_object"},
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are an experienced Learning & Delivery Manager, Operations Reporting Lead, "
                            "and Executive Program Coordinator. Write professional operational management reports "
                            "for leadership stakeholders. Use natural human-readable language, paragraph-based "
                            "narrative style, and practical operational storytelling. Explain why issues matter, "
                            "how dependencies affect delivery readiness, what stakeholder coordination is needed, "
                            "and what the delivery confidence level appears to be. Avoid robotic summaries, "
                            "generic AI phrasing, dashboard-style bullets, and fragmented analytics."
                        ),
                    },
                    {
                        "role": "user",
                        "content": (
                            "Write a leadership-ready operational management report based only on the provided meeting analysis and transcript excerpt. "
                            "Each section should be a concise narrative paragraph, not a bullet list. If a topic was not discussed, say so professionally "
                            "and explain the resulting visibility gap. Connect decisions, risks, blockers, and actions to delivery implications.\n\n"
                            "Return only valid JSON with this exact shape:\n"
                            "{\n"
                            '  "executive_operational_summary": "paragraph",\n'
                            '  "delivery_readiness_overview": "paragraph",\n'
                            '  "operational_risks_concerns": "paragraph",\n'
                            '  "facilitator_content_readiness": "paragraph",\n'
                            '  "assessment_lms_readiness": "paragraph",\n'
                            '  "stakeholder_coordination_updates": "paragraph",\n'
                            '  "recommended_next_actions": "paragraph",\n'
                            '  "next_meeting_focus_areas": "paragraph",\n'
                            '  "delivery_confidence": "High|Medium|Low"\n'
                            "}\n\n"
                            "Reporting requirements:\n"
                            "- Sound like a real management communication written by a senior learning delivery operator.\n"
                            "- Use natural paragraphs with contextual explanation.\n"
                            "- Explain operational impact and dependencies clearly.\n"
                            "- Highlight accountability subtly without sounding punitive.\n"
                            "- Keep the writing concise, thoughtful, and executive-ready.\n\n"
                            f"Source material:\n{json.dumps(source_payload, ensure_ascii=False)}"
                        ),
                    },
                ],
                temperature=0.35,
                max_tokens=1800,
            )
        except AuthenticationError as exc:
            logger.exception("OpenAI authentication failed during report generation")
            raise OpenAIServiceError("OpenAI authentication failed. Check OPENAI_API_KEY in backend/.env.", 401) from exc
        except RateLimitError as exc:
            logger.exception("OpenAI quota or rate limit reached during report generation")
            raise OpenAIServiceError("OpenAI quota or rate limit reached. Please retry later or check billing limits.", 429) from exc
        except APITimeoutError as exc:
            logger.exception("OpenAI report generation timed out")
            raise OpenAIServiceError("OpenAI report generation timed out. Please retry.", 504) from exc
        except APIConnectionError as exc:
            logger.exception("OpenAI connection error during report generation")
            raise OpenAIServiceError("Could not connect to OpenAI. Check network connectivity and retry.", 503) from exc
        except APIError as exc:
            logger.exception("OpenAI API error during report generation")
            raise OpenAIServiceError("OpenAI API returned an error while generating the report.", 502) from exc

        content = response.choices[0].message.content or "{}"
        try:
            parsed = json.loads(content)
        except json.JSONDecodeError as exc:
            logger.exception("Malformed OpenAI report JSON response")
            raise OpenAIServiceError("OpenAI returned malformed report JSON. Please retry.", 502) from exc

        normalized = self._normalize_report(parsed)
        logger.info("Narrative management report generated")
        return normalized

    def generate_operational_emails(self, analysis: dict[str, Any], transcript: str = "") -> list[dict[str, str]]:
        if self.client is None:
            raise OpenAIServiceError("OpenAI API key is missing. Add OPENAI_API_KEY to backend/.env and restart the backend.", 503)

        logger.info("Generating concise operational emails with GPT-4o-mini")
        signature = (
            "Warm regards,\n\n"
            "EI THANDAR KHAING, Learning Management\n"
            "e: eithandar@educlaas.com\n"
            "o: +959 798469301\n"
            "w: www.claas2saas.com\n\n"
            "a: 11 Eunos Road 8, #07-02 Lifelong Learning Institute, Singapore 408601"
        )
        source_payload = {
            "analysis": analysis,
            "transcript_excerpt": (transcript or "")[:6500],
        }
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                response_format={"type": "json_object"},
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a Learning & Delivery Manager, Operations Coordinator, and Cohort Management Lead. "
                            "Write concise, human-readable operational communication emails from meeting intelligence. "
                            "The writing must sound practical, realistic, and management-oriented, not like an AI summary. "
                            "Avoid excessive corporate storytelling, generic filler, long paragraphs, dashboard exports, and robotic phrasing. "
                            "Focus on operational clarity, meeting outcomes, delivery concerns, actions required, approvals needed, and next meeting readiness."
                        ),
                    },
                    {
                        "role": "user",
                        "content": (
                            "Detect the meeting type from the source material. Classify it as one of: Management Meeting, Operational Meeting, Learner Consultation, or Partner Meeting. "
                            "If the transcript discusses learner progress, attendance concerns, pending assessments, academic support, or consultation, treat it as Learner Consultation.\n\n"
                            "Generate three distinct communication emails from the provided meeting intelligence.\n\n"
                            "EMAIL 1: Manager Reporting Email\n"
                            "Purpose: provide management visibility, summarize operational discussions, highlight risks, communicate actions taken, and request approvals or guidance.\n"
                            "Tone: concise, professional, operational, decision-oriented.\n"
                            "Required section labels: Greeting, Summary of Meeting, Issues / Risks, Action Taken, Need Approval, Closing.\n"
                            "Style: sound like a real Delivery Manager. Explain operational impact clearly. Avoid excessive narrative and unnecessary corporate language.\n\n"
                            "EMAIL 2: Team Follow-up Email\n"
                            "Purpose: align the internal team, summarize outcomes, communicate operational concerns, and guide preparation for the next meeting.\n"
                            "Tone: collaborative, operational, instructional, team-oriented.\n"
                            "Required section labels: Greeting, Summary of Meeting, Issues / Risks, Areas for Improvement, Preparation for Next Meeting, Closing.\n"
                            "Style: practical and execution-focused. Communicate expectations clearly without sounding punitive.\n\n"
                            "EMAIL 3: Learner Consultation Email\n"
                            "Purpose: provide a learner-friendly follow-up when learner progress, attendance, assessment, or support concerns are discussed.\n"
                            "Tone: professional, supportive, empathetic, learner-centered, encouraging, and human-written.\n"
                            "Required section labels: Greeting, Consultation Summary, Learner Progress Discussion, Agreed Follow-up Actions, Next Steps, Encouragement & Support, Closing.\n"
                            "Style: avoid corporate management language, harsh operational wording, and robotic summaries. If the meeting is not learner-related, still draft a gentle learner-support style follow-up that can be edited before sending.\n\n"
                            "Both emails must be concise: ideally 250-400 words each. Use short paragraphs and compact plain-text bullets only where helpful. "
                            "Do not use markdown formatting, bold text, tables, emojis, or code-style formatting. Do not mention AI, dashboards, extracted analytics, or meeting intelligence tools.\n\n"
                            "Return only valid JSON with this exact shape:\n"
                            "{\n"
                            '  "meeting_type": "Management Meeting|Operational Meeting|Learner Consultation|Partner Meeting",\n'
                            '  "emails": [\n'
                            '    {"email_type":"manager_report","subject":"string","body":"string"},\n'
                            '    {"email_type":"team_follow_up","subject":"string","body":"string"},\n'
                            '    {"email_type":"learner_consultation","subject":"string","body":"string"}\n'
                            "  ]\n"
                            "}\n\n"
                            f"Required signature to append exactly:\n{signature}\n\n"
                            f"Source material:\n{json.dumps(source_payload, ensure_ascii=False)}"
                        ),
                    },
                ],
                temperature=0.35,
                max_tokens=1800,
            )
        except AuthenticationError as exc:
            logger.exception("OpenAI authentication failed during email generation")
            raise OpenAIServiceError("OpenAI authentication failed. Check OPENAI_API_KEY in backend/.env.", 401) from exc
        except RateLimitError as exc:
            logger.exception("OpenAI quota or rate limit reached during email generation")
            raise OpenAIServiceError("OpenAI quota or rate limit reached. Please retry later or check billing limits.", 429) from exc
        except APITimeoutError as exc:
            logger.exception("OpenAI email generation timed out")
            raise OpenAIServiceError("OpenAI email generation timed out. Please retry.", 504) from exc
        except APIConnectionError as exc:
            logger.exception("OpenAI connection error during email generation")
            raise OpenAIServiceError("Could not connect to OpenAI. Check network connectivity and retry.", 503) from exc
        except APIError as exc:
            logger.exception("OpenAI API error during email generation")
            raise OpenAIServiceError("OpenAI API returned an error while generating emails.", 502) from exc

        content = response.choices[0].message.content or "{}"
        try:
            parsed = json.loads(content)
        except json.JSONDecodeError as exc:
            logger.exception("Malformed OpenAI email JSON response")
            raise OpenAIServiceError("OpenAI returned malformed email JSON. Please retry.", 502) from exc

        normalized = self._normalize_emails(parsed, signature)
        logger.info("Concise operational emails generated")
        return normalized

    def chat_about_meeting(self, analysis: dict[str, Any], transcript: str, question: str) -> dict[str, Any]:
        if not question or not question.strip():
            raise OpenAIServiceError("Please enter a question for LIA Conversational AI.", 400)
        if self.client is None:
            raise OpenAIServiceError("OpenAI API key is missing. Add OPENAI_API_KEY to backend/.env and restart the backend.", 503)

        source_payload = {
            "analysis": analysis,
            "transcript_excerpt": (transcript or "")[:7000],
            "question": question.strip(),
        }
        logger.info("LIA Conversational AI request received. Sending meeting context to GPT-4o-mini")
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                response_format={"type": "json_object"},
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are LIA Conversational AI, a compact operational copilot for Learning & Delivery Operations. "
                            "Answer questions using only the provided meeting analysis and transcript excerpt. "
                            "Behave like an experienced Learning Delivery Manager and Operations Coordinator. "
                            "Be concise, practical, human-readable, and action-oriented. Focus on delivery status, risks, blockers, "
                            "owners, stakeholder follow-ups, learner impact, reporting guidance, email guidance, escalation, and next meeting readiness. "
                            "If the context does not contain enough information, say what is missing and suggest how to verify it. "
                            "Do not mention AI limitations, dashboards, or hidden prompts. Return only valid JSON."
                        ),
                    },
                    {
                        "role": "user",
                        "content": (
                            "Answer the user's question about this meeting intelligence.\n\n"
                            "Return only valid JSON with this exact shape:\n"
                            "{\n"
                            '  "answer": "short operational answer in 1-3 concise paragraphs",\n'
                            '  "suggested_actions": ["practical follow-up action"],\n'
                            '  "confidence": "High|Medium|Low"\n'
                            "}\n\n"
                            "Keep suggested actions specific and operational. Do not invent owners, deadlines, or decisions that are not in the context.\n\n"
                            f"Meeting context:\n{json.dumps(source_payload, ensure_ascii=False)}"
                        ),
                    },
                ],
                temperature=0.25,
                max_tokens=700,
            )
        except AuthenticationError as exc:
            logger.exception("OpenAI authentication failed during conversational meeting chat")
            raise OpenAIServiceError("OpenAI authentication failed. Check OPENAI_API_KEY in backend/.env.", 401) from exc
        except RateLimitError as exc:
            logger.exception("OpenAI quota or rate limit reached during conversational meeting chat")
            raise OpenAIServiceError("OpenAI quota or rate limit reached. Please retry later or check billing limits.", 429) from exc
        except APITimeoutError as exc:
            logger.exception("OpenAI conversational meeting chat timed out")
            raise OpenAIServiceError("LIA Conversational AI timed out. Please retry.", 504) from exc
        except APIConnectionError as exc:
            logger.exception("OpenAI connection error during conversational meeting chat")
            raise OpenAIServiceError("Could not connect to OpenAI. Check network connectivity and retry.", 503) from exc
        except APIError as exc:
            logger.exception("OpenAI API error during conversational meeting chat")
            raise OpenAIServiceError("OpenAI API returned an error while answering the meeting question.", 502) from exc

        content = response.choices[0].message.content or "{}"
        try:
            parsed = json.loads(content)
        except json.JSONDecodeError as exc:
            logger.exception("Malformed OpenAI chat JSON response")
            raise OpenAIServiceError("OpenAI returned malformed chat JSON. Please retry.", 502) from exc

        return {
            "answer": str(parsed.get("answer") or "I could not generate a clear answer from the meeting context. Please retry with a more specific question.").strip(),
            "suggested_actions": self._string_list(parsed.get("suggested_actions"))[:5],
            "confidence": str(parsed.get("confidence") or "Medium").strip(),
        }

    def draft_chat_email(self, analysis: dict[str, Any], transcript: str, request: str, audience: str) -> dict[str, str]:
        if not request or not request.strip():
            raise OpenAIServiceError("Please enter an email request for LIA Conversational AI.", 400)
        if self.client is None:
            raise OpenAIServiceError("OpenAI API key is missing. Add OPENAI_API_KEY to backend/.env and restart the backend.", 503)

        signature = (
            "Warm regards,\n\n"
            "EI THANDAR KHAING, Learning Management\n"
            "e: eithandar@educlaas.com\n"
            "o: +959 798469301\n"
            "w: www.claas2saas.com\n\n"
            "a: 11 Eunos Road 8, #07-02 Lifelong Learning Institute, Singapore 408601"
        )
        source_payload = {
            "analysis": analysis,
            "transcript_excerpt": (transcript or "")[:7000],
            "request": request.strip(),
            "audience": audience,
        }
        logger.info("Drafting LIA conversational email with GPT-4o-mini")
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                response_format={"type": "json_object"},
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are LIA Conversational AI, assisting a Learning & Delivery Manager with operational communication. "
                            "Draft concise, human-written emails based only on the provided meeting analysis and transcript excerpt. "
                            "Write in the correct style for the audience: manager emails are decision-oriented, team emails are execution-focused, "
                            "and learner emails are supportive, empathetic, and learner-centered. Avoid robotic AI wording, dashboard language, "
                            "excessive corporate phrasing, markdown, tables, and invented facts."
                        ),
                    },
                    {
                        "role": "user",
                        "content": (
                            "Draft one email for the requested audience.\n\n"
                            "Return only valid JSON with this exact shape:\n"
                            "{\n"
                            '  "email_type": "manager_report|team_follow_up|learner_consultation",\n'
                            '  "audience": "Manager|Team|Learner",\n'
                            '  "subject": "string",\n'
                            '  "body": "plain text email body"\n'
                            "}\n\n"
                            "Audience rules:\n"
                            "- Manager: concise update with Summary of Meeting, Issues / Risks, Action Taken, Need Approval, Closing.\n"
                            "- Team: practical follow-up with Summary of Meeting, Issues / Risks, Areas for Improvement, Preparation for Next Meeting, Closing.\n"
                            "- Learner: supportive consultation follow-up with Consultation Summary, Learner Progress Discussion, Agreed Follow-up Actions, Next Steps, Encouragement & Support, Closing.\n"
                            "Append the required signature exactly at the end.\n\n"
                            f"Required signature:\n{signature}\n\n"
                            f"Source material:\n{json.dumps(source_payload, ensure_ascii=False)}"
                        ),
                    },
                ],
                temperature=0.35,
                max_tokens=1100,
            )
        except AuthenticationError as exc:
            logger.exception("OpenAI authentication failed during conversational email draft")
            raise OpenAIServiceError("OpenAI authentication failed. Check OPENAI_API_KEY in backend/.env.", 401) from exc
        except RateLimitError as exc:
            logger.exception("OpenAI quota or rate limit reached during conversational email draft")
            raise OpenAIServiceError("OpenAI quota or rate limit reached. Please retry later or check billing limits.", 429) from exc
        except APITimeoutError as exc:
            logger.exception("OpenAI conversational email draft timed out")
            raise OpenAIServiceError("LIA email drafting timed out. Please retry.", 504) from exc
        except APIConnectionError as exc:
            logger.exception("OpenAI connection error during conversational email draft")
            raise OpenAIServiceError("Could not connect to OpenAI. Check network connectivity and retry.", 503) from exc
        except APIError as exc:
            logger.exception("OpenAI API error during conversational email draft")
            raise OpenAIServiceError("OpenAI API returned an error while drafting the email.", 502) from exc

        content = response.choices[0].message.content or "{}"
        try:
            parsed = json.loads(content)
        except json.JSONDecodeError as exc:
            logger.exception("Malformed OpenAI conversational email JSON response")
            raise OpenAIServiceError("OpenAI returned malformed email JSON. Please retry.", 502) from exc

        email_type = str(parsed.get("email_type") or self._email_type_for_audience(audience)).strip()
        if email_type not in {"manager_report", "team_follow_up", "learner_consultation"}:
            email_type = self._email_type_for_audience(audience)
        return {
            "email_type": email_type,
            "audience": str(parsed.get("audience") or audience).strip(),
            "subject": str(parsed.get("subject") or self._default_email_subject(email_type)).strip(),
            "body": self._with_canonical_signature(str(parsed.get("body") or "").strip(), signature),
        }

    def _normalize_analysis(self, payload: dict[str, Any]) -> dict[str, Any]:
        action_items = payload.get("action_items") or []
        if not isinstance(action_items, list):
            action_items = []

        normalized_actions = []
        for item in action_items:
            if not isinstance(item, dict):
                continue
            normalized_actions.append(
                {
                    "task": str(item.get("task") or "Follow up on meeting action"),
                    "owner": str(item.get("owner") or "Unassigned"),
                    "deadline": str(item.get("deadline") or "TBD"),
                    "priority": str(item.get("priority") or "Medium"),
                    "status": str(item.get("status") or "Pending"),
                }
            )

        return {
            "agent": "OpenAI GPT-4o-mini Meeting Intelligence",
            "summary": str(payload.get("summary") or "OpenAI generated a meeting summary, but the response was incomplete."),
            "action_items": normalized_actions,
            "risks": self._string_list(payload.get("risks")),
            "blockers": self._string_list(payload.get("blockers")),
            "deadlines": self._string_list(payload.get("deadlines")),
            "stakeholders": self._string_list(payload.get("stakeholders")),
            "owners": self._string_list(payload.get("owners")),
            "recommendations": self._string_list(payload.get("recommendations")),
            "delivery_concerns": self._string_list(payload.get("delivery_concerns")),
            "stakeholder_followups": self._string_list(payload.get("stakeholder_followups")),
            "next_meeting_preparation": self._string_list(payload.get("next_meeting_preparation")),
            "manager_summary": str(payload.get("manager_summary") or payload.get("summary") or ""),
            "decisions": self._string_list(payload.get("decisions")),
        }

    def _normalize_report(self, payload: dict[str, Any]) -> dict[str, str]:
        fields = {
            "executive_operational_summary": "The meeting was analyzed successfully, but the executive narrative was incomplete. Review the analysis dashboard for extracted operational details.",
            "delivery_readiness_overview": "Delivery readiness requires follow-up because the generated report did not include a complete readiness narrative.",
            "operational_risks_concerns": "Operational risks should be reviewed against the extracted risks, blockers, and delivery concerns before leadership communication.",
            "facilitator_content_readiness": "Facilitator and content readiness were not clearly described in the generated report, creating a visibility gap for delivery preparation.",
            "assessment_lms_readiness": "Assessment and LMS readiness were not clearly described in the generated report, so ownership and completion status should be confirmed.",
            "stakeholder_coordination_updates": "Stakeholder coordination requires confirmation based on the extracted follow-ups and action owners.",
            "recommended_next_actions": "The team should review open actions, clarify ownership, and confirm delivery-critical dependencies before the next checkpoint.",
            "next_meeting_focus_areas": "The next meeting should focus on unresolved blockers, readiness gaps, risk mitigation, and accountability for upcoming milestones.",
            "delivery_confidence": "Medium",
        }
        return {key: str(payload.get(key) or fallback).strip() for key, fallback in fields.items()}

    def _normalize_emails(self, payload: dict[str, Any], signature: str) -> list[dict[str, str]]:
        emails = payload.get("emails") if isinstance(payload, dict) else None
        if not isinstance(emails, list):
            emails = []

        by_type: dict[str, dict[str, str]] = {}
        for item in emails:
            if not isinstance(item, dict):
                continue
            email_type = str(item.get("email_type") or "").strip()
            if email_type not in {"manager_report", "team_follow_up", "learner_consultation"}:
                continue
            body = self._with_canonical_signature(str(item.get("body") or "").strip(), signature)
            by_type[email_type] = {
                "email_type": email_type,
                "subject": str(item.get("subject") or self._default_email_subject(email_type)).strip(),
                "body": body,
            }

        return [
            by_type.get(
                "manager_report",
                {
                    "email_type": "manager_report",
                    "subject": self._default_email_subject("manager_report"),
                    "body": f"Hi Manager,\n\nSummary of Meeting\nThe team reviewed learning delivery readiness and the open operational items that may need management visibility.\n\nIssues / Risks\nPlease review the risks and blockers in the meeting analysis before sending this email.\n\nAction Taken\nOwners and next steps have been captured for follow-up.\n\nNeed Approval\nAny pending approvals should be confirmed before the next delivery checkpoint.\n\nClosing\nI will continue tracking the open items and escalate if delivery readiness is affected.\n\n{signature}",
                },
            ),
            by_type.get(
                "team_follow_up",
                {
                    "email_type": "team_follow_up",
                    "subject": self._default_email_subject("team_follow_up"),
                    "body": f"Hi Team,\n\nSummary of Meeting\nWe reviewed the current delivery status and agreed follow-up items for the next checkpoint.\n\nIssues / Risks\nPlease check any open risks, blockers, or learner-impacting dependencies assigned to your area.\n\nAreas for Improvement\nKeep ownership, timelines, and readiness updates clear before the next meeting.\n\nPreparation for Next Meeting\nCome prepared with action status, blockers, and decisions needed.\n\nClosing\nThank you. Please flag any changes to ownership or deadlines early.\n\n{signature}",
                },
            ),
            by_type.get(
                "learner_consultation",
                {
                    "email_type": "learner_consultation",
                    "subject": self._default_email_subject("learner_consultation"),
                    "body": f"Hi Learner,\n\nConsultation Summary\nThank you for taking time to discuss your learning progress and support needs.\n\nLearner Progress Discussion\nWe reviewed the areas that may need more attention, including attendance, assessments, or any pending learning activities.\n\nAgreed Follow-up Actions\nPlease continue working on the agreed actions and reach out early if you need clarification or support.\n\nNext Steps\nWe will monitor progress and follow up again at the next agreed checkpoint.\n\nEncouragement & Support\nYou are encouraged to stay engaged and ask for help whenever needed. The goal is to support your progress and help you complete the required learning outcomes.\n\nClosing\nPlease reply if you have questions or need additional guidance.\n\n{signature}",
                },
            ),
        ]

    def _default_email_subject(self, email_type: str) -> str:
        if email_type == "manager_report":
            return "Manager Update: Delivery Risks, Actions, and Approvals Needed"
        if email_type == "learner_consultation":
            return "Learner Consultation Follow-up: Progress, Actions, and Support"
        return "Team Follow-up: Actions, Risks, and Next Meeting Preparation"

    def _email_type_for_audience(self, audience: str) -> str:
        normalized = audience.strip().lower()
        if normalized == "learner":
            return "learner_consultation"
        if normalized == "team":
            return "team_follow_up"
        return "manager_report"

    def _with_canonical_signature(self, body: str, signature: str) -> str:
        cleaned = body.replace("**", "").strip()
        marker = cleaned.find("EI THANDAR KHAING, Learning Management")
        if marker >= 0:
            closing = cleaned.rfind("Warm regards", 0, marker)
            cleaned = cleaned[: closing if closing >= 0 else marker].rstrip()
        return f"{cleaned}\n\n{signature}"

    def _string_list(self, value: Any) -> list[str]:
        if not isinstance(value, list):
            return []
        return [str(item) for item in value if str(item).strip()]

    def _normalize_api_key(self, raw_key: str | None) -> str:
        key = (raw_key or "").strip().strip('"').strip("'")
        if key.startswith("Bearer "):
            key = key.removeprefix("Bearer ").strip()
        marker = key.find("sk-")
        if marker > 0:
            logger.warning("OPENAI_API_KEY contained extra leading text; using substring beginning with sk-.")
            key = key[marker:]
        return key
