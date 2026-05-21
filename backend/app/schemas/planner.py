from pydantic import BaseModel


class Task(BaseModel):
    title: str
    deadline: str
    priority: str
    status: str = "open"
    effort: int = 2


class Meeting(BaseModel):
    title: str
    time: str
    attendees: int


class CalendarEvent(BaseModel):
    title: str
    start: str
    end: str = ""
    location: str = ""
    description: str = ""
    urgency: str = "Normal"


class PlannerRequest(BaseModel):
    date: str
    tasks: list[Task]
    meetings: list[Meeting]
    calendar_url: str = ""


class PriorityItem(BaseModel):
    title: str
    priority: str
    rationale: str
    progress: int


class ScheduleBlock(BaseModel):
    time: str
    activity: str
    focus: str


class RiskAlert(BaseModel):
    level: str
    message: str


class PlannerResponse(BaseModel):
    agent: str
    executive_summary: str
    productivity_score: int
    priorities: list[PriorityItem]
    schedule: list[ScheduleBlock]
    risks: list[RiskAlert]
    recommendations: list[str]
    calendar_events: list[CalendarEvent] = []
    today_events: list[CalendarEvent] = []
    calendar_status: str = "Not connected"


class PlannerChatRequest(BaseModel):
    message: str
    date: str
    calendar_url: str = ""
    tasks: list[Task] = []
    meetings: list[Meeting] = []


class PlannerChatResponse(BaseModel):
    answer: str
    quick_actions: list[str] = []
    calendar_events: list[CalendarEvent] = []
    priorities: list[PriorityItem] = []
    quota_expired: bool = False
    upgrade_message: str = ""
