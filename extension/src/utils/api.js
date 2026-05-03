// Thin wrappers around the backend HTTP API. Bodies and shapes are identical
// to what popup.js used to send. No behavior change vs. the legacy script.

export const API_BASE = "http://localhost:8001";

export async function fetchPortfolio(walletAddress) {
  const res = await fetch(`${API_BASE}/portfolio`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ wallet_address: walletAddress }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

export async function fetchAgents() {
  const res = await fetch(`${API_BASE}/agents`);
  return res.json();
}

export async function postChat({ message, wallet_address, active_agents, session_id = "default" }) {
  const res = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, wallet_address, active_agents, session_id }),
  });
  return res.json();
}

export async function logDecision({ question, verdict, agent_id, user_agreed, wallet_address }) {
  const res = await fetch(`${API_BASE}/decisions/log`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, verdict, agent_id, user_agreed, wallet_address }),
  });
  return res.json();
}

export async function registerAgent({ name, role, style, model, wallet_address }) {
  const res = await fetch(`${API_BASE}/agents/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, role, style, model, wallet_address }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Unknown error");
  }
  return res.json();
}
