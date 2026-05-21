import json
import os
from datetime import datetime

from fastapi import APIRouter, Depends
from openai import OpenAI
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.wellbeing import GrowthRecommendation, HealingRecommendation, LearningInsight, MoodLog, MotivationLog, RecoveryRecommendation, RecoverySession, StressScore, WellnessActivity, WellnessContext, WellnessSession, WellnessTrend
from app.schemas.wellness import MoodCheckRequest, MoodHistoryItem, MoodHistoryResponse, WellnessChatRequest, WellnessChatResponse, WellnessRequest, WellnessResponse
from app.services.wellness_agent import WellnessAgent


router = APIRouter(prefix="/wellness", tags=["Wellbeing Agent"])
agent = WellnessAgent()


# ── Curated K-Drama list ──────────────────────────────────────
KDRAMA_LIST = [
    {"title": "Queen of Tears", "genre": "Romance · Drama", "year": 2024, "rating": "9.0", "description": "A chaebol heiress and her husband rediscover love when she is diagnosed with a terminal illness.", "watch_url": "https://www.netflix.com/title/81757950", "emoji": "👑"},
    {"title": "Crash Landing on You", "genre": "Romance · Comedy", "year": 2019, "rating": "8.9", "description": "A South Korean heiress crash-lands in North Korea and falls for a military officer.", "watch_url": "https://www.netflix.com/title/81159258", "emoji": "💫"},
    {"title": "Goblin", "genre": "Fantasy · Romance", "year": 2016, "rating": "8.8", "description": "An immortal goblin seeks a human bride to end his eternal life and finds unexpected love.", "watch_url": "https://www.netflix.com/title/80122741", "emoji": "🌌"},
    {"title": "My Mister", "genre": "Life · Drama", "year": 2018, "rating": "9.1", "description": "A lonely middle-aged man and a young woman from a difficult background find healing in each other.", "watch_url": "https://www.viki.com/tv/36450c-my-mister", "emoji": "🌿"},
    {"title": "It's Okay to Not Be Okay", "genre": "Romance · Healing", "year": 2020, "rating": "8.8", "description": "A community health worker and a children's book author help each other heal emotional wounds.", "watch_url": "https://www.netflix.com/title/81062089", "emoji": "🦋"},
    {"title": "Hospital Playlist", "genre": "Medical · Friendship", "year": 2020, "rating": "9.0", "description": "Five doctors who have been friends since medical school navigate life, love, and work together.", "watch_url": "https://www.netflix.com/title/81239864", "emoji": "🩺"},
    {"title": "Lovely Runner", "genre": "Romance · Time Travel", "year": 2024, "rating": "8.7", "description": "A fan travels back in time to save her idol, changing both their destinies along the way.", "watch_url": "https://www.viki.com/tv/39068c-lovely-runner", "emoji": "🏃"},
    {"title": "Move to Heaven", "genre": "Life · Emotional", "year": 2021, "rating": "8.9", "description": "A young man with Asperger's and his uncle work as trauma cleaners, uncovering untold stories.", "watch_url": "https://www.netflix.com/title/81270618", "emoji": "🌈"},
]


@router.post("/analyze", response_model=WellnessResponse)
def analyze(payload: WellnessRequest, db: Session = Depends(get_db)) -> WellnessResponse:
    result = agent.analyze(payload)
    db.add(MoodLog(mood=payload.mood))
    db.add(WellnessSession(role=payload.role, recovery_mode=1 if payload.recovery_mode else 0, briefing=result.daily_briefing))
    db.add(
        WellnessContext(
            role=payload.role,
            mood=payload.mood,
            workload_hours=payload.workload_hours,
            meetings_count=payload.meetings_count,
            overdue_tasks=payload.overdue_tasks,
            urgent_emails=payload.urgent_emails,
            screen_time_hours=payload.screen_time_hours,
            inactivity_hours=payload.inactivity_hours,
            operational_activity=f"{payload.meetings_count} meetings, {payload.urgent_emails} urgent emails, {payload.overdue_tasks} overdue tasks",
            recovery_mode=1 if payload.recovery_mode else 0,
        )
    )
    db.add(StressScore(stress_level=result.stress_level, score=float(result.stress_score), burnout_risk=result.burnout_risk, workload_balance=result.workload_balance))
    db.add(MotivationLog(message=result.motivation_messages[0], motivation_score=float(result.motivation_score)))
    db.add(RecoverySession(mood=payload.mood, recovery_mode=1 if payload.recovery_mode else 0, recovery_plan="\n".join(result.recovery_plan)))
    db.add(WellnessTrend(trend_type="Emotional Wellness", value=result.emotional_wellness_trend, insight=" | ".join(result.wellness_insights[:3])))
    for item in result.recovery_recommendations[:3]:
        db.add(RecoveryRecommendation(title=item[:120], category="Recovery", details=item))
    for item in result.healing_actions[:5]:
        db.add(HealingRecommendation(category="Personalized Healing", recommendation=item))
    for item in result.physical_recommendations[:3]:
        db.add(WellnessActivity(activity_type="Physical", title=item[:120], details=item))
    for item in result.growth_recommendations[:2]:
        db.add(GrowthRecommendation(role=payload.role, topic=item[:120], recommendation=item))
    db.add(LearningInsight(title=result.learning_insight.title, explanation=result.learning_insight.explanation, use_case=result.learning_insight.use_case, resource=result.learning_insight.resource, relevance=result.learning_insight.relevance))
    db.commit()
    return result


