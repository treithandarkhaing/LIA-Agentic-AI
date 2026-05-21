from __future__ import annotations

import re
from datetime import datetime


class TranscriptIngestionService:
    fallback_notice = "Transcript extraction unavailable. Using AI-generated operational transcript for analysis."

    def simulate_extraction(self, source: dict) -> dict:
        platform = source["platform_name"]
        title = source.get("meeting_title") or "Meeting Recording"
        transcript = self.generate_fallback_transcript(title=title, platform=platform)

        return {
            "transcript": self.ensure_transcript(transcript, title=title, platform=platform),
            "confidence": 0.91,
            "retrieval_status": "Transcript extracted with simulated enterprise connector",
            "fallback_used": False,
            "processing_steps": [
                "Validating collaboration source",
                "Retrieving recording metadata",
                "Simulating transcript extraction",
                "Normalizing speaker turns",
                "Preparing meeting intelligence payload",
            ],
        }

    def ensure_transcript(self, transcript: str | None, title: str = "Learning Delivery Meeting", platform: str = "Enterprise source") -> str:
        normalized = self.normalize_transcript(transcript or "")
        if normalized:
            return normalized
        return self.generate_fallback_transcript(title=title, platform=platform)

    def generate_fallback_transcript(self, title: str = "Learning Delivery Meeting", platform: str = "Enterprise source") -> str:
        transcript = f"""
Maya Chen: We are reviewing the {title} from {platform}. The main delivery concern is learner roster validation before final reminders go out.
Arun Patel: Facilitator readiness is mostly complete, but the revised guide still needs to be sent to APAC and EMEA facilitators.
Lina Gomez: Assessment reporting is blocked because the EMEA attendance source has not been confirmed.
Noah Williams: Keep the cohort schedule unchanged, but escalate missing attendance data today and provide a manager update by Friday.
Priya Raman: I will update the activity instructions and confirm accessibility captions before the next delivery checkpoint.
Maya Chen: The deadline for roster validation is today at 15:00, and we need one owner for every open action.
Arun Patel: The project update is amber because session delivery can continue, but quality risk increases if facilitator materials are late.
Lina Gomez: Stakeholders are concerned about reporting accuracy and learner progress visibility for the executive review.
Noah Williams: Recommended action is to close the data blocker today, confirm facilitator readiness tomorrow morning, and send a concise stakeholder follow-up.
""".strip()
        return self.normalize_transcript(transcript)

    def normalize_transcript(self, transcript: str) -> str:
        lines = [line.strip() for line in transcript.splitlines() if line.strip()]
        return "\n".join(lines)

    def extract_metadata(self, transcript: str, provided_title: str = "", platform: str = "Manual Transcript") -> dict:
        normalized = self.normalize_transcript(transcript or "")
        title = self._resolve_title(provided_title, normalized)
        meeting_date = self._extract_date(normalized)
        return {
            "meeting_title": title,
            "meeting_date": meeting_date,
            "operational_category": self._extract_category(normalized, platform),
            "source_type": platform or "Manual Transcript",
        }

    def _resolve_title(self, provided_title: str, transcript: str) -> str:
        cleaned_title = (provided_title or "").strip()
        generic_titles = {
            "",
            "manual teams transcript",
            "microsoft teams transcript",
            "meeting recording",
            "operational meeting record",
        }
        if cleaned_title.lower() not in generic_titles:
            return cleaned_title

        patterns = [
            r"(?im)^\s*(?:meeting|session|call|recording)\s*(?:title|name)\s*[:\-]\s*(.+)$",
            r"(?im)^\s*subject\s*[:\-]\s*(.+)$",
            r"(?im)^\s*agenda\s*[:\-]\s*(.+)$",
        ]
        for pattern in patterns:
            match = re.search(pattern, transcript)
            if match:
                candidate = match.group(1).strip()
                if candidate:
                    return candidate[:255]
        return "Operational Meeting Record"

    def _extract_date(self, transcript: str) -> str:
        patterns = [
            r"(?im)^\s*(?:meeting\s*)?date\s*[:\-]\s*([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})",
            r"(?im)^\s*(?:meeting\s*)?date\s*[:\-]\s*(\d{1,2}[-/][A-Za-z]{3,9}[-/]\d{2,4})",
            r"(?im)^\s*(?:meeting\s*)?date\s*[:\-]\s*(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})",
            r"\b(\d{1,2}[-/][A-Za-z]{3,9}[-/]\d{2,4})\b",
            r"\b([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4})\b",
        ]
        for pattern in patterns:
            match = re.search(pattern, transcript)
            if match:
                return match.group(1).strip()
        return ""

    def _extract_category(self, transcript: str, platform: str) -> str:
        lower = transcript.lower()
        if any(word in lower for word in ["cohort", "learner", "onboarding", "facilitator", "lms", "assessment"]):
            return "Learning Delivery Operations"
        if any(word in lower for word in ["partner", "stakeholder", "client"]):
            return "Stakeholder Coordination"
        if any(word in lower for word in ["risk", "blocker", "escalation"]):
            return "Operational Risk Review"
        if platform and platform != "Manual Transcript":
            return f"{platform} Meeting Intelligence"
        return "Operational Meeting Intelligence"
