"""MongoDB persistence layer (Motor async driver).

Collections:
  users        - { username, password_hash }
  chats        - { username, messages: [...] }            (one doc per user)
  user_agents  - { username, agents: [AgentConfig dict] } (one doc per user)
"""
from __future__ import annotations

import os
from typing import Any

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_DB", "deliberate")

_client: AsyncIOMotorClient | None = None
_db = None


def get_db():
    global _client, _db
    if _db is None:
        _client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=5000)
        _db = _client[DB_NAME]
    return _db


async def ping() -> bool:
    try:
        await get_db().command("ping")
        return True
    except Exception as e:
        print(f"[DB] Ping failed: {e}")
        return False


async def ensure_indexes() -> None:
    db = get_db()
    try:
        await db.users.create_index("username", unique=True)
        await db.chats.create_index("username", unique=True)
        await db.user_agents.create_index("username", unique=True)
    except Exception as e:
        print(f"[DB] ensure_indexes failed: {e}")


async def get_user(username: str) -> dict | None:
    return await get_db().users.find_one({"username": username})


async def create_user(username: str, password_hash: str) -> bool:
    """Returns True if user was created, False if username already exists."""
    db = get_db()
    existing = await db.users.find_one({"username": username})
    if existing:
        return False
    await db.users.insert_one(
        {"username": username, "password_hash": password_hash}
    )
    return True


async def load_chat(username: str) -> list[dict]:
    doc = await get_db().chats.find_one({"username": username})
    return list(doc.get("messages", [])) if doc else []


async def save_chat(username: str, messages: list[dict]) -> None:
    await get_db().chats.update_one(
        {"username": username},
        {"$set": {"username": username, "messages": messages}},
        upsert=True,
    )


async def clear_chat(username: str) -> None:
    await get_db().chats.update_one(
        {"username": username},
        {"$set": {"messages": []}},
        upsert=True,
    )


async def load_user_agents(username: str) -> list[dict]:
    doc = await get_db().user_agents.find_one({"username": username})
    return list(doc.get("agents", [])) if doc else []


async def add_user_agent(username: str, agent: dict) -> None:
    await get_db().user_agents.update_one(
        {"username": username},
        {
            "$push": {"agents": agent},
            "$setOnInsert": {"username": username},
        },
        upsert=True,
    )


async def all_user_agents() -> list[dict]:
    """Flat list of every user-created agent. Used to rehydrate the registry on boot."""
    cursor = get_db().user_agents.find({}, {"_id": 0})
    out: list[dict] = []
    async for doc in cursor:
        for agent in doc.get("agents", []):
            out.append(agent)
    return out
