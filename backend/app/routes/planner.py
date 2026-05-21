from fastapi import APIRouter

from app.schemas.planner import PlannerChatRequest, PlannerChatResponse, PlannerRequest, PlannerResponse
from app.services.planner_agent import PlannerAgent


router = APIRouter(prefix="/planner", tags=["Planner Agent"])
agent = PlannerAgent()


@router.post("/generate", response_model=PlannerResponse)
def generate_plan(payload: PlannerRequest) -> PlannerResponse:
    return agent.generate(payload)


@router.post("/chat", response_model=PlannerChatResponse)
def chat(payload: PlannerChatRequest) -> PlannerChatResponse:
    return agent.chat(payload)
