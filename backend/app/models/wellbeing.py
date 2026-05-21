from sqlalchemy import Column, DateTime, Float, Integer, String, Text, func

from app.database import Base


class MoodLog(Base):
    __tablename__ = "mood_logs"

    id = Column(Integer, primary_key=True, index=True)
    mood = Column(String(40), nullable=False)
    note = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WellnessSession(Base):
    __tablename__ = "wellness_sessions"

    id = Column(Integer, primary_key=True, index=True)
    role = Column(String(80), default="Delivery Manager")
    recovery_mode = Column(Integer, default=0)
    briefing = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WellnessContext(Base):
    __tablename__ = "wellness_context"

    id = Column(Integer, primary_key=True, index=True)
    role = Column(String(80), default="Delivery Manager")
    mood = Column(String(40), default="Calm")
    workload_hours = Column(Integer, default=8)
    meetings_count = Column(Integer, default=0)
    overdue_tasks = Column(Integer, default=0)
    urgent_emails = Column(Integer, default=0)
    screen_time_hours = Column(Integer, default=0)
    inactivity_hours = Column(Integer, default=0)
    operational_activity = Column(Text, default="")
    recovery_mode = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class RecoverySession(Base):
    __tablename__ = "recovery_sessions"

    id = Column(Integer, primary_key=True, index=True)
    mood = Column(String(40), default="Calm")
    recovery_mode = Column(Integer, default=0)
    recovery_plan = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class HealingRecommendation(Base):
    __tablename__ = "healing_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    category = Column(String(80), default="Healing")
    recommendation = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WellnessTrend(Base):
    __tablename__ = "wellness_trends"

    id = Column(Integer, primary_key=True, index=True)
    trend_type = Column(String(80), default="Emotional Wellness")
    value = Column(String(120), default="")
    insight = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class RecoveryRecommendation(Base):
    __tablename__ = "recovery_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), default="")
    category = Column(String(80), default="Recovery")
    details = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class StressScore(Base):
    __tablename__ = "stress_scores"

    id = Column(Integer, primary_key=True, index=True)
    stress_level = Column(String(40), default="Moderate")
    score = Column(Float, default=50)
    burnout_risk = Column(String(40), default="Medium")
    workload_balance = Column(String(80), default="Balanced")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class WellnessActivity(Base):
    __tablename__ = "wellness_activities"

    id = Column(Integer, primary_key=True, index=True)
    activity_type = Column(String(80), default="Movement")
    title = Column(String(255), default="")
    details = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class GrowthRecommendation(Base):
    __tablename__ = "growth_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    role = Column(String(80), default="Delivery Manager")
    topic = Column(String(255), default="")
    recommendation = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class LearningInsight(Base):
    __tablename__ = "learning_insights"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), default="")
    explanation = Column(Text, default="")
    use_case = Column(Text, default="")
    resource = Column(String(255), default="")
    relevance = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class MotivationLog(Base):
    __tablename__ = "motivation_logs"

    id = Column(Integer, primary_key=True, index=True)
    message = Column(Text, default="")
    motivation_score = Column(Float, default=70)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
