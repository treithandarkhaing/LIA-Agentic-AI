from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.database import Base


class Meeting(Base):
    __tablename__ = "meetings"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    meeting_title = Column(String(255), default="Operational Meeting Record")
    meeting_date = Column(String(80), default="")
    operational_category = Column(String(120), default="Operational Meeting Intelligence")
    source = Column(String(80), default="manual")
    source_type = Column(String(80), default="Transcript")
    source_url = Column(Text, default="")
    embed_code = Column(Text, default="")
    ingestion_method = Column(String(80), default="manual")
    platform_name = Column(String(120), default="Manual Transcript")
    ingestion_status = Column(String(80), default="ready")
    analysis_status = Column(String(80), default="pending")
    ai_status = Column(String(80), default="pending")
    delivery_status = Column(String(80), default="Awaiting AI Review")
    reports_generated = Column(Integer, default=0)
    stakeholder_emails = Column(Integer, default=0)
    transcript = Column(Text, nullable=False)
    summary = Column(Text, default="")
    decisions = Column(Text, default="[]")
    blockers = Column(Text, default="[]")
    risks = Column(Text, default="[]")
    deadlines = Column(Text, default="[]")
    stakeholders = Column(Text, default="[]")
    owners = Column(Text, default="[]")
    recommendations = Column(Text, default="[]")
    delivery_concerns = Column(Text, default="[]")
    stakeholder_followups = Column(Text, default="[]")
    next_meeting_preparation = Column(Text, default="[]")
    manager_summary = Column(Text, default="")
    status = Column(String(40), default="uploaded")
    analysis_timestamp = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    action_items = relationship("ActionItem", back_populates="meeting", cascade="all, delete-orphan")
    reports = relationship("GeneratedReport", back_populates="meeting", cascade="all, delete-orphan")
    emails = relationship("GeneratedEmail", back_populates="meeting", cascade="all, delete-orphan")


class ActionItem(Base):
    __tablename__ = "action_items"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False)
    task = Column(String(500), nullable=False)
    owner = Column(String(120), nullable=False)
    deadline = Column(String(120), nullable=False)
    priority = Column(String(40), default="Medium")
    status = Column(String(40), default="Pending")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    meeting = relationship("Meeting", back_populates="action_items")


class GeneratedReport(Base):
    __tablename__ = "generated_reports"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False)
    executive_summary = Column(Text, nullable=False)
    delivery_status = Column(Text, nullable=False)
    operational_concerns = Column(Text, nullable=False)
    recommended_actions = Column(Text, nullable=False)
    executive_operational_summary = Column(Text, default="")
    delivery_readiness_overview = Column(Text, default="")
    operational_risks_concerns = Column(Text, default="")
    facilitator_content_readiness = Column(Text, default="")
    assessment_lms_readiness = Column(Text, default="")
    stakeholder_coordination_updates = Column(Text, default="")
    recommended_next_actions = Column(Text, default="")
    next_meeting_focus_areas = Column(Text, default="")
    delivery_confidence = Column(String(40), default="Medium")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    meeting = relationship("Meeting", back_populates="reports")


class GeneratedEmail(Base):
    __tablename__ = "generated_emails"

    id = Column(Integer, primary_key=True, index=True)
    meeting_id = Column(Integer, ForeignKey("meetings.id"), nullable=False)
    email_type = Column(String(80), nullable=False)
    subject = Column(String(255), nullable=False)
    body = Column(Text, nullable=False)
    recipients = Column(Text, default="[]")
    sent_status = Column(String(40), default="draft")
    sent_at = Column(DateTime(timezone=True), nullable=True)
    send_error = Column(Text, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    meeting = relationship("Meeting", back_populates="emails")
