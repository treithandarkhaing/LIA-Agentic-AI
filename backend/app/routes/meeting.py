from fastapi import APIRouter

from app.schemas.meeting import MeetingRequest, MeetingResponse
from app.services.meeting_agent import MeetingAgent


router = APIRouter(prefix="/meeting", tags=["Meeting Agent"])
agent = MeetingAgent()


@router.post("/summarize", response_model=MeetingResponse)
def summarize(payload: MeetingRequest) -> MeetingResponse:
    return agent.summarize(payload)
