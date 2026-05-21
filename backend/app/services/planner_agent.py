from __future__ import annotations

from datetime import datetime
from pathlib import Path
from urllib.request import urlopen

from app.database import record_agent_run
from app.schemas.planner import CalendarEvent, PlannerChatRequest, PlannerChatResponse, PlannerRequest, PlannerResponse


class PlannerAgent:
    name = "LIA Planner Agentic AI"
    local_snapshot = Path(__file__).resolve().parents[2] / "planner_calendar_snapshot.ics"

    def generate(self, payload: PlannerRequest) -> PlannerResponse:
        all_events, today_events, calendar_status = self._calendar_events(payload.calendar_url, payload.date)
        urgent_tasks = sorted(
            payload.tasks,
            key=lambda task: (task.priority.lower() != "high", task.deadline),
        )
        workload_count = len(payload.meetings) + len(all_events)
        productivity_score = max(48, 94 - workload_count * 4 - len([t for t in payload.tasks if t.status == "overdue"]) * 9)

        priorities = [
            {
                "title": task.title,
                "priority": task.priority,
                "rationale": f"Deadline {task.deadline}; estimated effort {task.effort}h; delivery impact is high.",
                "progress": 25 if task.status == "open" else 8 if task.status == "overdue" else 70,
            }
            for task in urgent_tasks[:5]
        ]
        for event in all_events[:4]:
            if any(word in event.title.lower() for word in ["urgent", "review", "deadline", "delivery", "meeting", "sync"]):
                priorities.append(
                    {
                        "title": event.title,
                        "priority": event.urgency,
                        "rationale": f"Calendar event at {self._time_label(event.start)}; location {event.location or 'not specified'}.",
                        "progress": 20,
                    }
                )
        priorities = priorities[:6]

        response = PlannerResponse(
            agent=self.name,
            executive_summary=(
                f"LIA scan complete: {len(all_events)} total calendar item(s) loaded from Outlook — "
                f"{len(today_events)} item(s) are scheduled for today ({payload.date}). "
                f"{len(urgent_tasks)} manual task(s) and {len(payload.meetings)} meeting record(s) also reviewed."
            ),
            productivity_score=productivity_score,
            priorities=priorities,
            schedule=self._schedule(today_events if today_events else all_events),
            risks=[
                {"level": "High" if len(today_events) >= 6 else "Medium", "message": f"{len(today_events)} item(s) are in today's calendar — plan your focus time accordingly."},
                {"level": "Medium", "message": calendar_status},
            ],
            recommendations=[
                "Prepare the day by checking calendar commitments first, then protect one deep-work block.",
                "Resolve urgent calendar-linked tasks before low-impact admin work.",
                "Batch email responses around meetings instead of reacting all day.",
            ],
            calendar_events=all_events,
            today_events=today_events,
            calendar_status=calendar_status,
        )
        record_agent_run(self.name, response.executive_summary)
        return response

    def chat(self, payload: PlannerChatRequest) -> PlannerChatResponse:
        text = payload.message.lower().strip()
        all_events, today_events, status = self._calendar_events(payload.calendar_url, payload.date)
        if "hidden" in text and "task" in text:
            return PlannerChatResponse(
                answer=(
                    "🔒 Hidden Tasks are a Pro Plan feature.\n\n"
                    "Pro Plan unlocks:\n"
                    "• Deep-work hidden task intelligence (cross-calendar pattern analysis)\n"
                    "• Priority scoring across ALL calendar events, not just today\n"
                    "• AI-generated focus blocks around your hidden commitments\n"
                    "• Burnout risk prediction from hidden meeting overload\n\n"
                    "Upgrade to Pro Plan to reveal your hidden tasks and unlock full calendar intelligence."
                ),
                quick_actions=["Upgrade to Pro Plan", "Show Calendar Tasks", "Prepare My Day"],
                calendar_events=all_events,
                quota_expired=True,
                upgrade_message="Upgrade to Pro Plan to unlock Hidden Task intelligence and full calendar analysis.",
            )
        plan = self.generate(PlannerRequest(date=payload.date, tasks=payload.tasks, meetings=payload.meetings, calendar_url=payload.calendar_url))
        if "urgent" in text:
            answer = (
                f"Today urgent tasks: I found {len(plan.priorities)} priority item(s) for {payload.date}. "
                f"There are {len(today_events)} calendar event(s) scheduled today. "
                "Start with the highest-priority calendar event, then protect one focus block before noon."
            )
        elif "prepare" in text or "day" in text:
            answer = (
                f"Your day plan for {payload.date}: {len(today_events)} calendar event(s) today, "
                f"{len(all_events)} total in the Outlook feed. "
                f"Calendar status: {status} "
                "Protect a deep-work block before your first meeting and batch emails after lunch."
            )
        elif "calendar" in text:
            answer = (
                f"Outlook calendar loaded: {len(all_events)} total item(s) in the feed, "
                f"{len(today_events)} scheduled for today ({payload.date}). "
                "Scroll down to see Today's Tasks and the full Calendar Events list."
            )
        else:
            answer = "I can help with Prepare My Day, Today Urgent Tasks, Show Calendar Tasks, or Show Hidden Task (Pro Plan)."
        return PlannerChatResponse(
            answer=answer,
            quick_actions=["Prepare My Day", "Today Urgent Tasks", "Show Calendar Tasks", "Show Hidden Task"],
            calendar_events=all_events,
            priorities=plan.priorities,
        )

    def _schedule(self, events: list[CalendarEvent]) -> list[dict]:
        if events:
            blocks = [{"time": self._time_label(event.start), "activity": event.title, "focus": event.urgency} for event in events[:6]]
            blocks.append({"time": "Focus", "activity": "Protected follow-up block for urgent actions", "focus": "Deep Work"})
            return blocks
        return [
            {"time": "09:00", "activity": "LIA triage and delivery risk review", "focus": "Operations"},
            {"time": "10:00", "activity": "Deep work block: unblock highest priority course", "focus": "Learning delivery"},
            {"time": "13:30", "activity": "Stakeholder follow-up and action confirmation", "focus": "Communication"},
            {"time": "15:00", "activity": "Quality check and facilitator readiness review", "focus": "Governance"},
        ]

    def _calendar_events(self, calendar_url: str, date_text: str) -> tuple[list[CalendarEvent], list[CalendarEvent], str]:
        """Returns (all_events, today_events, status_message)."""
        if not calendar_url:
            return self._calendar_events_from_snapshot(date_text, "Calendar link not configured.")
        try:
            with urlopen(calendar_url, timeout=12) as response:
                raw = response.read().decode("utf-8", errors="ignore")
        except Exception as exc:
            return self._calendar_events_from_snapshot(date_text, f"Outlook calendar could not be loaded: {exc}")
        all_events = self._parse_ics(raw, None)   # fetch ALL events
        today_events = self._parse_ics(raw, date_text)  # today only
        status = f"Outlook calendar connected ✓  {len(all_events)} total event(s) fetched — {len(today_events)} scheduled for today ({date_text})."
        return all_events, today_events, status

    def _calendar_events_from_snapshot(self, date_text: str, error_message: str) -> tuple[list[CalendarEvent], list[CalendarEvent], str]:
        if not self.local_snapshot.exists():
            return [], [], error_message
        try:
            raw = self.local_snapshot.read_text(encoding="utf-8", errors="ignore")
        except OSError as exc:
            return [], [], f"{error_message} Local calendar snapshot could not be read: {exc}"
        all_events = self._parse_ics(raw, None)
        today_events = self._parse_ics(raw, date_text)
        status = f"{error_message} Local snapshot: {len(all_events)} total event(s), {len(today_events)} for today ({date_text})."
        return all_events, today_events, status

    def _parse_ics(self, raw: str, date_text: str | None) -> list[CalendarEvent]:
        """Parse ICS. Pass date_text=None to return ALL events (no date filter)."""
        target = date_text.replace("-", "") if date_text else None
        events = []
        for block in raw.split("BEGIN:VEVENT")[1:]:
            fields = self._ics_fields(block)
            start = fields.get("DTSTART", "")
            if target and not start.startswith(target):
                continue
            title = fields.get("SUMMARY", "Calendar Task")
            end = fields.get("DTEND", "")
            location = fields.get("LOCATION", "")
            description = fields.get("DESCRIPTION", "")
            urgency = "High" if any(word in f"{title} {description}".lower() for word in ["urgent", "deadline", "escalation", "review"]) else "Normal"
            events.append(CalendarEvent(title=title, start=start, end=end, location=location, description=description[:260], urgency=urgency))
        limit = 12 if target else 50
        return sorted(events, key=lambda event: event.start)[:limit]

    def _ics_fields(self, block: str) -> dict[str, str]:
        unfolded = block.replace("\r\n ", "").replace("\n ", "")
        fields = {}
        for line in unfolded.splitlines():
            if ":" not in line:
                continue
            key, value = line.split(":", 1)
            key = key.split(";", 1)[0].strip().upper()
            fields[key] = value.replace("\\n", " ").replace("\\,", ",").strip()
        return fields

    def _time_label(self, value: str) -> str:
        if "T" not in value:
            return value or "All day"
        try:
            parsed = datetime.strptime(value[:15], "%Y%m%dT%H%M%S")
            return parsed.strftime("%H:%M")
        except ValueError:
            return value[9:13] if len(value) >= 13 else value
