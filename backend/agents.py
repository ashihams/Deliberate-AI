import os
from crewai import Agent as CrewAgent
from crewai import LLM
from models import AgentConfig


def create_crew_agent(config: AgentConfig) -> CrewAgent:
    llm = LLM(
        model=f"groq/{config.model}",
        api_key=os.getenv("GROQ_API_KEY"),
    )
    return CrewAgent(
        role=config.role,
        goal=f"Provide {config.role} perspective on crypto decisions",
        backstory=config.style,
        llm=llm,
        verbose=False,
    )


class Agent:
    def __init__(self, config: AgentConfig):
        self.config = config


DEFAULT_AGENTS = [
    AgentConfig(
        id="marcus",
        name="Marcus",
        role="Growth Analyst",
        style="Optimistic, finds opportunity, argues for upside. Always looks for the bull case.",
        ens_name="marcus.deliberate.eth",
        axl_port=9001,
        reputation=500,
        color="#7F77DD",
    ),
    AgentConfig(
        id="diana",
        name="Diana",
        role="Risk Manager",
        style="Skeptical, protective. Flags every red flag. Argues why the user should be cautious.",
        ens_name="diana.deliberate.eth",
        axl_port=9002,
        reputation=500,
        color="#1D9E75",
    ),
    AgentConfig(
        id="raj",
        name="Raj",
        role="Quantitative Analyst",
        style="Data only, no emotion. Cites specific numbers, percentages, and statistics.",
        ens_name="raj.deliberate.eth",
        axl_port=9003,
        reputation=500,
        color="#EF9F27",
    ),
    AgentConfig(
        id="james",
        name="James",
        role="Committee Chair",
        style="Balanced synthesiser. Reads all arguments and gives a clear final verdict with reasoning.",
        ens_name="james.deliberate.eth",
        axl_port=9004,
        reputation=500,
        color="#378ADD",
    ),
]
