// Thin wrappers around the backend HTTP API.

export const API_BASE = "http://localhost:8001";

async function parseError(res, fallback = "Request failed") {
  try {
    const err = await res.json();
    return new Error(err.detail || err.message || fallback);
  } catch (_) {
    return new Error(res.statusText || fallback);
  }
}

export async function fetchPortfolio(walletAddress) {
  const res = await fetch(`${API_BASE}/portfolio`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet_address: walletAddress }),
  });
  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function fetchAgents() {
  const res = await fetch(`${API_BASE}/agents`);
  return res.json();
}

export async function postChat({
  message,
  wallet_address,
  active_agents,
  session_id = "default",
}) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, wallet_address, active_agents, session_id }),
  });
  return res.json();
}

export async function logDecision({
  question,
  verdict,
  agent_id,
  user_agreed,
  wallet_address,
}) {
  const res = await fetch(`${API_BASE}/decisions/log`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, verdict, agent_id, user_agreed, wallet_address }),
  });
  return res.json();
}

export async function registerAgent({
  name,
  role,
  style,
  model,
  wallet_address,
  username = "",
}) {
  const res = await fetch(`${API_BASE}/agents/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, role, style, model, wallet_address, username }),
  });
  if (!res.ok) throw await parseError(res, "Unknown error");
  return res.json();
}

// --- Auth ----------------------------------------------------------------

export async function signup({ username, password }) {
  const res = await fetch(`${API_BASE}/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw await parseError(res, "Sign up failed");
  return res.json();
}

export async function signin({ username, password }) {
  const res = await fetch(`${API_BASE}/auth/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw await parseError(res, "Sign in failed");
  return res.json();
}

// --- Per-user chat history ----------------------------------------------

export async function getUserChat(username) {
  if (!username) return [];
  const res = await fetch(
    `${API_BASE}/users/${encodeURIComponent(username)}/chat`
  );
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.messages) ? data.messages : [];
}

export async function saveUserChat(username, messages) {
  if (!username) return null;
  const res = await fetch(
    `${API_BASE}/users/${encodeURIComponent(username)}/chat`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    }
  );
  if (!res.ok) return null;
  return res.json();
}

export async function getUserAgents(username) {
  if (!username) return [];
  const res = await fetch(
    `${API_BASE}/users/${encodeURIComponent(username)}/agents`
  );
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}
