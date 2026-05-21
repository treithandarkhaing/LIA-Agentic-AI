from __future__ import annotations

import json
import os
import time
from typing import Any

from dotenv import load_dotenv
from openai import APIConnectionError, APITimeoutError, OpenAI, RateLimitError

from app.database import record_agent_run
from app.schemas.learning import (
    AdaptiveLearningBlueprintResponse,
    AssessmentBlueprint,
    AssessmentProductionBlueprint,
    ContentBlueprintSchema,
    InstructionUnitBlueprint,
    KnowledgeBlueprint,
    LearningRequest,
    LearningResponse,
    ProductPlanRequest,
    ProductionTopic,
    ProjectBriefBlueprint,
    SkillsBlueprint,
)


load_dotenv()


class LearningAgent:
    name = "LearningAgent"

    def generate(self, payload: LearningRequest) -> LearningResponse:
        topic = payload.topic.strip() or "AI productivity"
        response = LearningResponse(
            agent=self.name,
            title=f"{topic}: {payload.duration} Learning Sprint",
            overview=f"A practical {payload.audience_level.lower()}-level learning experience that blends concepts, demonstration, guided practice, and operational application.",
            objectives=[
                f"Explain the core principles of {topic}.",
                "Apply the workflow to a realistic learning delivery scenario.",
                "Identify operational risks and quality checks.",
                "Create a short action plan for post-session implementation.",
            ],
            lesson_plan=[
                "Opening scenario and learner pulse check - 10 min",
                "Concept walkthrough with facilitator demo - 20 min",
                "Small group practice using a delivery operations case - 25 min",
                "Debrief, knowledge check, and transfer plan - 15 min",
            ],
            facilitator_guide=[
                "Begin with a practical story from delivery operations.",
                "Use questions before explanations to surface learner experience.",
                "Keep examples tied to schedule, quality, learner impact, and stakeholder confidence.",
                "Close each section with one decision learners can reuse immediately.",
            ],
            activities=[
                "Priority mapping exercise using urgent course launch tasks.",
                "Role-play stakeholder escalation for an at-risk delivery.",
                "Rapid quiz review with peer explanations.",
            ],
            assessments=[
                "Five-question scenario quiz.",
                "Group presentation of an improved delivery workflow.",
                "Individual commitment card with one measurable behavior change.",
            ],
            quiz=[
                {
                    "question": f"What is the strongest first step when applying {topic} to delivery operations?",
                    "options": ["Automate everything", "Clarify the outcome and constraints", "Skip stakeholder input", "Extend the deadline"],
                    "answer": "Clarify the outcome and constraints",
                },
                {
                    "question": "Which signal best indicates delivery risk?",
                    "options": ["High meeting count", "Missing owner and deadline", "Beautiful slide design", "Longer lesson title"],
                    "answer": "Missing owner and deadline",
                },
            ],
        )
        record_agent_run(self.name, response.overview)
        return response


