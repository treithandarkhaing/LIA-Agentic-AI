from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.database import Base


class LearningProduct(Base):
    __tablename__ = "learning_products"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    course_name = Column(String(255), default="")
    learner_level = Column(String(80), default="Basic")
    module_code = Column(String(40), default="")
    product_plan_name = Column(String(255), default="")
    product_plan_text = Column(Text, default="")
    module_structure = Column(Text, default="")
    learning_outcomes = Column(Text, default="")
    total_learning_hours = Column(Float, default=60.5)
    delivery_modes = Column(String(255), default="Self-paced, document-led adaptive learning")
    audience_profile = Column(String(255), default="Beginner self-paced learners")
    complexity_level = Column(String(80), default="Beginner")
    readiness_status = Column(String(80), default="Production Blueprint Ready")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    instruction_units = relationship("InstructionUnit", back_populates="product", cascade="all, delete-orphan")
    project_brief = relationship("ProjectBrief", back_populates="product", cascade="all, delete-orphan", uselist=False)


class ProductPlan(Base):
    __tablename__ = "product_plans"

    id = Column(Integer, primary_key=True, index=True)
    course_name = Column(String(255), default="")
    learner_level = Column(String(80), default="Basic")
    source_filename = Column(String(255), default="")
    extracted_text = Column(Text, default="")
    learning_outcomes = Column(Text, default="")
    delivery_modes = Column(String(255), default="")
    total_learning_hours = Column(Float, default=60.5)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Module(Base):
    __tablename__ = "modules"

    id = Column(Integer, primary_key=True, index=True)
    product_plan_id = Column(Integer, ForeignKey("product_plans.id"), nullable=True)
    module_code = Column(String(40), default="M01")
    module_name = Column(String(255), default="")
    module_hours = Column(Float, default=60.5)


class KnowledgeTopic(Base):
    __tablename__ = "knowledge_topics"

    id = Column(Integer, primary_key=True, index=True)
    instruction_unit_id = Column(Integer, ForeignKey("instruction_units.id"), nullable=True)
    topic_code = Column(String(40), default="")
    topic_title = Column(String(255), default="")
    description = Column(Text, default="")
    asset_type = Column(String(80), default="Instructional Content Text")


class IUBreakdown(Base):
    __tablename__ = "iu_breakdowns"

    id = Column(Integer, primary_key=True, index=True)
    instruction_unit_id = Column(Integer, ForeignKey("instruction_units.id"), nullable=True)
    iu_code = Column(String(40), default="")
    iu_title = Column(String(255), default="")
    module_code = Column(String(40), default="")
    module_name = Column(String(255), default="")
    learning_goal = Column(Text, default="")
    learner_level = Column(String(80), default="Beginner")
    delivery_mode = Column(String(255), default="Self-paced document-led adaptive learning")
    complexity_indicator = Column(String(80), default="Beginner")
    estimated_hours = Column(Float, default=0)
    source = Column(String(80), default="OpenAI Product Plan Intelligence")
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class InstructionalTopic(Base):
    __tablename__ = "instructional_topics"

    id = Column(Integer, primary_key=True, index=True)
    instruction_unit_id = Column(Integer, ForeignKey("instruction_units.id"), nullable=True)
    topic_code = Column(String(40), default="")
    topic_title = Column(String(255), default="")
    description = Column(Text, default="")
    section = Column(String(80), default="Knowledge")
    asset_type = Column(String(120), default="Instructional Content Text")


class PPTTopic(Base):
    __tablename__ = "ppt_topics"

    id = Column(Integer, primary_key=True, index=True)
    instruction_unit_id = Column(Integer, ForeignKey("instruction_units.id"), nullable=True)
    topic_code = Column(String(40), default="")
    topic_title = Column(String(255), default="")
    description = Column(Text, default="")


class KnowledgeDocument(Base):
    __tablename__ = "knowledge_documents"

    id = Column(Integer, primary_key=True, index=True)
    instruction_unit_id = Column(Integer, ForeignKey("instruction_units.id"), nullable=True)
    topic_code = Column(String(40), default="")
    topic_title = Column(String(255), default="")
    description = Column(Text, default="")


