import os
import traceback
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

load_dotenv()

from models import (
    AgentRegistration,
    AuthRequest,
    ChatHistorySave,
    ChatMessage,
    ChatResponse,
    DecisionLog,
    Portfolio,
)
from registry import AgentRegistry
from chat import GroupChat
from portfolio import get_portfolio
from blockchain import (
    get_all_reputations,
    get_agent_stats_onchain,
    log_decision_onchain,
    register_agent_onchain,
)
from axl_service import start_axl_node, is_running

import auth
import database

registry = AgentRegistry()
sessions: dict[str, GroupChat] = {}


def get_session(session_id: str) -> GroupChat:
    if session_id not in sessions:
        sessions[session_id] = GroupChat(registry.get_all_agents())
    return sessions[session_id]


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_axl_node()  # best-effort; app runs fine without AXL
    if await database.ping():
        try:
            await database.ensure_indexes()
            users_count = await database.get_db().users.count_documents({})
            chats_count = await database.get_db().chats.count_documents({})
            agents_count = await database.get_db().user_agents.count_documents({})
            hydrated = 0
            for agent_dict in await database.all_user_agents():
                if registry.hydrate_agent(agent_dict):
                    hydrated += 1
            print(
                f"[DB] MongoDB connected to '{database.DB_NAME}' "
                f"(users={users_count}, chats={chats_count}, "
                f"user_agents={agents_count}, hydrated={hydrated})"
            )
        except Exception as e:
            print(f"[DB] Connected but startup tasks failed: {e}")
    else:
        print(
            "[DB] MongoDB unreachable - check MONGO_URL / Atlas IP allowlist. "
            "Auth and history endpoints will return errors until this is fixed."
        )
    yield


app = FastAPI(title="Deliberate", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PortfolioRequest(BaseModel):
    wallet_address: str


@app.get("/health")
async def health():
    db_ok = await database.ping()
    db_info = {"connected": db_ok}
    if db_ok:
        try:
            db = database.get_db()
            db_info.update(
                {
                    "name": database.DB_NAME,
                    "users": await db.users.count_documents({}),
                    "chats": await db.chats.count_documents({}),
                    "user_agents": await db.user_agents.count_documents({}),
                }
            )
        except Exception as e:
            db_info["error"] = str(e)
    return {"status": "ok", "product": "Deliberate", "mongodb": db_info}


@app.post("/portfolio", response_model=Portfolio)
async def fetch_portfolio(req: PortfolioRequest):
    try:
        return await get_portfolio(req.wallet_address)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat", response_model=list[ChatResponse])
async def chat(req: ChatMessage):
    try:
        portfolio = await get_portfolio(req.wallet_address)

        session = get_session(req.session_id)

        # Sync any newly registered agents into existing sessions
        for agent_config in registry.get_all_agents():
            if agent_config.id not in session.agents:
                from agents import Agent
                session.agents[agent_config.id] = Agent(agent_config)

        responses = await session.process_message(
            user_message=req.message,
            portfolio=portfolio,
            active_agents=req.active_agents,
        )

        # Refresh onchain reputations into responses
        agent_ids = [r["agent_id"] for r in responses]
        reputations = await get_all_reputations(agent_ids)
        for r in responses:
            onchain_rep = reputations.get(r["agent_id"])
            if onchain_rep is not None:
                r["reputation"] = onchain_rep
                registry.update_reputation(r["agent_id"], onchain_rep)
                session.agents[r["agent_id"]].config.reputation = onchain_rep

        return responses
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/debate", response_model=list[ChatResponse])
async def debate(req: ChatMessage):
    return await chat(req)


@app.get("/chat/history")
async def get_chat_history(session_id: str = "default"):
    return get_session(session_id).get_history()


@app.delete("/chat/history")
async def clear_chat_history(session_id: str = "default"):
    get_session(session_id).clear_history()
    return {"cleared": True, "session_id": session_id}


@app.post("/auth/signup")
async def auth_signup(req: AuthRequest):
    return await auth.signup(req.username, req.password)


@app.post("/auth/signin")
async def auth_signin(req: AuthRequest):
    return await auth.signin(req.username, req.password)


@app.get("/users/{username}/chat")
async def get_user_chat(username: str):
    messages = await database.load_chat(username.lower())
    return {"username": username.lower(), "messages": messages}


@app.put("/users/{username}/chat")
async def save_user_chat(username: str, body: ChatHistorySave):
    await database.save_chat(username.lower(), body.messages)
    return {"username": username.lower(), "saved": len(body.messages)}


@app.delete("/users/{username}/chat")
async def delete_user_chat(username: str):
    await database.clear_chat(username.lower())
    return {"username": username.lower(), "cleared": True}


@app.get("/users/{username}/agents")
async def get_user_agents(username: str):
    agents = await database.load_user_agents(username.lower())
    rep_map = await get_all_reputations([a.get("id") for a in agents if a.get("id")])
    for a in agents:
        if a.get("id") in rep_map:
            a["reputation"] = rep_map[a["id"]]
    return agents


@app.get("/agents")
async def list_agents():
    agents = registry.get_all_agents()
    reputations = await get_all_reputations([a.id for a in agents])

    result = []
    for agent in agents:
        data = agent.model_dump()
        data["reputation"] = reputations.get(agent.id, agent.reputation)
        result.append(data)

    return result


@app.post("/agents/register")
async def register_agent(registration: AgentRegistration):
    try:
        config = registry.register_agent(registration)
        await register_agent_onchain(config.id, config.ens_name)
        username = (registration.username or "").strip().lower()
        if username:
            try:
                await database.add_user_agent(username, config.model_dump())
            except Exception as e:
                print(f"[DB] add_user_agent failed for {username}: {e}")
        return config
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/decisions/log")
async def log_decision(decision: DecisionLog):
    try:
        tx_hash = await log_decision_onchain(
            question=decision.question,
            verdict=decision.verdict,
            agent_id=decision.agent_id,
            user_agreed=decision.user_agreed,
        )
        basescan_url = f"https://sepolia.basescan.org/tx/{tx_hash}" if tx_hash else ""
        return {"tx_hash": tx_hash, "basescan_url": basescan_url, "logged": bool(tx_hash)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/agents/{agent_id}/reputation")
async def get_agent_reputation(agent_id: str):
    if not registry.get_agent(agent_id):
        raise HTTPException(status_code=404, detail=f"Agent {agent_id} not found")

    stats = await get_agent_stats_onchain(agent_id)
    registry.update_reputation(agent_id, stats.get("reputation", 500))

    return {
        "agent_id": agent_id,
        "reputation": stats.get("reputation", 500),
        "total_votes": stats.get("total_votes", 0),
        "upvotes": stats.get("upvotes", 0),
    }
