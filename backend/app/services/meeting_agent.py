from app.database import record_agent_run
from app.schemas.meeting import MeetingRequest, MeetingResponse


class MeetingAgent:
    name = "MeetingAgent"

    def summarize(self, payload: MeetingRequest) -> MeetingResponse:
        transcript = payload.transcript.strip()
        topic_hint = "delivery readiness" if "delivery" in transcript.lower() else "learning operations"
        response = MeetingResponse(
            agent=self.name,
            summary=f"The discussion centered on {topic_hint}, facilitator preparedness, learner communications, and pending operational blockers. The team aligned on next steps and escalations needed before the next delivery checkpoint.",
            decisions=[
                "Prioritize learner roster validation before publishing the final schedule.",
                "Use the updated facilitator guide for the next cohort launch.",
                "Escalate missing assessment data to the program owner today.",
            ],
            action_items=[
                {"task": "Validate learner roster and attendance exceptions", "owner": "Maya", "deadline": "Today 15:00", "status": "Open"},
                {"task": "Send revised facilitator guide", "owner": "Arun", "deadline": "Tomorrow 10:00", "status": "Open"},
                {"task": "Confirm assessment data source", "owner": "Lina", "deadline": "Friday", "status": "At risk"},
            ],
            blockers=[
                "Incomplete learner attendance data from one regional team.",
                "Facilitator availability is still unconfirmed for the final session.",
            ],
            risks=[
                "Delayed roster validation could affect learner communications.",
                "Assessment reporting may slip if source data is not confirmed.",
            ],
        )
        record_agent_run(self.name, response.summary)
        return response
