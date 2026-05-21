from __future__ import annotations

import os
from datetime import datetime

from dotenv import load_dotenv
from openai import OpenAI

from app.database import record_agent_run
from app.schemas.wellness import LearningInsightCard, VideoRecommendation, WellnessCard, WellnessChatResponse, WellnessRequest, WellnessResponse


load_dotenv()


class WellnessAgent:
    name = "LIA Wellbeing Agentic AI"

    def analyze(self, payload: WellnessRequest) -> WellnessResponse:
        stress_score = min(100, payload.meetings_count * 7 + payload.overdue_tasks * 12 + payload.urgent_emails * 5 + payload.inactivity_hours * 4)
        wellness_score = max(20, min(98, payload.productivity_score - stress_score // 3 + 35))
        motivation_score = max(30, min(98, wellness_score + 10 - payload.screen_time_hours))
        burnout_risk = "High" if stress_score >= 75 else "Medium" if stress_score >= 45 else "Low"
        stress_level = "Critical" if stress_score >= 80 else "Elevated" if stress_score >= 55 else "Balanced"
        workload_balance = "Overloaded" if payload.workload_hours >= 10 or payload.overdue_tasks >= 3 else "Moderate" if payload.workload_hours >= 8 else "Healthy"
        meeting_fatigue = "High" if payload.meetings_count >= 6 else "Moderate" if payload.meetings_count >= 3 else "Low"

        emotional_wellness_trend = self._trend(payload, stress_score, motivation_score)
        mood_response = self._mood_response(payload.mood, payload.recovery_mode)
        daily_briefing = self._daily_brief(payload, workload_balance)
        supportive = self._supportive_encouragement(payload, stress_score, workload_balance)
        emotional = self._emotional(payload, stress_level)
        recovery_plan = self._recovery_plan(payload, stress_score)
        recovery = self._recovery(payload.recovery_mode, stress_score)
        healing = self._healing_actions(payload, stress_score)
        physical = self._physical(payload)
        family = self._family_social()
        entertainment = self._entertainment(stress_score)
        motivation = self._motivation(payload, motivation_score)
        wellness_insights = self._wellness_insights(payload, stress_score, emotional_wellness_trend)
        growth = self._growth(payload.role)
        learning = self._learning_insight()
        videos = self._videos()
        cards = [
            WellnessCard(title="Mood Status", value=payload.mood, insight=mood_response),
            WellnessCard(title="Stress Level", value=stress_level, insight=f"Risk {burnout_risk} with score {stress_score}."),
            WellnessCard(title="Workload Balance", value=workload_balance, insight=f"{payload.workload_hours}h workload, {payload.overdue_tasks} overdue tasks."),
            WellnessCard(title="Meeting Fatigue", value=meeting_fatigue, insight=f"{payload.meetings_count} meetings today."),
            WellnessCard(title="Recovery Recommendation", value="Active" if payload.recovery_mode else "Standby", insight=recovery[0]),
            WellnessCard(title="Physical Activity Reminder", value="Movement Needed", insight=physical[0]),
            WellnessCard(title="Motivation Score", value=str(motivation_score), insight=motivation[0]),
            WellnessCard(title="Growth Recommendation", value=payload.role, insight=growth[0]),
            WellnessCard(title="Learning Insight of the Day", value=learning.title, insight=learning.explanation),
        ]

        response = WellnessResponse(
            agent=self.name,
            wellness_score=wellness_score,
            stress_score=stress_score,
            motivation_score=motivation_score,
            stress_level=stress_level,
            burnout_risk=burnout_risk,
            workload_balance=workload_balance,
            meeting_fatigue=meeting_fatigue,
            emotional_wellness_trend=emotional_wellness_trend,
            recovery_mode_active=payload.recovery_mode,
            mood_response=mood_response,
            daily_briefing=daily_briefing,
            supportive_encouragement=supportive,
            emotional_insights=emotional,
            wellness_insights=wellness_insights,
            recovery_plan=recovery_plan,
            recovery_recommendations=recovery,
            healing_actions=healing,
            physical_recommendations=physical,
            family_social_reminders=family,
            entertainment_happiness=entertainment,
            motivation_messages=motivation,
            growth_recommendations=growth,
            dashboard_cards=cards,
            videos=videos,
            learning_insight=learning,
            chat_suggestions=[
                "Give me a personalized recovery plan for tonight.",
                "I feel emotionally tired after meetings. Help me reset.",
                "Suggest calming entertainment and family time after work.",
                "Help me balance urgent emails without burning out.",
            ],
        )
        record_agent_run(self.name, response.daily_briefing)
        return response

    def chat(self, message: str, mood: str, role: str, recovery_mode: bool, context: dict | None = None) -> WellnessChatResponse:
        context = context or {}
        api_key = (os.getenv("OPENAI_API_KEY") or "").strip().strip('"').strip("'")
        if api_key:
            try:
                client = OpenAI(api_key=api_key, timeout=45.0, max_retries=1)
                completion = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {
                            "role": "system",
                            "content": (
                                "You are LIA Wellbeing Agentic AI, a personalized emotional wellness intelligence companion for remote learning and delivery professionals. "
                                "Use the user's workload, mood, meeting load, urgent email pressure, screen time, inactivity, motivation, and recovery mode to respond. "
                                "Be warm, realistic, specific, calming, and context-aware. Generate emotional encouragement, recovery recommendations, physical wellness suggestions, "
                                "entertainment ideas, family/social reminders, motivation coaching, work-life balance guidance, and personalized healing actions when relevant. "
                                "Do not diagnose mental health conditions, do not act as a therapist replacement, do not use generic quotes, and avoid repetitive motivational language."
                            ),
                        },
                        {
                            "role": "user",
                            "content": (
                                "Personal wellness context:\n"
                                f"- role: {role}\n"
                                f"- mood: {mood}\n"
                                f"- recovery_mode: {recovery_mode}\n"
                                f"- workload_hours: {context.get('workload_hours', 8)}\n"
                                f"- meetings_count: {context.get('meetings_count', 0)}\n"
                                f"- overdue_tasks: {context.get('overdue_tasks', 0)}\n"
                                f"- urgent_emails: {context.get('urgent_emails', 0)}\n"
                                f"- screen_time_hours: {context.get('screen_time_hours', 7)}\n"
                                f"- inactivity_hours: {context.get('inactivity_hours', 2)}\n"
                                f"- motivation_score: {context.get('motivation_score', 70)}\n\n"
                                "User message:\n"
                                f"{message}\n\n"
                                "Respond with one supportive paragraph and a concise Recovery Plan list. Keep it personal, practical, and emotionally grounded."
                            ),
                        },
                    ],
                    temperature=0.6,
                    max_tokens=520,
                )
                text = (completion.choices[0].message.content or "").strip()
                if text:
                    return WellnessChatResponse(message=text, recovery_plan=self._recovery_plan_from_context(mood, recovery_mode, context), healing_actions=self._healing_actions_from_context(mood, context), category=self._chat_category(message, mood, context))
            except Exception:
                pass
        return WellnessChatResponse(message=self._fallback_chat(message, mood, role, recovery_mode, context), recovery_plan=self._recovery_plan_from_context(mood, recovery_mode, context), healing_actions=self._healing_actions_from_context(mood, context), category=self._chat_category(message, mood, context))

    def _mood_response(self, mood: str, recovery_mode: bool) -> str:
        mapping = {
            "Motivated": "Great momentum today. Protect your energy and pace it well.",
            "Tired": "Your body is asking for recovery. Short breaks will improve focus quality.",
            "Lonely": "Connection matters. Schedule one human check-in today.",
            "Burned Out": "You need recovery first, not more pressure. Reduce non-urgent workload now.",
            "Demotivated": "Start with one small win. Progress builds confidence.",
            "Stressed": "Slow down the pace and focus on control: one task, one step.",
            "Calm": "Strong baseline today. Keep your balance and protect your focus windows.",
        }
        note = mapping.get(mood, mapping["Calm"])
        if recovery_mode:
            note += " Recovery Mode is active, so non-urgent pressure should stay minimal."
        return note

    def _daily_brief(self, payload: WellnessRequest, balance: str) -> str:
        greeting = f"Today has {payload.meetings_count} meetings, {payload.urgent_emails} urgent emails, {payload.overdue_tasks} operational follow-ups, and a {balance.lower()} workload pattern."
        action = "Protect one recovery break, reduce non-essential switching, and close the day with a deliberate offline reset."
        return f"{greeting} {action}"

    def _supportive_encouragement(self, payload: WellnessRequest, stress_score: int, balance: str) -> str:
        if stress_score >= 75:
            return f"You have been carrying a heavy operational load today. With {payload.meetings_count} meetings and {payload.urgent_emails} urgent emails, feeling {payload.mood.lower()} is an understandable signal to slow the pace and recover."
        if stress_score >= 45:
            return f"Your day has real pressure, but it is still manageable if you protect focus and recovery. The goal is not to push harder; it is to spend your energy more carefully."
        return f"Your workload looks {balance.lower()} right now. Keep the rhythm steady and protect the calm you have built."

    def _emotional(self, payload: WellnessRequest, stress_level: str) -> list[str]:
        return [
            f"Your mood is {payload.mood.lower()} while stress is {stress_level.lower()}, so the plan should match your real energy instead of forcing artificial positivity.",
            f"{payload.meetings_count} meetings and {payload.urgent_emails} urgent emails can create emotional residue even when the work is going well.",
            "Recovery is part of performance today, not a reward you earn only after everything is finished.",
        ]

    def _wellness_insights(self, payload: WellnessRequest, stress_score: int, trend: str) -> list[str]:
        insights = [f"Emotional wellness trend: {trend}.", f"Stress score is {stress_score}/100 based on workload, meetings, urgent email pressure, screen time, and inactivity."]
        if payload.screen_time_hours >= 7:
            insights.append("Screen exposure is high, so eye strain and nervous-system fatigue may be contributing to emotional tiredness.")
        if payload.inactivity_hours >= 3:
            insights.append("Physical inactivity is elevated; short movement will likely help more than another productivity push.")
        if payload.urgent_emails >= 8:
            insights.append("Urgent email volume is high; batch processing and notification boundaries are important today.")
        return insights

    def _trend(self, payload: WellnessRequest, stress_score: int, motivation_score: int) -> str:
        if payload.mood in {"Burned Out", "Tired", "Stressed"} and stress_score >= 65:
            return "Recovery Needed"
        if motivation_score < 55 or payload.mood in {"Demotivated", "Lonely"}:
            return "Connection and Motivation Support"
        if payload.recovery_mode:
            return "Active Recovery"
        return "Stable"

    def _recovery_plan(self, payload: WellnessRequest, stress_score: int) -> list[str]:
        plan = ["Drink water and step away from the screen for 3 minutes."]
        if payload.inactivity_hours >= 2:
            plan.append("Take a 10-minute walk or do slow standing stretches.")
        if payload.meetings_count >= 5:
            plan.append("Do neck, shoulder, and jaw release before the next call.")
        if payload.urgent_emails >= 6:
            plan.append("Batch urgent emails into one focused 25-minute block, then stop checking for a while.")
        if payload.recovery_mode or stress_score >= 65:
            plan.append("Disconnect from work notifications tonight after a fixed cut-off time.")
            plan.append("Choose one light show, calming music, or quiet family moment before sleep.")
        else:
            plan.append("Protect one short recovery break before your final task block.")
        return plan[:5]

    def _recovery(self, recovery_mode: bool, stress_score: int) -> list[str]:
        base = [
            "Do 3 rounds of box breathing (4-4-4-4).",
            "Take a 7-minute stretch and posture reset.",
            "Drink water and step away from screen for 5 minutes.",
            "Pause non-urgent notifications for 30 minutes.",
        ]
        if recovery_mode or stress_score > 65:
            base.insert(0, "Activate low-stimulus focus mode and postpone non-critical tasks.")
        return base

    def _healing_actions(self, payload: WellnessRequest, stress_score: int) -> list[str]:
        actions = [
            "Name the pressure clearly: workload is heavy, and your body is asking for a reset.",
            "Choose one next operational priority and let the rest wait for a planned block.",
            "Create a gentle end-of-day boundary before sleep.",
        ]
        if payload.mood == "Lonely":
            actions.insert(1, "Message one trusted person or spend a few minutes with family without multitasking.")
        if payload.mood in {"Burned Out", "Tired", "Stressed"}:
            actions.insert(1, "Lower stimulation: dim screens, reduce notifications, and avoid extra problem-solving tonight.")
        if stress_score >= 70:
            actions.append("Avoid adding new work after 9 PM unless it is genuinely urgent.")
        return actions

    def _physical(self, payload: WellnessRequest) -> list[str]:
        tips = []
        if payload.screen_time_hours >= 6:
            tips.append("20-20-20 eye rule: every 20 minutes, look 20 feet away for 20 seconds.")
        if payload.inactivity_hours >= 2:
            tips.append("Walk for 5-8 minutes before your next call.")
        if payload.meetings_count >= 4:
            tips.append("Do neck and shoulder mobility between meetings.")
        if not tips:
            tips.append("Maintain your movement streak with one short walk this afternoon.")
        return tips

    def _videos(self) -> list[VideoRecommendation]:
        return [
            VideoRecommendation(category="Stress Relief", title="10-Minute Guided Breathing", youtube_url="https://www.youtube.com/watch?v=SEfs5TJZ6Nk", reason="Fast reset when stress spikes."),
            VideoRecommendation(category="Office Stretching", title="Desk Stretch Routine", youtube_url="https://www.youtube.com/watch?v=fWNaR-rxAic", reason="Relieves desk stiffness quickly."),
            VideoRecommendation(category="Neck & Shoulder Relief", title="Neck and Shoulder Release", youtube_url="https://www.youtube.com/watch?v=was4RtzpfJs", reason="Reduces tension from meeting-heavy days."),
            VideoRecommendation(category="Eye Relaxation", title="Eye Strain Relief Exercise", youtube_url="https://www.youtube.com/watch?v=v9gM5bR7sM4", reason="Supports screen-time recovery."),
            VideoRecommendation(category="Energy Boost", title="5-Minute Morning Mobility", youtube_url="https://www.youtube.com/watch?v=EnY2Q4Yv8mE", reason="Quick energy boost without fatigue."),
        ]

    def _entertainment(self, stress_score: int) -> list[str]:
        if stress_score >= 65:
            return [
                "Watch one light comedy episode or gentle comfort show; avoid intense work-related content tonight.",
                "Play calm instrumental music for 15 minutes to reduce cognitive load.",
                "Watch a short nature or slow travel video to reset your attention.",
            ]
        return [
            "Reward your progress with one enjoyable short break later today.",
            "Try a feel-good playlist after your final task block.",
        ]

    def _family_social(self) -> list[str]:
        return [
            "Plan one intentional family or friend conversation this evening.",
            "Disconnect from work notifications at a fixed end-of-day time.",
            "Take a short outdoor walk to transition out of work mode.",
        ]

    def _motivation(self, payload: WellnessRequest, score: int) -> list[str]:
        return [
            f"You handled {payload.meetings_count} meetings and {payload.urgent_emails} urgent emails; that is real cognitive and emotional labor.",
            f"Your motivation score is {score}; protect it by choosing one meaningful task instead of chasing every request.",
            "Let one completed priority count as enough progress before ending your day.",
        ]

    def _recovery_plan_from_context(self, mood: str, recovery_mode: bool, context: dict) -> list[str]:
        payload = WellnessRequest(
            workload_hours=int(context.get("workload_hours", 8)),
            meetings_count=int(context.get("meetings_count", 0)),
            overdue_tasks=int(context.get("overdue_tasks", 0)),
            productivity_score=80,
            urgent_emails=int(context.get("urgent_emails", 0)),
            screen_time_hours=int(context.get("screen_time_hours", 7)),
            inactivity_hours=int(context.get("inactivity_hours", 2)),
            role=str(context.get("role", "Delivery Manager")),
            mood=mood,
            recovery_mode=recovery_mode,
        )
        stress_score = min(100, payload.meetings_count * 7 + payload.overdue_tasks * 12 + payload.urgent_emails * 5 + payload.inactivity_hours * 4)
        return self._recovery_plan(payload, stress_score)

    def _healing_actions_from_context(self, mood: str, context: dict) -> list[str]:
        payload = WellnessRequest(
            workload_hours=int(context.get("workload_hours", 8)),
            meetings_count=int(context.get("meetings_count", 0)),
            overdue_tasks=int(context.get("overdue_tasks", 0)),
            productivity_score=80,
            urgent_emails=int(context.get("urgent_emails", 0)),
            screen_time_hours=int(context.get("screen_time_hours", 7)),
            inactivity_hours=int(context.get("inactivity_hours", 2)),
            mood=mood,
        )
        stress_score = min(100, payload.meetings_count * 7 + payload.overdue_tasks * 12 + payload.urgent_emails * 5 + payload.inactivity_hours * 4)
        return self._healing_actions(payload, stress_score)

    def _chat_category(self, message: str, mood: str, context: dict) -> str:
        text = f"{message} {mood}".lower()
        if "lonely" in text or "family" in text:
            return "Loneliness Support"
        if "meeting" in text:
            return "Meeting Fatigue"
        if "motivat" in text or "demotivat" in text:
            return "Motivation Recovery"
        if "stretch" in text or "walk" in text or int(context.get("inactivity_hours", 0)) >= 3:
            return "Physical Wellness"
        if "burn" in text or "tired" in text:
            return "Burnout Recovery"
        return "Stress Recovery"

    def _fallback_chat(self, message: str, mood: str, role: str, recovery_mode: bool, context: dict) -> str:
        meetings = int(context.get("meetings_count", 0))
        urgent = int(context.get("urgent_emails", 0))
        inactive = int(context.get("inactivity_hours", 0))
        cut_off = "9 PM" if recovery_mode or meetings >= 5 or urgent >= 8 else "your planned end time"
        return (
            f"You are not just lacking motivation; you are carrying {meetings} meetings, {urgent} urgent emails, and a {mood.lower()} emotional state as a {role}. "
            "That combination can make even normal tasks feel heavier. For the next hour, lower the pressure: choose one operational priority, pause non-urgent notifications, and let recovery be part of the plan.\n\n"
            "Recovery Plan:\n"
            "1. Drink water and step away from the screen.\n"
            f"2. {'Take a 10-minute walk or stretch your legs.' if inactive >= 2 else 'Do a short neck and shoulder stretch.'}\n"
            "3. Finish one high-impact task only.\n"
            f"4. Disconnect from work notifications after {cut_off}.\n"
            "5. Do one gentle offline activity: family time, calming music, or a light show before sleep."
        )

    def _growth(self, role: str) -> list[str]:
        role_map = {
            "Delivery Manager": ["Explore AI scheduling copilots for delivery risk prediction.", "Learn workflow automation with multi-agent orchestration."],
            "Facilitator": ["Experiment with AI-driven learner engagement prompts.", "Use rapid quiz generation for adaptive classroom support."],
            "AI Builder": ["Deep dive into LangGraph and agent memory patterns.", "Build a lightweight RAG assistant for operations playbooks."],
            "Instructional Designer": ["Prototype adaptive content variants using AI.", "Use learner analytics to tune activity complexity."],
        }
        return role_map.get(role, role_map["Delivery Manager"])

    def _learning_insight(self) -> LearningInsightCard:
        topics = [
            ("AI Agents", "Autonomous task performers with goals and tools.", "Automate recurring operational handoffs.", "https://platform.openai.com/docs", "Agentic systems are becoming core in enterprise workflows."),
            ("MCP", "Model Context Protocol helps models access tools and data safely.", "Connect assistants to calendars, docs, and workflows.", "https://modelcontextprotocol.io", "Standardized tool integration is a key skill for AI builders."),
            ("RAG Systems", "Retrieval-Augmented Generation grounds AI in real documents.", "Build policy-aware support copilots.", "https://platform.openai.com/docs/guides/retrieval", "Grounded AI improves trust and accuracy in operations."),
            ("LangGraph", "Graph-based orchestration for multi-step AI workflows.", "Design robust multi-agent execution pipelines.", "https://langchain-ai.github.io/langgraph/", "Workflow reliability and control are differentiators."),
        ]
        item = topics[datetime.utcnow().toordinal() % len(topics)]
        return LearningInsightCard(title=item[0], explanation=item[1], use_case=item[2], resource=item[3], relevance=item[4])