@router.post("/mood-check", response_model=WellnessChatResponse)
def mood_check(payload: MoodCheckRequest, db: Session = Depends(get_db)) -> WellnessChatResponse:
    db.add(MoodLog(mood=payload.mood, note=payload.note))
    db.commit()
    return WellnessChatResponse(message=agent._mood_response(payload.mood, False))


@router.post("/chat", response_model=WellnessChatResponse)
def chat(payload: WellnessChatRequest, db: Session = Depends(get_db)) -> WellnessChatResponse:
    context = {
        "role": payload.role,
        "workload_hours": payload.workload_hours,
        "meetings_count": payload.meetings_count,
        "overdue_tasks": payload.overdue_tasks,
        "urgent_emails": payload.urgent_emails,
        "screen_time_hours": payload.screen_time_hours,
        "inactivity_hours": payload.inactivity_hours,
        "motivation_score": payload.motivation_score,
    }
    result = agent.chat(payload.message, payload.mood, payload.role, payload.recovery_mode, context)
    db.add(MoodLog(mood=payload.mood, note=payload.message[:500]))
    db.add(
        WellnessContext(
            role=payload.role,
            mood=payload.mood,
            workload_hours=payload.workload_hours,
            meetings_count=payload.meetings_count,
            overdue_tasks=payload.overdue_tasks,
            urgent_emails=payload.urgent_emails,
            screen_time_hours=payload.screen_time_hours,
            inactivity_hours=payload.inactivity_hours,
            operational_activity=payload.message[:500],
            recovery_mode=1 if payload.recovery_mode else 0,
        )
    )
    if result.recovery_plan:
        db.add(RecoverySession(mood=payload.mood, recovery_mode=1 if payload.recovery_mode else 0, recovery_plan="\n".join(result.recovery_plan)))
    for item in result.healing_actions[:5]:
        db.add(HealingRecommendation(category=result.category, recommendation=item))
    db.commit()
    return result


@router.get("/mood-history", response_model=MoodHistoryResponse)
def mood_history(db: Session = Depends(get_db)) -> MoodHistoryResponse:
    rows = db.query(MoodLog).order_by(MoodLog.created_at.desc()).limit(180).all()
    by_day: dict[str, list[MoodLog]] = {}
    for row in rows:
        day = row.created_at.strftime("%Y-%m-%d") if row.created_at else datetime.utcnow().strftime("%Y-%m-%d")
        by_day.setdefault(day, []).append(row)

    history: list[MoodHistoryItem] = []
    for day in sorted(by_day.keys(), reverse=True):
        entries = by_day[day]
        mood_count: dict[str, int] = {}
        for entry in entries:
            mood_count[entry.mood] = mood_count.get(entry.mood, 0) + 1
        top_mood = max(mood_count.items(), key=lambda pair: pair[1])[0]
        history.append(MoodHistoryItem(date=day, mood=top_mood, count=len(entries)))
    return MoodHistoryResponse(history=history[:14])


