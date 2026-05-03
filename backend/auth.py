"""Username/password auth using PBKDF2-SHA256 (stdlib only, no extra deps)."""
from __future__ import annotations

import hashlib
import hmac
import os
import re

from fastapi import HTTPException

import database

ITERATIONS = 100_000
USERNAME_RE = re.compile(r"^[A-Za-z0-9_.-]{3,32}$")


def _hash(password: str) -> str:
    salt = os.urandom(16)
    h = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, ITERATIONS)
    return f"pbkdf2_sha256${ITERATIONS}${salt.hex()}${h.hex()}"


def _verify(password: str, stored: str) -> bool:
    try:
        algo, iters, salt_hex, hash_hex = stored.split("$")
        if algo != "pbkdf2_sha256":
            return False
        h = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            bytes.fromhex(salt_hex),
            int(iters),
        )
        return hmac.compare_digest(h, bytes.fromhex(hash_hex))
    except Exception:
        return False


def _normalize_username(username: str) -> str:
    username = (username or "").strip().lower()
    if not USERNAME_RE.match(username):
        raise HTTPException(
            status_code=400,
            detail="Username must be 3-32 chars: letters, numbers, _ . -",
        )
    return username


def _check_password(password: str) -> str:
    if not password or len(password) < 4:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 4 characters",
        )
    return password


async def signup(username: str, password: str) -> dict:
    username = _normalize_username(username)
    password = _check_password(password)
    created = await database.create_user(username, _hash(password))
    if not created:
        raise HTTPException(status_code=409, detail="Username already taken")
    return {"username": username, "success": True}


async def signin(username: str, password: str) -> dict:
    username = _normalize_username(username)
    password = _check_password(password)
    user = await database.get_user(username)
    if not user or not _verify(password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    return {"username": username, "success": True}