class LIAContentAgent:
    name = "LIA Content Agentic AI"
    model = "gpt-4o-mini"
    last_error = ""
    timeout_seconds = 180.0
    retry_attempts = 3
    retry_delay_seconds = 1.2

    def generate_blueprint(self, payload: ProductPlanRequest, product_id: int | None = None, require_ai: bool = False) -> AdaptiveLearningBlueprintResponse:
        ai_response = self._generate_with_openai(payload, product_id)
        if ai_response:
            return ai_response
        detail = f" Detail: {self.last_error}" if self.last_error else ""
        raise RuntimeError(f"OpenAI could not generate a real IU production blueprint from the uploaded Product Plan.{detail}")

    def analyze_curriculum(self, payload: ProductPlanRequest, product_id: int | None = None) -> AdaptiveLearningBlueprintResponse:
        self.last_error = ""
        api_key = (os.getenv("OPENAI_API_KEY") or "").strip().strip('"').strip("'")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is missing in backend/.env.")
        try:
            client = OpenAI(api_key=api_key, timeout=self.timeout_seconds, max_retries=2)
            flow = self._flow_from_module_structure(payload.module_structure)
            if len(flow) < 5:
                flow = self._extract_iu_flow_with_openai(client, payload)
            if len(flow) < 5:
                raise ValueError("OpenAI could not detect five Instruction Units from the uploaded Product Plan.")
            total_hours = max(float(payload.total_learning_hours or 0), 0)
            hours = self._distribute_hours(total_hours) if total_hours > 0 else [0, 0, 0, 0, 0]
            outcomes = self._split_lines(payload.learning_outcomes)
            title = payload.title.strip() or payload.course_name or self._infer_title(payload.product_plan_text)
            units = [
                self._empty_iu_blueprint(
                    code=f"IU{self._unit_number(code):02d}",
                    title=unit_title,
                    focus=focus,
                    complexity=complexity,
                    hours=round(hours[index], 1),
                    outcome=outcomes[index % len(outcomes)] if outcomes else "",
                    payload=payload,
                )
                for index, (code, unit_title, focus, complexity) in enumerate(flow[:5])
            ]
            return AdaptiveLearningBlueprintResponse(
                id=product_id,
                title=title,
                subtitle=payload.course_name or "Adaptive Learning Content Intelligence Platform",
                module_code=payload.module_code or "",
                course_name=payload.course_name or "",
                audience_profile=self._audience_profile(payload),
                total_learning_hours=round(total_hours, 1),
                delivery_modes=payload.delivery_modes,
                curriculum_analysis=[
                    f"LIA analyzed the uploaded Product Plan and detected {len(units)} Instruction Units.",
                    "IU production blueprints are generated on demand from the IU Breakdown Viewer to keep each AI call focused and reliable.",
                    "Each IU will be generated using the extracted Product Plan context, learner type, delivery mode, and learning outcomes.",
                ],
                adaptive_learning_recommendations=[
                    "Fetch one IU at a time for focused production-ready outputs.",
                    "Review the extracted IU sequence before generating detailed assets.",
                    "Use the generated IU folders as the working structure for content, PPT, video, case study, and assessment teams.",
                ],
                complexity_indicators=[
                    f"Learner type detected: {payload.learner_level or 'Not specified'}.",
                    f"Total learning hours detected: {round(total_hours, 1) if total_hours else 'Not specified'}.",
                    "Complexity labels are extracted or inferred from the uploaded Product Plan.",
                ],
                assessment_alignment_checks=[
                    "Detailed assessment alignment will populate as each IU blueprint is fetched.",
                    "MCQ, practical evaluation, and final knowledge checks are generated per IU.",
                ],
                content_production_estimation=[
                    "Instructional Context Text: 3 hours per IU for Word/PDF-ready beginner guidance.",
                    "PPT Development: maximum 2 hours for a 20-25 slide deck.",
                    "PPT Video: 30-45 minutes for a 20-25 slide walkthrough; demo video screen recording and editing: maximum 1 hour for a 5-10 minute demo.",
                ],
                delivery_readiness_insights=[
                    "Curriculum review is complete. IU production can now proceed one unit at a time.",
                    "Generate the highest-priority IU first if content production time is limited.",
                ],
                instruction_units=units,
                project_brief=self._project_brief(title, self._theme(f"{payload.course_name} {title}", payload.product_plan_text), outcomes),
            )
        except (APITimeoutError, APIConnectionError) as exc:
            self.last_error = str(exc)
            return self._build_degraded_curriculum_preview(payload, product_id, str(exc))
        except RateLimitError as exc:
            self.last_error = str(exc)
            raise RuntimeError("OpenAI rate limit or quota was reached during curriculum analysis. Please retry shortly.") from exc
        except Exception as exc:
            self.last_error = str(exc)
            return self._build_degraded_curriculum_preview(payload, product_id, str(exc))

    def _build_degraded_curriculum_preview(
        self,
        payload: ProductPlanRequest,
        product_id: int | None,
        error_detail: str,
    ) -> AdaptiveLearningBlueprintResponse:
        flow = self._flow_from_module_structure(payload.module_structure)
        if len(flow) < 5:
            flow = self._fallback_flow(payload)
        total_hours = max(float(payload.total_learning_hours or 0), 0)
        hours = self._distribute_hours(total_hours) if total_hours > 0 else [0, 0, 0, 0, 0]
        outcomes = self._split_lines(payload.learning_outcomes)
        title = payload.title.strip() or payload.course_name or self._infer_title(payload.product_plan_text)
        units = [
            self._empty_iu_blueprint(
                code=f"IU{self._unit_number(code):02d}",
                title=unit_title,
                focus=focus,
                complexity=complexity,
                hours=round(hours[index], 1),
                outcome=outcomes[index % len(outcomes)] if outcomes else "",
                payload=payload,
            )
            for index, (code, unit_title, focus, complexity) in enumerate(flow[:5])
        ]
        return AdaptiveLearningBlueprintResponse(
            id=product_id,
            title=title,
            subtitle=payload.course_name or "Adaptive Learning Content Intelligence Platform",
            module_code=payload.module_code or "",
            course_name=payload.course_name or "",
            audience_profile=self._audience_profile(payload),
            total_learning_hours=round(total_hours, 1),
            delivery_modes=payload.delivery_modes,
            curriculum_analysis=[
                f"LIA parsed the uploaded Product Plan and prepared {len(units)} instruction units.",
                "OpenAI connection was unstable, so this preview used local curriculum extraction mode.",
                "You can still fetch IU blueprints; retry later for fully AI-enhanced extraction quality.",
            ],
            adaptive_learning_recommendations=[
                "Proceed with IU-by-IU generation while network stabilizes.",
                "Retry Analyze Curriculum later to refresh module intelligence with full OpenAI extraction.",
                "Validate IU naming and sequence before assigning production tasks.",
            ],
            complexity_indicators=[
                f"Learner type detected: {payload.learner_level or 'Not specified'}.",
                f"Total learning hours detected: {round(total_hours, 1) if total_hours else 'Not specified'}.",
                f"Connection note: {error_detail}",
            ],
            assessment_alignment_checks=[
                "Detailed assessment alignment will populate as each IU blueprint is fetched.",
                "MCQ, practical evaluation, and final knowledge checks are generated per IU.",
            ],
            content_production_estimation=[
                "Instructional Context Text: 3 hours per IU for Word/PDF-ready beginner guidance.",
                "PPT Development: maximum 2 hours for a 20-25 slide deck.",
                "PPT Video: 30-45 minutes for a 20-25 slide walkthrough; demo video screen recording and editing: maximum 1 hour for a 5-10 minute demo.",
            ],
            delivery_readiness_insights=[
                "Degraded-mode curriculum review is ready. IU generation can continue.",
                "Re-run curriculum analysis later when OpenAI connectivity improves.",
            ],
            instruction_units=units,
            project_brief=self._project_brief(title, self._theme(f"{payload.course_name} {title}", payload.product_plan_text), outcomes),
        )

    def _fallback_flow(self, payload: ProductPlanRequest) -> list[tuple[str, str, str, str]]:
        titles = [
            "Foundations and Terminology",
            "Guided Practice",
            "Hands-on Application",
            "Case Study Scenarios",
            "Integration and Assessment Readiness",
        ]
        complexity = ["Foundational", "Supported Practice", "Applied", "Scenario-Based", "Integrative"]
        focus = [
            "Build foundational understanding with beginner-friendly concepts and examples.",
            "Guide learners through structured practice before independent work.",
            "Move learners into hands-on workplace application tasks.",
            "Apply concepts through realistic case study and scenario work.",
            "Integrate skills and prepare learners for assessment submission.",
        ]
        parsed = self._split_lines(payload.learning_outcomes)
        if parsed:
            titles = [(line[:90].strip(" -.") or fallback) for line, fallback in zip((parsed + titles), titles)][:5]
        return [(f"IU{idx+1:02d}", titles[idx], focus[idx], complexity[idx]) for idx in range(5)]

    def generate_iu_blueprint(self, payload: ProductPlanRequest, unit: InstructionUnitBlueprint) -> InstructionUnitBlueprint:
        self.last_error = ""
        api_key = (os.getenv("OPENAI_API_KEY") or "").strip().strip('"').strip("'")
        if not api_key:
            raise RuntimeError("OPENAI_API_KEY is missing in backend/.env.")
        try:
            client = OpenAI(api_key=api_key, timeout=self.timeout_seconds, max_retries=2)
            raw_unit = self._generate_single_iu_with_openai(
                client=client,
                payload=payload,
                code=unit.iu_code,
                title=unit.title,
                focus=unit.adaptive_focus,
                complexity=unit.complexity_indicator,
                hours=unit.estimated_hours,
                outcome=unit.learning_goal,
            )
            return self._normalize_ai_unit(raw_unit, self._unit_number(unit.iu_code) - 1, float(payload.total_learning_hours or 0), payload)
        except Exception as exc:
            self.last_error = str(exc)
            fallback_unit = self._empty_iu_blueprint(
                code=unit.iu_code,
                title=unit.title,
                focus=unit.adaptive_focus,
                complexity=unit.complexity_indicator,
                hours=unit.estimated_hours,
                outcome=unit.learning_goal,
                payload=payload,
            )
            fallback_unit.blueprint.readiness_insight = (
                f"Network fallback mode: OpenAI generation was unavailable for {unit.iu_code}. "
                "You can continue production with this structured starter blueprint and retry later."
            )
            return fallback_unit

    def _generate_with_openai(self, payload: ProductPlanRequest, product_id: int | None) -> AdaptiveLearningBlueprintResponse | None:
        self.last_error = ""
        api_key = (os.getenv("OPENAI_API_KEY") or "").strip().strip('"').strip("'")
        if not api_key:
            self.last_error = "OPENAI_API_KEY is missing in backend/.env."
            return None
        try:
            client = OpenAI(api_key=api_key, timeout=75.0, max_retries=1)
            flow = self._flow_from_module_structure(payload.module_structure)
            if len(flow) < 5:
                flow = self._extract_iu_flow_with_openai(client, payload)
            if len(flow) < 5:
                raise ValueError("OpenAI could not detect five Instruction Units from the uploaded Product Plan.")
            total_hours = max(float(payload.total_learning_hours or 0), 0)
            hours = self._distribute_hours(total_hours) if total_hours > 0 else [0, 0, 0, 0, 0]
            outcomes = self._split_lines(payload.learning_outcomes)
            units = []
            for index, (code, title, focus, complexity) in enumerate(flow[:5]):
                raw_unit = self._generate_single_iu_with_openai(
                    client=client,
                    payload=payload,
                    code=f"IU{self._unit_number(code):02d}",
                    title=title,
                    focus=focus,
                    complexity=complexity,
                    hours=round(hours[index], 1),
                    outcome=outcomes[index % len(outcomes)] if outcomes else f"Complete {title} outcomes independently.",
                )
                units.append(self._normalize_ai_unit(raw_unit, index, total_hours, payload))

            title = payload.title.strip() or payload.course_name or self._infer_title(payload.product_plan_text)
            project = self._project_brief(title, self._theme(f"{payload.course_name} {title}", payload.product_plan_text), outcomes)
            return AdaptiveLearningBlueprintResponse(
                id=product_id,
                title=title,
                subtitle=payload.course_name or "Adaptive Learning Content Intelligence Platform",
                module_code=payload.module_code or "",
                course_name=payload.course_name or "",
                audience_profile=f"{payload.learner_level} self-paced learners for {payload.course_name}, with document-led instructor-style guidance and limited mentor dependency",
                total_learning_hours=round(total_hours, 1),
                delivery_modes=payload.delivery_modes,
                curriculum_analysis=[
                    f"LIA extracted {len(units)} instruction units from the Product Plan and generated each IU blueprint through separate OpenAI calls.",
                    f"The module structure is production-planned for {payload.learner_level.lower()} learners using {payload.delivery_modes.lower()} delivery.",
                    "The IU workflow separates Knowledge, Skills, and Assessment assets to match Learning & Delivery production operations.",
                ],
                adaptive_learning_recommendations=[
                    "Keep each document page short, with concept, example, learner action, and self-check sections.",
                    "Use case study assets as guided practice before learners attempt practical evaluation tasks.",
                    "Add progression checkpoints at the end of every IU to support learners without live mentor dependency.",
                ],
                complexity_indicators=[
                    f"Total learning hours detected from Product Plan: {round(total_hours, 1) if total_hours else 'Not specified'}.",
                    "IU complexity increases progressively from foundation topics to applied case study and assessment readiness.",
                    "Beginner cognitive load is managed through small production assets and repeated guided examples.",
                ],
                assessment_alignment_checks=[
                    "MCQ topics validate terminology and conceptual understanding.",
                    "Practical evaluations validate hands-on production capability.",
                    "Final knowledge checks confirm readiness before learners progress to the next IU.",
                ],
                content_production_estimation=[
                    f"Production scope: {len(units)} IUs with Knowledge, Skills, and Assessment folders.",
                    "Recommended production order: Word/PDF instructional text, PPT content, videos, e-learning, case assets, assessments.",
                    "QA should verify beginner readability, sequencing, asset consistency, and assessment alignment.",
                ],
                delivery_readiness_insights=[
                    "Blueprint is ready for content team review after SME validation of topic scope.",
                    "Delivery risk is reduced by generating each IU as a separate, smaller AI production unit.",
                    "Self-paced learners need visible examples, short instructions, and clear submission expectations in each IU.",
                ],
                instruction_units=units,
                project_brief=project,
            )
        except Exception as exc:
            self.last_error = str(exc)
            return None

    def _extract_iu_flow_with_openai(self, client: OpenAI, payload: ProductPlanRequest) -> list[tuple[str, str, str, str]]:
        response = self._chat_with_retry(
            client=client,
            model=self.model,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": "Extract real Instruction Units from a Product Plan. Return valid compact JSON only. Do not use sample IU names.",
                },
                {
                    "role": "user",
                    "content": (
                        "Read the Product Plan excerpt and extract exactly five real Instruction Units if present. "
                        "If the document uses module/unit wording instead of IU wording, infer the five production IUs from the actual curriculum structure. "
                        "Return JSON: {\"instruction_units\":[{\"iu_code\":\"IU01\",\"title\":\"string\",\"adaptive_focus\":\"string\",\"complexity\":\"string\"}]}.\n\n"
                        f"Product Plan Title: {payload.title}\n"
                        f"Course Name: {payload.course_name}\n"
                        f"Learning Outcomes:\n{payload.learning_outcomes}\n\n"
                        f"Product Plan Excerpt:\n{payload.product_plan_text[:5000]}"
                    ),
                },
            ],
            temperature=0.15,
            max_tokens=900,
        )
        parsed = json.loads(response.choices[0].message.content or "{}")
        units = []
        for index, item in enumerate(parsed.get("instruction_units") or [], start=1):
            if not isinstance(item, dict):
                continue
            title = str(item.get("title") or "").strip()
            if not title:
                continue
            units.append(
                (
                    str(item.get("iu_code") or f"IU{index:02d}"),
                    title,
                    str(item.get("adaptive_focus") or f"Develop production-ready learning assets for {title}."),
                    str(item.get("complexity") or "Beginner"),
                )
            )
        return units[:5]

    def _generate_single_iu_with_openai(
        self,
        client: OpenAI,
        payload: ProductPlanRequest,
        code: str,
        title: str,
        focus: str,
        complexity: str,
        hours: float,
        outcome: str,
    ) -> dict[str, Any]:
        context = {
            "module_title": payload.title,
            "module_code": payload.module_code or "",
            "course_name": payload.course_name,
            "instruction_unit": {"iu_code": code, "iu_title": title, "adaptive_focus": focus, "complexity": complexity, "estimated_hours": hours},
            "learning_outcome": outcome,
            "delivery_mode": payload.delivery_modes,
            "learner_type": payload.learner_level,
            "assessment_requirements": payload.learning_outcomes,
            "product_plan_excerpt": payload.product_plan_text[:2200],
        }
        response = self._chat_with_retry(
            client=client,
            model=self.model,
            response_format={"type": "json_object"},
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a Senior Instructional Designer, Adaptive Agentic Learning Architect, Curriculum Planner, "
                        "and Learning Operations Specialist. Generate one compact, valid JSON IU production blueprint. "
                        "Use only the provided Product Plan context. Create curriculum-specific instructional topics for "
                        "zero-level beginner learners who have no faculty, no mentor, and no instructor-led class. "
                        "The learning must be adaptive, agentic, practical, gamified, and self-guiding rather than a traditional static document flow. "
                        "There must be no missing conceptual or practical steps. Avoid placeholder wording, generic operational summaries, and sample FED text. "
                        "Each Instruction Unit must be unique to its own IU title and must not reuse topics from other IUs."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        "Generate ONE Instruction Unit production blueprint. Return only valid JSON for this IU.\n\n"
                        "Required JSON keys:\n"
                        '{ "iu_code":"IU01", "title":"string", "module_code":"string", "module_name":"string", '
                        '"adaptive_focus":"string", "estimated_hours":number, "complexity_indicator":"string", '
                        '"delivery_mode":"string", "learning_goal":"string", '
                        '"knowledge":{"instructional_content_text":[],"ppt_text":[],"ppt_videos_podcast":[],"elearning_activities":[]}, '
                        '"skills":{"case_study_word_document":[],"case_study_ppt":[],"case_study_demo_videos":[],"case_study_assignment":[]}, '
                        '"assessment_blueprint":{"mcq_assessment":[],"quiz":[],"assessment_assignment":[],"marking_rubrics":[]} }\n\n'
                        "Every list item must be an object: {\"code\":\"T01\",\"title\":\"specific topic title\",\"description\":\"detailed creator guidance\"}.\n"
                        "Descriptions must be detailed enough for a content creator to build the asset. Include: subtitles/subsections, zero-level explanation approach, real-world example, step-by-step learner action, adaptive/gamified checkpoint, common learner confusion, and creator suggestion. For video or demo topics, include exactly what screen recording or demonstration should be recorded.\n"
                        "Generate exactly: 3 instructional_content_text, 2 ppt_text, 2 ppt_videos_podcast, 2 elearning_activities, "
                        "2 items for each skills subsection, 10 MCQ assessment questions, 5 quiz questions, 1 detailed assessment assignment, and 5 marking rubrics.\n"
                        "Case study content belongs in skills only. Assessment contains only MCQ assessment, assessment assignment, and marking rubrics.\n"
                        "Case study word document and case study assignment must describe a real industry workplace scenario, not a generic classroom example.\n"
                        "Assessment assignment must combine knowledge and skills in one realistic learner task with deliverables and evaluation expectations.\n"
                        "For MCQ and quiz items, put the question in title and include options plus correct answer in description.\n"
                        "Marking rubrics must support AI grading and include criteria, marks, detailed expectations, and performance levels.\n\n"
                        "Learning experience rules:\n"
                        "- Do not assume learners can ask a teacher.\n"
                        "- Explain from zero level with plain language and concrete examples.\n"
                        "- Add practice loops, hints, check-your-work moments, points/badges/challenges, and self-correction guidance.\n"
                        "- Suggest demos that remove ambiguity, especially for tools, screens, workflows, coding, data, or step-by-step procedures.\n"
                        "- Avoid traditional theory-heavy flow; make the output adaptive agentic-based and practical.\n\n"
                        "Uniqueness rule:\n"
                        "- Generate topics only for the current IU title.\n"
                        "- Do not reuse topics from previous or future IUs.\n"
                        "- If the IU title is about database modelling, generate modelling topics.\n"
                        "- If the IU title is about query optimization, generate SQL and query topics.\n"
                        "- If the IU title is about maintenance/testing, generate maintenance/testing topics.\n\n"
                        f"Product Plan IU Context:\n{json.dumps(context, ensure_ascii=False)}"
                    ),
                },
            ],
            temperature=0.28,
            max_tokens=3200,
        )
        return json.loads(response.choices[0].message.content or "{}")

    def _chat_with_retry(self, client: OpenAI, **kwargs):
        last_error: Exception | None = None
        for attempt in range(1, self.retry_attempts + 1):
            try:
                return client.chat.completions.create(**kwargs)
            except (APITimeoutError, APIConnectionError, RateLimitError) as exc:
                last_error = exc
                if attempt >= self.retry_attempts:
                    raise
                time.sleep(self.retry_delay_seconds * attempt)
        if last_error:
            raise last_error
        raise RuntimeError("OpenAI request failed without an exception.")

    def _empty_iu_blueprint(self, code: str, title: str, focus: str, complexity: str, hours: float, outcome: str, payload: ProductPlanRequest) -> InstructionUnitBlueprint:
        return InstructionUnitBlueprint(
            iu_code=code,
            title=title,
            module_code=payload.module_code or "",
            module_name=payload.title or payload.course_name,
            adaptive_focus=focus,
            estimated_hours=hours,
            complexity_indicator=complexity,
            delivery_mode=payload.delivery_modes,
            learning_goal=outcome,
            knowledge=KnowledgeBlueprint(),
            skills=SkillsBlueprint(),
            assessment_blueprint=AssessmentProductionBlueprint(),
            blueprint=ContentBlueprintSchema(
                knowledge_instructional_text=[],
                learning_sequence=[],
                glossary_concepts=[],
                ppt_content_topics=[],
                ppt_visual_flow=[],
                ppt_video_topics=[],
                video_demo_ideas=[],
                elearning_activities=[],
                case_study_text="",
                case_study_ppt_video_topics=[],
                case_study_assignments=[],
                adaptive_learning_support=[],
                production_effort={},
                learning_outcome_alignment=[],
                production_estimate="Not generated yet",
                readiness_insight="Fetch this IU blueprint to generate production-ready content assets.",
            ),
            assessment=AssessmentBlueprint(mcqs=[], focus_areas=[], quizzes=[], assignments=[], evaluation_objectives=[], alignment_check="Fetch this IU blueprint to generate assessment alignment."),
        )

    def _audience_profile(self, payload: ProductPlanRequest) -> str:
        parts = [payload.learner_level.strip(), payload.course_name.strip(), payload.delivery_modes.strip()]
        return " | ".join(part for part in parts if part) or "Learner profile will be confirmed during IU generation."

    def _normalize_ai_blueprint(self, payload: dict[str, Any], request: ProductPlanRequest, product_id: int | None) -> AdaptiveLearningBlueprintResponse:
        total_hours = float(payload.get("total_learning_hours") or request.total_learning_hours or 0)
        units = []
        for index, raw in enumerate(payload.get("instruction_units") or []):
            if not isinstance(raw, dict):
                continue
            unit = self._normalize_ai_unit(raw, index, total_hours, request)
            units.append(unit)
        if len(units) < 5:
            raise ValueError("OpenAI response did not include five instruction units.")
        return AdaptiveLearningBlueprintResponse(
            id=product_id,
            title=str(payload.get("title") or request.title),
            subtitle=str(payload.get("subtitle") or request.course_name or "Adaptive Learning Content Intelligence Platform"),
            module_code=str(payload.get("module_code") or request.module_code or ""),
            course_name=request.course_name or "",
            audience_profile=str(payload.get("audience_profile") or f"{request.learner_level} self-paced learners for {request.course_name}"),
            total_learning_hours=round(total_hours, 1),
            delivery_modes=str(payload.get("delivery_modes") or request.delivery_modes),
            curriculum_analysis=self._string_list(payload.get("curriculum_analysis")),
            adaptive_learning_recommendations=self._string_list(payload.get("adaptive_learning_recommendations")),
            complexity_indicators=self._string_list(payload.get("complexity_indicators")),
            assessment_alignment_checks=self._string_list(payload.get("assessment_alignment_checks")),
            content_production_estimation=self._string_list(payload.get("content_production_estimation")),
            delivery_readiness_insights=self._string_list(payload.get("delivery_readiness_insights")),
            instruction_units=units[:5],
            project_brief=ProjectBriefBlueprint(**(payload.get("project_brief") or self._project_brief(request.title, request.title, []).model_dump())),
        )

    def _normalize_ai_unit(self, raw: dict[str, Any], index: int, total_hours: float, request: ProductPlanRequest) -> InstructionUnitBlueprint:
        code = str(raw.get("iu_code") or f"IU{index + 1:02d}")
        title = str(raw.get("title") or f"Instruction Unit {index + 1}")
        knowledge = self._normalize_knowledge(raw.get("knowledge") or {})
        skills = self._normalize_skills(raw.get("skills") or {})
        assessment_production = self._normalize_assessment_production(raw.get("assessment_blueprint") or {})
        knowledge = self._complete_knowledge_from_ai(knowledge, title)
        skills = self._complete_skills_from_ai(skills, title)
        assessment_production = self._complete_assessment_from_ai(assessment_production, title)
        flat_knowledge = [f"{item.code} - {item.title}: {item.description}" for item in knowledge.instructional_content_text]
        ppt = [f"{item.code} - {item.title}: {item.description}" for item in knowledge.ppt_text]
        videos = [f"{item.code} - {item.title}: {item.description}" for item in knowledge.ppt_videos_podcast]
        activities = [f"{item.code} - {item.title}: {item.description}" for item in knowledge.e_learning]
        case_assignments = [f"{item.code} - {item.title}: {item.description}" for item in skills.case_study_assignment]
        mcqs = [f"{item.code} - {item.title}: {item.description}" for item in assessment_production.mcq_assessment]
        quizzes = [f"{item.code} - {item.title}: {item.description}" for item in assessment_production.quiz]
        assessment_assignments = [f"{item.code} - {item.title}: {item.description}" for item in assessment_production.assessment_assignment]
        marking_rubrics = [f"{item.code} - {item.title}: {item.description}" for item in assessment_production.marking_rubrics]
        return InstructionUnitBlueprint(
            iu_code=code,
            title=title,
            module_code=str(raw.get("module_code") or request.module_code or ""),
            module_name=str(raw.get("module_name") or request.title or request.course_name or "Product Plan Module"),
            adaptive_focus=str(raw.get("adaptive_focus") or "Self-paced adaptive content production focus."),
            estimated_hours=float(raw.get("estimated_hours") or total_hours / 5),
            complexity_indicator=str(raw.get("complexity_indicator") or "Beginner"),
            delivery_mode=str(raw.get("delivery_mode") or "Adaptive agentic practical learning"),
            learning_goal=str(raw.get("learning_goal") or f"Complete {title} production outcomes."),
            knowledge=knowledge,
            skills=skills,
            assessment_blueprint=assessment_production,
            blueprint=ContentBlueprintSchema(
                knowledge_instructional_text=flat_knowledge,
                learning_sequence=[
                    "Start with a zero-level concept mission and a simple real-world example.",
                    "Complete guided micro-practice with hints and instant self-check prompts.",
                    "Watch or follow the required demo recording before attempting the practice task.",
                    "Apply the concept in a gamified challenge or workplace mini-scenario.",
                    "Use the final checklist to confirm readiness before assessment planning.",
                ],
                glossary_concepts=[item.title for item in knowledge.instructional_content_text[:6]],
                ppt_content_topics=ppt,
                ppt_visual_flow=[item.description for item in knowledge.ppt_text[:4]],
                ppt_video_topics=videos,
                video_demo_ideas=[item.description for item in knowledge.ppt_videos_podcast[:4]],
                elearning_activities=activities,
                case_study_text=skills.case_study_word_document[0].description,
                case_study_ppt_video_topics=[f"{item.code} - {item.title}: {item.description}" for item in skills.case_study_ppt + skills.case_study_demo_videos],
                case_study_assignments=case_assignments,
                adaptive_learning_support=[item.description for item in knowledge.e_learning[:3]] + [
                    "Add hints, worked examples, progress badges, and self-correction prompts so learners can continue without faculty support."
                ],
                production_effort=self._production_effort(float(raw.get("estimated_hours") or total_hours / 5)),
                learning_outcome_alignment=[str(raw.get("learning_goal") or f"Aligned to {title}")],
                production_estimate=f"{round((total_hours / 5) * 0.9, 1)} content hours plus review",
                readiness_insight="Ready for production after SME validation and QA review.",
            ),
            assessment=AssessmentBlueprint(
                mcqs=mcqs,
                focus_areas=[item.title for item in assessment_production.mcq_assessment],
                quizzes=quizzes,
                assignments=assessment_assignments,
                evaluation_objectives=marking_rubrics,
                alignment_check="Assessment assignment combines knowledge and skills, and marking rubrics define the grading expectations.",
            ),
        )

    def _normalize_knowledge(self, raw: dict[str, Any]) -> KnowledgeBlueprint:
        return KnowledgeBlueprint(
            instructional_content_text=self._topic_list(raw.get("instructional_content_text"), "T"),
            ppt_text=self._topic_list(raw.get("ppt_text"), "P"),
            ppt_videos_podcast=self._topic_list(raw.get("ppt_videos_podcast"), "V"),
            e_learning=self._topic_list(raw.get("elearning_activities") or raw.get("e_learning") or raw.get("learning_activities"), "E"),
            guided_examples=self._topic_list(raw.get("guided_examples"), "G"),
            learning_activities=self._topic_list(raw.get("learning_activities"), "LA"),
        )

    def _normalize_skills(self, raw: dict[str, Any]) -> SkillsBlueprint:
        return SkillsBlueprint(
            practice_activities=self._topic_list(raw.get("practice_activities"), "S"),
            labs=self._topic_list(raw.get("labs"), "L"),
            guided_tasks=self._topic_list(raw.get("guided_tasks"), "GT"),
            mini_projects=self._topic_list(raw.get("mini_projects"), "MP"),
            case_study_word_document=self._topic_list(raw.get("case_study_word_document") or raw.get("case_study_documents") or raw.get("case_studies"), "CSW"),
            case_study_ppt=self._topic_list(raw.get("case_study_ppt") or raw.get("case_study_ppt_topics") or raw.get("guided_tasks"), "CSP"),
            case_study_demo_videos=self._topic_list(raw.get("case_study_demo_videos") or raw.get("case_study_video_topics") or raw.get("labs"), "CSV"),
            case_study_assignment=self._topic_list(raw.get("case_study_assignment") or raw.get("case_study_assignments") or raw.get("assignments") or raw.get("mini_projects"), "CSA"),
        )

    def _normalize_assessment_production(self, raw: dict[str, Any]) -> AssessmentProductionBlueprint:
        return AssessmentProductionBlueprint(
            mcq_topics=self._topic_list(raw.get("mcq_topics"), "A"),
            assignments=self._topic_list(raw.get("assignments"), "AS"),
            case_studies=self._topic_list(raw.get("case_studies"), "CS"),
            evaluation_criteria=self._topic_list(raw.get("evaluation_criteria"), "EC"),
            mcq_assessment=self._topic_list(raw.get("mcq_assessment") or raw.get("mcq_topics"), "MCQ"),
            quiz=self._topic_list(raw.get("quiz") or raw.get("quizzes") or raw.get("knowledge_checks"), "QZ"),
            assessment_assignment=self._topic_list(raw.get("assessment_assignment") or raw.get("assignment") or raw.get("assignments") or raw.get("practical_evaluation"), "AA"),
            marking_rubrics=self._topic_list(raw.get("marking_rubrics") or raw.get("rubrics") or raw.get("evaluation_criteria") or raw.get("final_knowledge_checks"), "MR"),
        )

    def _topic_list(self, value: Any, prefix: str) -> list[ProductionTopic]:
        if not isinstance(value, list):
            return []
        topics = []
        for index, item in enumerate(value, start=1):
            if isinstance(item, dict):
                topics.append(
                    ProductionTopic(
                        code=str(item.get("code") or f"{prefix}{index:02d}"),
                        title=str(item.get("title") or f"{prefix}{index:02d} Production Topic"),
                        description=str(item.get("description") or "OpenAI did not provide a description for this production item."),
                    )
                )
            else:
                topics.append(ProductionTopic(code=f"{prefix}{index:02d}", title=str(item), description="OpenAI returned this item without a structured description."))
        return topics

    def _complete_knowledge_from_ai(self, knowledge: KnowledgeBlueprint, title: str) -> KnowledgeBlueprint:
        base_topics = knowledge.instructional_content_text or knowledge.ppt_text or knowledge.ppt_videos_podcast or knowledge.e_learning
        return KnowledgeBlueprint(
            instructional_content_text=knowledge.instructional_content_text or self._derived_topics(base_topics, "T", title, "Instructional content text"),
            ppt_text=knowledge.ppt_text or self._derived_topics(base_topics, "P", title, "PPT text"),
            ppt_videos_podcast=knowledge.ppt_videos_podcast or self._derived_topics(base_topics, "V", title, "PPT video or podcast"),
            e_learning=knowledge.e_learning or self._derived_topics(base_topics, "E", title, "E-learning activity"),
            guided_examples=knowledge.guided_examples,
            learning_activities=knowledge.learning_activities,
        )

    def _complete_skills_from_ai(self, skills: SkillsBlueprint, title: str) -> SkillsBlueprint:
        base_topics = skills.case_study_word_document or skills.case_study_ppt or skills.case_study_demo_videos or skills.case_study_assignment or skills.practice_activities or skills.labs or skills.guided_tasks or skills.mini_projects
        return SkillsBlueprint(
            practice_activities=skills.practice_activities,
            labs=skills.labs,
            guided_tasks=skills.guided_tasks,
            mini_projects=skills.mini_projects,
            case_study_word_document=skills.case_study_word_document or self._derived_topics(base_topics, "CSW", title, "Case study Word document"),
            case_study_ppt=skills.case_study_ppt or self._derived_topics(base_topics, "CSP", title, "Case study PPT"),
            case_study_demo_videos=skills.case_study_demo_videos or self._derived_topics(base_topics, "CSV", title, "Case study demo video"),
            case_study_assignment=skills.case_study_assignment or self._derived_topics(base_topics, "CSA", title, "Case study assignment"),
        )

    def _complete_assessment_from_ai(self, assessment: AssessmentProductionBlueprint, title: str) -> AssessmentProductionBlueprint:
        base_topics = assessment.mcq_assessment or assessment.quiz or assessment.assessment_assignment or assessment.marking_rubrics or assessment.mcq_topics or assessment.assignments or assessment.evaluation_criteria
        return AssessmentProductionBlueprint(
            mcq_topics=assessment.mcq_topics,
            assignments=assessment.assignments,
            case_studies=assessment.case_studies,
            evaluation_criteria=assessment.evaluation_criteria,
            mcq_assessment=self._ensure_topic_count(assessment.mcq_assessment or self._derived_topics(base_topics, "MCQ", title, "MCQ assessment"), 10, "MCQ", title, "MCQ question"),
            quiz=self._ensure_topic_count(assessment.quiz or self._derived_topics(base_topics, "QZ", title, "Quiz"), 5, "QZ", title, "Quiz question"),
            assessment_assignment=self._ensure_topic_count(assessment.assessment_assignment or self._derived_topics(base_topics, "AA", title, "Assessment assignment"), 1, "AA", title, "Scenario-based assessment assignment"),
            marking_rubrics=self._ensure_topic_count(assessment.marking_rubrics or self._derived_topics(base_topics, "MR", title, "Marking rubric"), 5, "MR", title, "Detailed marking rubric"),
        )

    def _derived_topics(self, base_topics: list[ProductionTopic], prefix: str, unit_title: str, asset_type: str) -> list[ProductionTopic]:
        if not base_topics:
            raise ValueError(f"OpenAI response for {unit_title} is missing source topics for {asset_type}.")
        derived = []
        for index, item in enumerate(base_topics[:4], start=1):
            clean_title = item.title.replace("Slide", "").replace("Video", "").strip(" :-")
            derived.append(
                ProductionTopic(
                    code=f"{prefix}{index:02d}",
                    title=f"{asset_type}: {clean_title}",
                    description=f"Adapt the AI-generated topic '{item.title}' into a {asset_type.lower()} asset for {unit_title}. {item.description}",
                )
            )
        return derived

    def _ensure_topic_count(self, topics: list[ProductionTopic], count: int, prefix: str, unit_title: str, asset_type: str) -> list[ProductionTopic]:
        completed = list(topics[:count])
        while len(completed) < count:
            index = len(completed) + 1
            completed.append(
                ProductionTopic(
                    code=f"{prefix}{index:02d}",
                    title=f"{asset_type} {index} for {unit_title}",
                    description=f"Create a {asset_type.lower()} that checks learner understanding of {unit_title}. Include clear instructions, expected answer or criteria, and beginner-friendly wording.",
                )
            )
        return completed

    def _flow_from_module_structure(self, text: str) -> list[tuple[str, str, str, str]]:
        flows: list[tuple[str, str, str, str]] = []
        complexity = ["Foundational", "Supported Practice", "Applied", "Scenario-Based", "Integrative"]
        focus = [
            "Build foundational understanding with beginner-friendly concepts and examples.",
            "Guide learners through structured practice before independent work.",
            "Move learners into hands-on workplace application tasks.",
            "Apply concepts through realistic case study and scenario work.",
            "Integrate skills and prepare learners for assessment submission.",
        ]
        for raw in text.replace("\n", ";").split(";"):
            item = raw.strip(" -")
            if not item.lower().startswith("iu"):
                continue
            if "-" in item:
                code, title = item.split("-", 1)
            elif ":" in item:
                code, title = item.split(":", 1)
            else:
                continue
            unit_number = self._unit_number(code)
            if 1 <= unit_number <= 5:
                flows.append((f"IU{unit_number:02d}", title.strip(), focus[unit_number - 1], complexity[unit_number - 1]))
        return flows[:5] if len(flows) >= 5 else []

    def _unit_number(self, code: str) -> int:
        digits = "".join(ch for ch in str(code) if ch.isdigit())
        try:
            return max(1, min(5, int(digits or "1")))
        except ValueError:
            return 1

    def _production_effort(self, hours: float) -> dict[str, str]:
        return {
            "Instructional Context Text": "3 hrs",
            "PPT Development": "2 hrs max for 20-25 slides",
            "PPT Video Production": "30-45 mins for 20-25 slides",
            "Demo Video Production": "1 hr max for 5-10 mins demo",
            "Assessment and QA Review": "1 hr",
        }

    def _string_list(self, value: Any) -> list[str]:
        if isinstance(value, list):
            return [str(item) for item in value if str(item).strip()]
        return []

    def _project_brief(self, title: str, theme: str, outcomes: list[str]) -> ProjectBriefBlueprint:
        return ProjectBriefBlueprint(
            project_brief=f"Learners will complete a beginner-friendly capstone that demonstrates practical understanding of {theme} using templates, examples, and staged deliverables.",
            capstone_scenario=f"You are supporting a small team that needs a clear, usable {theme} output. Create a practical solution that another beginner could understand and follow.",
            project_deliverables=[
                "Completed planning template or working document",
                "Short rationale explaining decisions in beginner-friendly language",
                "Evidence checklist showing how learning outcomes were addressed",
                "Final improvement note based on self-review",
            ],
            presentation_outline=[
                "Problem context and learner goal",
                "Key decisions and steps taken",
                "Final output walkthrough",
                "Risks, improvements, and next learning step",
            ],
            evaluation_criteria=[
                "Clarity and beginner-friendly explanation",
                "Alignment with learning outcomes",
                "Practical completeness of deliverables",
                "Evidence of self-review and improvement",
                "Readiness for real-world application",
            ],
        )

    def _distribute_hours(self, total: float) -> list[float]:
        weights = [0.16, 0.19, 0.23, 0.22, 0.20]
        return [total * weight for weight in weights]

    def _infer_title(self, text: str) -> str:
        first_line = next((line.strip() for line in text.splitlines() if line.strip()), "")
        return first_line[:120] or "Adaptive Learning Product Blueprint"

    def _split_lines(self, text: str) -> list[str]:
        values = [line.strip(" -\t") for line in text.replace(";", "\n").splitlines()]
        return [item for item in values if item]

    def _theme(self, title: str, text: str) -> str:
        source = f"{title} {text}".lower()
        if any(keyword in source for keyword in ["web design", "html", "css", "bootstrap", "javascript", "jquery", "single page application"]):
            return "web design and front-end development"
        if "software" in source:
            return "software engineering and application development"
        if "data" in source:
            return "data-driven operational decision-making"
        if "ai" in source or "agent" in source:
            return "AI-assisted learning and delivery operations"
        if "project" in source:
            return "practical project execution"
        return title.lower()