class KnowledgePPTTopic(Base):
    __tablename__ = "knowledge_ppt_topics"

    id = Column(Integer, primary_key=True, index=True)
    instruction_unit_id = Column(Integer, ForeignKey("instruction_units.id"), nullable=True)
    topic_code = Column(String(40), default="")
    topic_title = Column(String(255), default="")
    description = Column(Text, default="")


class KnowledgeVideoTopic(Base):
    __tablename__ = "knowledge_video_topics"

    id = Column(Integer, primary_key=True, index=True)
    instruction_unit_id = Column(Integer, ForeignKey("instruction_units.id"), nullable=True)
    topic_code = Column(String(40), default="")
    topic_title = Column(String(255), default="")
    description = Column(Text, default="")


class VideoTopic(Base):
    __tablename__ = "video_topics"

    id = Column(Integer, primary_key=True, index=True)
    instruction_unit_id = Column(Integer, ForeignKey("instruction_units.id"), nullable=True)
    topic_code = Column(String(40), default="")
    topic_title = Column(String(255), default="")
    description = Column(Text, default="")


class SkillsActivity(Base):
    __tablename__ = "skills_activities"

    id = Column(Integer, primary_key=True, index=True)
    instruction_unit_id = Column(Integer, ForeignKey("instruction_units.id"), nullable=True)
    activity_code = Column(String(40), default="")
    activity_title = Column(String(255), default="")
    description = Column(Text, default="")
    activity_type = Column(String(80), default="Practice Activity")


class LearningActivity(Base):
    __tablename__ = "learning_activities"

    id = Column(Integer, primary_key=True, index=True)
    instruction_unit_id = Column(Integer, ForeignKey("instruction_units.id"), nullable=True)
    activity_code = Column(String(40), default="")
    activity_title = Column(String(255), default="")
    description = Column(Text, default="")
    activity_type = Column(String(80), default="E-learning Activity")


class CaseStudy(Base):
    __tablename__ = "case_studies"

    id = Column(Integer, primary_key=True, index=True)
    instruction_unit_id = Column(Integer, ForeignKey("instruction_units.id"), nullable=True)
    case_code = Column(String(40), default="")
    case_title = Column(String(255), default="")
    description = Column(Text, default="")


class CaseStudyDocument(Base):
    __tablename__ = "case_study_documents"

    id = Column(Integer, primary_key=True, index=True)
    instruction_unit_id = Column(Integer, ForeignKey("instruction_units.id"), nullable=True)
    case_code = Column(String(40), default="")
    case_title = Column(String(255), default="")
    description = Column(Text, default="")


class CaseStudyPPTTopic(Base):
    __tablename__ = "case_study_ppt_topics"

    id = Column(Integer, primary_key=True, index=True)
    instruction_unit_id = Column(Integer, ForeignKey("instruction_units.id"), nullable=True)
    topic_code = Column(String(40), default="")
    topic_title = Column(String(255), default="")
    description = Column(Text, default="")


class CaseStudyVideoTopic(Base):
    __tablename__ = "case_study_video_topics"

    id = Column(Integer, primary_key=True, index=True)
    instruction_unit_id = Column(Integer, ForeignKey("instruction_units.id"), nullable=True)
    topic_code = Column(String(40), default="")
    topic_title = Column(String(255), default="")
    description = Column(Text, default="")


class CaseStudyAssignment(Base):
    __tablename__ = "case_study_assignments"

    id = Column(Integer, primary_key=True, index=True)
    instruction_unit_id = Column(Integer, ForeignKey("instruction_units.id"), nullable=True)
    assignment_code = Column(String(40), default="")
    assignment_title = Column(String(255), default="")
    description = Column(Text, default="")


class MCQAssessment(Base):
    __tablename__ = "mcq_assessments"

    id = Column(Integer, primary_key=True, index=True)
    instruction_unit_id = Column(Integer, ForeignKey("instruction_units.id"), nullable=True)
    assessment_code = Column(String(40), default="")
    assessment_title = Column(String(255), default="")
    description = Column(Text, default="")


class PracticalEvaluation(Base):
    __tablename__ = "practical_evaluations"

    id = Column(Integer, primary_key=True, index=True)
    instruction_unit_id = Column(Integer, ForeignKey("instruction_units.id"), nullable=True)
    evaluation_code = Column(String(40), default="")
    evaluation_title = Column(String(255), default="")
    description = Column(Text, default="")


