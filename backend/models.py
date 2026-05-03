from pydantic import BaseModel


class AgentConfig(BaseModel):
    id: str
    name: str
    role: str
    style: str
    model: str = "llama-3.3-70b-versatile"
    ens_name: str = ""
    axl_port: int = 0
    reputation: int = 500
    total_votes: int = 0
    color: str = "#534AB7"


class Portfolio(BaseModel):
    address: str
    ens_name: str = ""
    eth_balance: float
    tokens: list[dict]
    portfolio_text: str
    summary: str = ""


class ChatMessage(BaseModel):
    message: str
    wallet_address: str
    active_agents: list[str] = ["marcus", "diana", "raj", "james"]
    session_id: str = "default"


class ChatResponse(BaseModel):
    agent_id: str
    agent_name: str
    ens_name: str
    content: str
    reputation: int
    color: str
    timestamp: str


class DecisionLog(BaseModel):
    question: str
    verdict: str
    agent_id: str
    user_agreed: bool
    wallet_address: str


class AgentRegistration(BaseModel):
    name: str
    role: str
    style: str
    model: str = "llama-3.3-70b-versatile"
    wallet_address: str
