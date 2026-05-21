from pydantic import BaseModel


class LearningRequest(BaseModel):
    topic: str
    audience_level: str
    duration: str


class QuizQuestion(BaseModel):
    question: str
    options: list[str]
    answer: str


class LearningResponse(BaseModel):
    agent: str
    title: str
    overview: str
    objectives: list[str]
    lesson_plan: list[str]
    facilitator_guide: list[str]
    activities: list[str]
    assessments: list[str]
    quiz: list[QuizQuestion]


class ProductPlanRequest(BaseModel):
    title: str = ""
    module_code: str = ""
    course_name: str = ""
    learner_level: str = ""
    module_structure: str = ""
    learning_outcomes: str = ""
    total_learning_hours: float = 0
    delivery_modes: str = ""
    product_plan_text: str = ""


class ContentBlueprintSchema(BaseModel):
    knowledge_instructional_text: list[str]
    learning_sequence: list[str] = []
    glossary_concepts: list[str] = []
    ppt_content_topics: list[str]
    ppt_visual_flow: list[str] = []
    ppt_video_topics: list[str]
    video_demo_ideas: list[str] = []
    elearning_activities: list[str]
    case_study_text: str
    case_study_ppt_video_topics: list[str]
    case_study_assignments: list[str]
    adaptive_learning_support: list[str] = []
    production_effort: dict[str, str] = {}
    learning_outcome_alignment: list[str] = []
    production_estimate: str
    readiness_insight: str


class ProductionTopic(BaseModel):
    code: str
    title: str
    description: str


class KnowledgeBlueprint(BaseModel):
    instructional_content_text: list[ProductionTopic] = []
    ppt_text: list[ProductionTopic] = []
    ppt_videos_podcast: list[ProductionTopic] = []
    e_learning: list[ProductionTopic] = []
    guided_examples: list[ProductionTopic] = []
    learning_activities: list[ProductionTopic] = []


class SkillsBlueprint(BaseModel):
    practice_activities: list[ProductionTopic] = []
    labs: list[ProductionTopic] = []
    guided_tasks: list[ProductionTopic] = []
    mini_projects: list[ProductionTopic] = []
    case_study_word_document: list[ProductionTopic] = []
    case_study_ppt: list[ProductionTopic] = []
    case_study_demo_videos: list[ProductionTopic] = []
    case_study_assignment: list[ProductionTopic] = []


class AssessmentProductionBlueprint(BaseModel):
    mcq_topics: list[ProductionTopic] = []
    assignments: list[ProductionTopic] = []
    case_studies: list[ProductionTopic] = []
    evaluation_criteria: list[ProductionTopic] = []
    mcq_assessment: list[ProductionTopic] = []
    quiz: list[ProductionTopic] = []
    assessment_assignment: list[ProductionTopic] = []
    marking_rubrics: list[ProductionTopic] = []


class AssessmentBlueprint(BaseModel):
    mcqs: list[str]
    focus_areas: list[str] = []
    quizzes: list[str] = []
    assignments: list[str]
    evaluation_objectives: list[str] = []
    alignment_check: str


class InstructionUnitBlueprint(BaseModel):
    iu_code: str
    title: str
    module_code: str = ""
    module_name: str = ""
    adaptive_focus: str
    estimated_hours: float
    complexity_indicator: str
    delivery_mode: str = "Self-paced document-led adaptive learning"
    learning_goal: str
    knowledge: KnowledgeBlueprint = KnowledgeBlueprint()
    skills: SkillsBlueprint = SkillsBlueprint()
    assessment_blueprint: AssessmentProductionBlueprint = AssessmentProductionBlueprint()
    blueprint: ContentBlueprintSchema
    assessment: AssessmentBlueprint


class ProjectBriefBlueprint(BaseModel):
    project_brief: str
    capstone_scenario: str
    project_deliverables: list[str]
    presentation_outline: list[str]
    evaluation_criteria: list[str]


class AdaptiveLearningBlueprintResponse(BaseModel):
    id: int | None = None
    agent: str = "LIA Content Agentic AI"
    title: str
    subtitle: str = "Adaptive Learning Content Intelligence Platform"
    module_code: str = ""
    course_name: str = ""
    audience_profile: str
    total_learning_hours: float
    delivery_modes: str
    curriculum_analysis: list[str]
    adaptive_learning_recommendations: list[str]
    complexity_indicators: list[str]
    assessment_alignment_checks: list[str]
    content_production_estimation: list[str]
    delivery_readiness_insights: list[str]
    instruction_units: list[InstructionUnitBlueprint]
    project_brief: ProjectBriefBlueprint


class LearningContentChatRequest(BaseModel):
    product_id: int
    question: str


class LearningContentChatResponse(BaseModel):
    answer: str
    suggested_actions: list[str] = []
    confidence: str = "Medium"
    fetched_iu: InstructionUnitBlueprint | None = None