class KnowledgeCheck(Base):
    __tablename__ = "knowledge_checks"

    id = Column(Integer, primary_key=True, index=True)
    instruction_unit_id = Column(Integer, ForeignKey("instruction_units.id"), nullable=True)
    check_code = Column(String(40), default="")
    check_title = Column(String(255), default="")
    description = Column(Text, default="")


class AssessmentAssignment(Base):
    __tablename__ = "assessment_assignments"

    id = Column(Integer, primary_key=True, index=True)
    instruction_unit_id = Column(Integer, ForeignKey("instruction_units.id"), nullable=True)
    assignment_code = Column(String(40), default="")
    assignment_title = Column(String(255), default="")
    description = Column(Text, default="")


class MarkingRubric(Base):
    __tablename__ = "marking_rubrics"

    id = Column(Integer, primary_key=True, index=True)
    instruction_unit_id = Column(Integer, ForeignKey("instruction_units.id"), nullable=True)
    rubric_code = Column(String(40), default="")
    rubric_title = Column(String(255), default="")
    description = Column(Text, default="")


class InstructionUnit(Base):
    __tablename__ = "instruction_units"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("learning_products.id"), nullable=False)
    iu_code = Column(String(20), nullable=False)
    title = Column(String(255), nullable=False)
    adaptive_focus = Column(String(255), nullable=False)
    estimated_hours = Column(Float, default=10)
    complexity_indicator = Column(String(80), default="Foundational")
    learning_goal = Column(Text, default="")

    product = relationship("LearningProduct", back_populates="instruction_units")
    blueprint = relationship("ContentBlueprint", back_populates="instruction_unit", cascade="all, delete-orphan", uselist=False)
    assessments = relationship("Assessment", back_populates="instruction_unit", cascade="all, delete-orphan")


class ContentBlueprint(Base):
    __tablename__ = "content_blueprints"

    id = Column(Integer, primary_key=True, index=True)
    instruction_unit_id = Column(Integer, ForeignKey("instruction_units.id"), nullable=False)
    knowledge_instructional_text = Column(Text, default="[]")
    ppt_content_topics = Column(Text, default="[]")
    ppt_video_topics = Column(Text, default="[]")
    elearning_activities = Column(Text, default="[]")
    case_study_text = Column(Text, default="")
    case_study_ppt_video_topics = Column(Text, default="[]")
    case_study_assignments = Column(Text, default="[]")
    production_estimate = Column(String(120), default="")
    readiness_insight = Column(Text, default="")

    instruction_unit = relationship("InstructionUnit", back_populates="blueprint")


class Assessment(Base):
    __tablename__ = "assessments"

    id = Column(Integer, primary_key=True, index=True)
    instruction_unit_id = Column(Integer, ForeignKey("instruction_units.id"), nullable=False)
    mcqs = Column(Text, default="[]")
    quizzes = Column(Text, default="[]")
    focus_areas = Column(Text, default="[]")
    assignments = Column(Text, default="[]")
    evaluation_objectives = Column(Text, default="[]")
    alignment_check = Column(Text, default="")

    instruction_unit = relationship("InstructionUnit", back_populates="assessments")


class ProjectBrief(Base):
    __tablename__ = "project_briefs"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("learning_products.id"), nullable=False)
    project_brief = Column(Text, default="")
    capstone_scenario = Column(Text, default="")
    project_deliverables = Column(Text, default="[]")
    presentation_outline = Column(Text, default="[]")
    evaluation_criteria = Column(Text, default="[]")

    product = relationship("LearningProduct", back_populates="project_brief")


class ContentAssignment(Base):
    __tablename__ = "content_assignments"

    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("learning_products.id"), nullable=False)
    instruction_unit_id = Column(Integer, ForeignKey("instruction_units.id"), nullable=True)
    iu_code = Column(String(40), default="")
    iu_title = Column(String(255), default="")
    asset_type = Column(String(120), default="")
    topic_code = Column(String(40), default="")
    topic_title = Column(String(255), default="")
    owner = Column(String(120), default="")
    owner_email = Column(String(255), default="")
    start_date = Column(String(40), default="")
    deadline = Column(String(40), default="")
    status = Column(String(40), default="Pending")
    email_status = Column(String(80), default="Not Sent")
    email_sent_at = Column(String(80), default="")
    reminder_sent_at = Column(String(80), default="")
