from pydantic import BaseModel


class MeetingRequest(BaseModel):
    transcript: str


class ActionItem(BaseModel):
    task: str
    owner: str
    deadline: str
    status: str


class MeetingResponse(BaseModel):
    agent: str
    summary: str
    decisions: list[str]
    action_items: list[ActionItem]
    blockers: list[str]
    risks: list[str]
