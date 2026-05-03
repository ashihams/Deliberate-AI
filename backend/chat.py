import asyncio
import re
from datetime import datetime, timezone

from crewai import Task, Crew, Process

from models import Portfolio, AgentConfig
from agents import Agent, create_crew_agent
from axl_service import broadcast_message


class GroupChat:
    def __init__(self, agent_configs: list[AgentConfig]):
        self.agents = {a.id: Agent(a) for a in agent_configs}
        self.history: list[dict] = []

    def add_user_message(self, message: str, wallet_address: str):
        self.history.append({
            "role": "user",
            "wallet": wallet_address,
            "content": message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    def detect_mentions(self, message: str) -> list[str]:
        mentions = re.findall(r'@(\w+)', message.lower())
        valid = [m for m in mentions if m in self.agents]
        return valid if valid else list(self.agents.keys())

    def _get_history_text(self) -> str:
        text = ""
        for msg in self.history[-8:]:
            if msg["role"] == "user":
                text += f"User: {msg['content']}\n"
            elif msg.get("agent_name"):
                text += f"{msg['agent_name']}: {msg['content']}\n"
        return text

    async def process_message(
        self,
        user_message: str,
        portfolio: Portfolio,
        active_agents: list[str] = None,
    ) -> list[dict]:
        self.add_user_message(user_message, portfolio.address)

        mentioned = self.detect_mentions(user_message)
        responding = [a for a in mentioned if a in active_agents] if active_agents else mentioned

        items = []
        for agent_id in responding:
            agent = self.agents.get(agent_id)
            if not agent:
                continue
            crew_agent = create_crew_agent(agent.config)
            task = Task(
                description=f"""You are {agent.config.name}, a {agent.config.role}.

User portfolio: {portfolio.portfolio_text}

Chat history: {self._get_history_text()}
User message: {user_message}

Respond in 1-3 sentences as {agent.config.name}. \
Be specific about their portfolio numbers.""",
                agent=crew_agent,
                expected_output="1-3 sentence response",
            )
            items.append((agent_id, agent.config, crew_agent, task))

        responses = []
        for agent_id, config, crew_agent, task in items:
            crew = Crew(
                agents=[crew_agent],
                tasks=[task],
                process=Process.sequential,
                verbose=False,
            )
            result = await asyncio.to_thread(crew.kickoff)
            text = str(result).strip()

            entry = {
                "agent_id": agent_id,
                "agent_name": config.name,
                "ens_name": config.ens_name,
                "content": text,
                "reputation": config.reputation,
                "color": config.color,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            self.history.append({**entry, "role": "agent"})

            try:
                from axl_service import broadcast_message
                broadcast_message(agent_id, {
                    "content": text,
                    "agent_name": config.name,
                    "ens_name": config.ens_name,
                    "topic": user_message
                })
            except:
                pass

            responses.append(entry)

        return responses

    def get_history(self) -> list:
        return self.history

    def clear_history(self):
        self.history = []
