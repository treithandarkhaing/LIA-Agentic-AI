from pydantic import BaseModel


class WellnessRequest(BaseModel):
    workload_hours: int
    meetings_count: int
    overdue_tasks: int
    productivity_score: int
    urgent_emails: int = 0
    screen_time_hours: int = 7
    inactivity_hours: int = 3
    role: str = "Delivery Manager"
    mood: str = "Calm"
    recovery_mode: bool = False


class MoodCheckRequest(BaseModel):
    mood: str
    note: str = ""


class WellnessChatRequest(BaseModel):
    message: str
    mood: str = "Calm"
    role: str = "Delivery Manager"
    recovery_mode: bool = False
    workload_hours: int = 8
    meetings_count: int = 0
    overdue_tasks: int = 0
    urgent_emails: int = 0
    screen_time_hours: int = 7
    inactivity_hours: int = 2
    motivation_score: int = 70


class WellnessCard(BaseModel):
    title: str
    value: str
    insight: str


class VideoRecommendation(BaseModel):
    category: str
    title: str
    youtube_url: str
    reason: str


class LearningInsightCard(BaseModel):
    title: str
    explanation: str
    use_case: str
    resource: str
    relevance: str


class WellnessResponse(BaseModel):
    agent: str
    wellness_score: int
    stress_score: int
    motivation_score: int
    stress_level: str
    burnout_risk: str
    workload_balance: str
    meeting_fatigue: str
    emotional_wellness_trend: str
    recovery_mode_active: bool
    mood_response: str
    daily_briefing: str
    supportive_encouragement: str
    emotional_insights: list[str]
    wellness_insights: list[str]
    recovery_plan: list[str]
    recovery_recommendations: list[str]
    healing_actions: list[str]
    physical_recommendations: list[str]
    family_social_reminders: list[str]
    entertainment_happiness: list[str]
    motivation_messages: list[str]
    growth_recommendations: list[str]
    dashboard_cards: list[WellnessCard]
    videos: list[VideoRecommendation]
    learning_insight: LearningInsightCard
    chat_suggestions: list[str]


class WellnessChatResponse(BaseModel):
    message: str
    recovery_plan: list[str] = []
    healing_actions: list[str] = []
    category: str = "Emotional Wellness"


class MoodHistoryItem(BaseModel):
    date: str
    mood: str
    count: int


class MoodHistoryResponse(BaseModel):
    history: list[MoodHistoryItem]
