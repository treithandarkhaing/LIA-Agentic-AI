from __future__ import annotations

import re


class MeetingIntelligenceAgent:
    name = "MeetingIntelligenceAgent"

    def analyze(self, transcript: str) -> dict:
        text = transcript.strip()
        lower = text.lower()
        stakeholders = self._stakeholders(text)

        blockers = [
            "Regional attendance data source is not confirmed",
            "Facilitator coverage remains unconfirmed for the final delivery block",
        ]
        if "caption" in lower or "accessibility" in lower:
            blockers.append("Accessibility caption review is waiting on vendor QA")

        risks = [
            "Learner communications may be delayed if roster exceptions remain open",
            "Assessment reporting could slip without a confirmed regional data feed",
            "Meeting density may reduce manager focus time for delivery recovery work",
        ]

        decisions = [
            "Keep the delivery schedule unchanged while risks are mitigated",
            "Use the revised facilitator guide for the next cohort launch",
            "Escalate missing attendance data to the program owner today",
        ]

        action_items = [
            {"task": "Validate learner roster exceptions", "owner": "Maya Chen", "deadline": "Today 15:00", "priority": "High", "status": "Pending"},
            {"task": "Send revised facilitator guide to regional facilitators", "owner": "Arun Patel", "deadline": "Tomorrow 10:00", "priority": "Medium", "status": "Pending"},
            {"task": "Confirm assessment data source with EMEA operations", "owner": "Lina Gomez", "deadline": "Friday 12:00", "priority": "High", "status": "At Risk"},
            {"task": "Prepare executive delivery status summary", "owner": "Noah Williams", "deadline": "Friday 16:00", "priority": "Medium", "status": "Pending"},
        ]

        deadlines = [item["deadline"] for item in action_items]
        summary = (
            "The meeting focused on learning delivery readiness, learner roster validation, "
            "facilitator preparedness, assessment reporting, and escalation of missing regional data. "
            "The team aligned on immediate owners, deadlines, and risk mitigation steps for the next cohort launch."
        )

        return {
            "agent": self.name,
            "summary": summary,
            "decisions": decisions,
            "action_items": action_items,
            "blockers": blockers,
            "risks": risks,
            "deadlines": deadlines,
            "stakeholders": stakeholders,
        }

    def generate_report(self, analysis: dict) -> dict:
        return {
            "executive_summary": analysis["summary"],
            "delivery_status": "Amber: delivery remains on schedule, but roster validation and assessment data require same-day follow-up.",
            "operational_concerns": analysis.get("delivery_concerns") or analysis.get("risks") or [
                "No major delivery concerns were identified by the AI analysis.",
            ],
            "recommended_actions": analysis.get("recommendations") or [
                "Confirm all action owners and deadlines with stakeholders.",
            ],
        }

    def generate_emails(self, analysis: dict, report: dict) -> list[dict]:
        return [
            {
                "email_type": "manager_report",
                "subject": "Manager Brief: Learning Delivery Readiness and Risk Actions",
                "body": (
                    "Hi team,\n\n"
                    f"Executive summary: {report['executive_summary']}\n\n"
                    f"Delivery status: {report['delivery_status']}\n\n"
                    "Recommended actions:\n"
                    + "\n".join(f"- {item}" for item in report["recommended_actions"])
                    + "\n\nRegards,\nAI Meeting Intelligence Agent"
                ),
            },
            {
                "email_type": "stakeholder_follow_up",
                "subject": "Follow-up: Decisions, Owners, and Delivery Blockers",
                "body": (
                    "Hello stakeholders,\n\n"
                    "Thank you for the readiness discussion. Key decisions and next actions are below.\n\n"
                    "Decisions:\n"
                    + "\n".join(f"- {item}" for item in analysis["decisions"])
                    + "\n\nAction items:\n"
                    + "\n".join(f"- {item['task']} - {item['owner']} - {item['deadline']}" for item in analysis["action_items"])
                    + "\n\nPlease reply with any changes to ownership or timing.\n"
                ),
            },
        ]

    def _stakeholders(self, transcript: str) -> list[str]:
        names = re.findall(r"^([A-Z][a-z]+(?:\s[A-Z][a-z]+)?):", transcript, flags=re.MULTILINE)
        fallback = ["Maya Chen", "Arun Patel", "Lina Gomez", "Program Owner"]
        return list(dict.fromkeys(names or fallback))
