# Deliberate

**A plug-and-play multi-agent framework where AI agents debate decisions based on your wallet, and their reputation is tracked onchain.**

---
## Workflow
<img width="3190" height="652" alt="mermaid-diagram-2026-05-03-234533" src="https://github.com/user-attachments/assets/b67da2b3-da81-4d25-949d-6dc8381c764a" />

## Architecture
```
deliberate/
├── backend/          # FastAPI server
│   ├── main.py       # API endpoints
│   ├── agents.py     # Agent class + 4 default agents
│   ├── registry.py   # AgentRegistry
│   ├── debate.py     # DebateEngine orchestration
│   ├── axl_service.py# AXL P2P node management
│   ├── ens_service.py# ENS name resolution
│   ├── portfolio.py  # Wallet reading via Moralis
│   ├── blockchain.py # Contract interaction (Base Sepolia)
│   ├── models.py     # Pydantic models
│   └── requirements.txt
├── extension/        # Chrome extension
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.js
│   └── styles.css
├── axl/              # AXL binary (place axl executable here)
└── .env
```

---

## Quick Start

### Backend

```bash
cd deliberate/backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Chrome Extension

1. Open Chrome → `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select `deliberate/extension/`

---

## Default Agents

| ID     | Name   | Role              | ENS                       |
|--------|--------|-------------------|---------------------------|
| marcus | Marcus | Growth Analyst    | marcus.deliberate.eth     |
| diana  | Diana  | Risk Manager      | diana.deliberate.eth      |
| raj    | Raj    | Quant Analyst     | raj.deliberate.eth        |
| james  | James  | Committee Chair   | james.deliberate.eth      |

---

## API Endpoints

| Method | Path                        | Description                     |
|--------|-----------------------------|---------------------------------|
| GET    | /health                     | Health check                    |
| POST   | /portfolio                  | Read wallet holdings             |
| POST   | /debate                     | Run multi-agent debate          |
| GET    | /agents                     | List all agents + reputations   |
| POST   | /agents/register            | Register a new agent            |
| POST   | /decisions/log              | Log decision to blockchain      |
| GET    | /agents/{id}/reputation     | Get live onchain reputation     |

---

## Environment Variables

| Variable         | Description                                  |
|------------------|----------------------------------------------|
| GROQ_API_KEY     | Groq API key for LLM inference               |
| API_BASE_URL     | LLM API base URL (Groq OpenAI-compatible)    |
| MORALIS_API_KEY  | Moralis API key for token balances           |
| RPC_URL          | EVM RPC endpoint (Base Sepolia)              |
| CONTRACT_ADDRESS | Deployed Deliberate contract address         |
| PRIVATE_KEY      | Wallet private key for onchain writes        |
| AXL_BASE_PORT    | Starting port for AXL P2P nodes (default 9000)|
| ENS_PARENT       | ENS parent domain (deliberate.eth)           |

---
## Onchain Agent Identity (ENS)
Each AI agent in Deliberate has a real onchain identity via ENS on Sepolia.

Agents are not just labels in code — they are registered as ENS subnames under `deliberate.eth`, making them verifiable, portable identities onchain.

- marcus.deliberate.eth  
- diana.deliberate.eth  
- raj.deliberate.eth  
- james.deliberate.eth  

When a user creates a custom agent, the system automatically executes 3 onchain transactions:
1. Create subname (setSubnodeOwner)
2. Set resolver
3. Assign address

This gives every agent a persistent onchain identity.
<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/c5d7e466-6739-40ac-86c6-0effa4644721" />

## AXL P2P

<img width="875" height="484" alt="Screenshot 2026-05-02 221558" src="https://github.com/user-attachments/assets/bcc3e3ac-d54e-4f84-a296-43e6d6edd33d" />
Place the AXL binary at `deliberate/axl/axl`. Each agent gets its own AXL node:

- marcus → port 9001
- diana  → port 9002
- raj    → port 9003
- james  → port 9004

AXL nodes are started automatically at server startup. If AXL is unavailable, debates fall back to direct in-process calls.

---

## Blockchain (Base Sepolia)

Decisions are logged onchain via `logDecision()`. Agent reputations are read live from `getReputation()`. The contract is deployed at `CONTRACT_ADDRESS` on Base Sepolia (chain ID 84532).

<img width="1920" height="1080" alt="image" src="https://github.com/user-attachments/assets/3316d2a5-6fb0-407c-81c8-201bc6497897" />

View transactions: https://sepolia.basescan.org
