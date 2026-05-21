from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine, init_db
from app.models import auth, learning_content, meeting_intelligence, wellbeing  # noqa: F401
from app.routes import auth as auth_routes, learning, meeting, meeting_intelligence as meeting_intelligence_routes, planner, wellness
from app.security import ensure_default_auth_user, require_active_user


app = FastAPI(
    title="AI Learning & Delivery Operations Copilot",
    description="Agentic AI MVP for Learning and Delivery Operations.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    Base.metadata.create_all(bind=engine)
    ensure_default_auth_user()


@app.get("/health")
def health() -> dict:
    return {"status": "online", "agents": ["planner", "meeting", "learning", "wellness"]}


app.include_router(auth_routes.router)
app.include_router(meeting.router, dependencies=[Depends(require_active_user)])
app.include_router(meeting_intelligence_routes.router, dependencies=[Depends(require_active_user)])
app.include_router(learning.router, dependencies=[Depends(require_active_user)])
app.include_router(wellness.router, dependencies=[Depends(require_active_user)])
app.include_router(planner.router, dependencies=[Depends(require_active_user)])
