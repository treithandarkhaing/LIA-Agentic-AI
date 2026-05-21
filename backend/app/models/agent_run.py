from dataclasses import dataclass


@dataclass
class AgentRun:
    id: int | None
    agent_name: str
    summary: str
    created_at: str | None = None