@router.post("/music")
def music_recommendations(payload: dict = None) -> dict:
    """Return trending music recommendations based on mood using OpenAI."""
    mood = (payload or {}).get("mood", "Calm")
    api_key = (os.getenv("OPENAI_API_KEY") or "").strip().strip('"').strip("'")

    # Fallback curated playlists by mood
    fallback_by_mood: dict[str, list[dict]] = {
        "Demotivated": [
            {"title": "Eye of the Tiger", "artist": "Survivor", "genre": "Rock · Motivation", "mood_tag": "energising", "youtube_search_url": "https://www.youtube.com/results?search_query=Eye+of+the+Tiger+Survivor", "spotify_search_url": "https://open.spotify.com/search/Eye%20of%20the%20Tiger%20Survivor"},
            {"title": "Stronger", "artist": "Kanye West", "genre": "Hip-Hop · Power", "mood_tag": "motivating", "youtube_search_url": "https://www.youtube.com/results?search_query=Stronger+Kanye+West", "spotify_search_url": "https://open.spotify.com/search/Stronger%20Kanye%20West"},
            {"title": "Can't Stop the Feeling!", "artist": "Justin Timberlake", "genre": "Pop · Uplifting", "mood_tag": "joyful", "youtube_search_url": "https://www.youtube.com/results?search_query=Cant+Stop+the+Feeling+Justin+Timberlake", "spotify_search_url": "https://open.spotify.com/search/Can't%20Stop%20the%20Feeling%20Justin%20Timberlake"},
            {"title": "Work From Home Lofi", "artist": "Lofi Girl", "genre": "Lofi · Focus", "mood_tag": "focus", "youtube_search_url": "https://www.youtube.com/results?search_query=lofi+girl+work+from+home", "spotify_search_url": "https://open.spotify.com/search/lofi%20work%20from%20home"},
        ],
        "Stressed": [
            {"title": "Weightless", "artist": "Marconi Union", "genre": "Ambient · Calming", "mood_tag": "calming", "youtube_search_url": "https://www.youtube.com/results?search_query=Weightless+Marconi+Union", "spotify_search_url": "https://open.spotify.com/search/Weightless%20Marconi%20Union"},
            {"title": "Clair de Lune", "artist": "Claude Debussy", "genre": "Classical · Peaceful", "mood_tag": "peaceful", "youtube_search_url": "https://www.youtube.com/results?search_query=Clair+de+Lune+Debussy", "spotify_search_url": "https://open.spotify.com/search/Clair%20de%20Lune%20Debussy"},
            {"title": "Lo-Fi Study Beats", "artist": "ChilledCow", "genre": "Lofi · Relaxing", "mood_tag": "de-stress", "youtube_search_url": "https://www.youtube.com/results?search_query=lofi+study+beats+chill", "spotify_search_url": "https://open.spotify.com/search/lofi%20study%20beats%20chill"},
        ],
        "Tired": [
            {"title": "Here Comes the Sun", "artist": "The Beatles", "genre": "Classic Rock · Warm", "mood_tag": "uplifting", "youtube_search_url": "https://www.youtube.com/results?search_query=Here+Comes+the+Sun+Beatles", "spotify_search_url": "https://open.spotify.com/search/Here%20Comes%20the%20Sun%20Beatles"},
            {"title": "Good as Hell", "artist": "Lizzo", "genre": "Pop · Empowering", "mood_tag": "energising", "youtube_search_url": "https://www.youtube.com/results?search_query=Good+as+Hell+Lizzo", "spotify_search_url": "https://open.spotify.com/search/Good%20as%20Hell%20Lizzo"},
            {"title": "Energy Boost Playlist", "artist": "Spotify Curated", "genre": "Pop · Workout", "mood_tag": "energy", "youtube_search_url": "https://www.youtube.com/results?search_query=energy+boost+music+playlist+2024", "spotify_search_url": "https://open.spotify.com/search/energy%20boost%20playlist%202024"},
        ],
        "default": [
            {"title": "Blinding Lights", "artist": "The Weeknd", "genre": "Synthpop · Trending", "mood_tag": "trending", "youtube_search_url": "https://www.youtube.com/results?search_query=Blinding+Lights+The+Weeknd", "spotify_search_url": "https://open.spotify.com/search/Blinding%20Lights%20The%20Weeknd"},
            {"title": "As It Was", "artist": "Harry Styles", "genre": "Pop · Chill", "mood_tag": "chill", "youtube_search_url": "https://www.youtube.com/results?search_query=As+It+Was+Harry+Styles", "spotify_search_url": "https://open.spotify.com/search/As%20It%20Was%20Harry%20Styles"},
            {"title": "Levitating", "artist": "Dua Lipa", "genre": "Pop · Dance", "mood_tag": "upbeat", "youtube_search_url": "https://www.youtube.com/results?search_query=Levitating+Dua+Lipa", "spotify_search_url": "https://open.spotify.com/search/Levitating%20Dua%20Lipa"},
            {"title": "Remote Work Lofi Playlist", "artist": "Lofi Hip Hop", "genre": "Lofi · Focus", "mood_tag": "focus", "youtube_search_url": "https://www.youtube.com/results?search_query=lofi+hip+hop+remote+work+playlist", "spotify_search_url": "https://open.spotify.com/search/lofi%20remote%20work%20playlist"},
        ],
    }

    if api_key:
        try:
            client = OpenAI(api_key=api_key, timeout=30.0, max_retries=1)
            completion = client.chat.completions.create(
                model="gpt-4o-mini",
                response_format={"type": "json_object"},
                messages=[
                    {
                        "role": "system",
                        "content": "You are a music recommendation AI. Return only valid JSON.",
                    },
                    {
                        "role": "user",
                        "content": (
                            f"Suggest 4 trending songs or playlists for someone who is feeling '{mood}' while working remotely. "
                            "Include a mix of uplifting, focus, and relaxing tracks trending in 2024-2025. "
                            "Return JSON: {\"tracks\": [{\"title\": str, \"artist\": str, \"genre\": str, \"mood_tag\": str, "
                            "\"youtube_search_url\": \"https://www.youtube.com/results?search_query=...\", "
                            "\"spotify_search_url\": \"https://open.spotify.com/search/...\"}]}"
                        ),
                    },
                ],
                temperature=0.7,
                max_tokens=600,
            )
            content = (completion.choices[0].message.content or "{}").strip()
            parsed = json.loads(content)
            tracks = parsed.get("tracks") or []
            if tracks and isinstance(tracks, list):
                return {"tracks": tracks[:4], "source": "openai"}
        except Exception:
            pass

    # Fallback
    tracks = fallback_by_mood.get(mood, fallback_by_mood["default"])
    return {"tracks": tracks, "source": "curated"}


@router.get("/kdrama")
def kdrama_recommendations() -> dict:
    """Return curated list of popular K-Dramas."""
    return {"dramas": KDRAMA_LIST}
