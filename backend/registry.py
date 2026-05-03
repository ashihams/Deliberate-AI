import os
from models import AgentConfig, AgentRegistration
from agents import DEFAULT_AGENTS
from axl_service import start_axl_node

BASE_AXL_PORT = int(os.getenv("AXL_BASE_PORT", 9000))


class AgentRegistry:
    def __init__(self):
        self.agents: dict[str, AgentConfig] = {}
        self._load_defaults()

    def _load_defaults(self):
        for i, agent in enumerate(DEFAULT_AGENTS):
            agent.axl_port = BASE_AXL_PORT + i + 1
            self.agents[agent.id] = agent

    def register_agent(self, registration: AgentRegistration) -> AgentConfig:
        agent_id = registration.name.lower().replace(" ", "")

        if agent_id in self.agents:
            raise ValueError(f"Agent {agent_id} already exists")

        used_ports = [a.axl_port for a in self.agents.values()]
        next_port = max(used_ports) + 1 if used_ports else BASE_AXL_PORT + 1

        config = AgentConfig(
            id=agent_id,
            name=registration.name,
            role=registration.role,
            style=registration.style,
            model=registration.model,
            ens_name=f"{agent_id}.deliberate.eth",
            axl_port=next_port,
            reputation=500,
        )

        try:
            from ens_service import create_ens_subname
            create_ens_subname(agent_id)
        except:
            pass

        self.agents[agent_id] = config
        try:
            start_axl_node()
        except:
            pass
        return config

    def get_all_agents(self) -> list[AgentConfig]:
        return list(self.agents.values())

    def get_agent(self, agent_id: str) -> AgentConfig:
        return self.agents.get(agent_id)

    def update_reputation(self, agent_id: str, new_rep: int):
        if agent_id in self.agents:
            self.agents[agent_id].reputation = new_rep

    def hydrate_agent(self, agent_dict: dict) -> AgentConfig | None:
        """Re-add an agent loaded from the database (skip if already present)."""
        try:
            config = AgentConfig(**agent_dict)
        except Exception:
            return None
        if config.id in self.agents:
            return self.agents[config.id]
        used_ports = [a.axl_port for a in self.agents.values()]
        if not config.axl_port:
            config.axl_port = (max(used_ports) + 1) if used_ports else BASE_AXL_PORT + 1
        self.agents[config.id] = config
        return config
