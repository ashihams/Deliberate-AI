import os
from web3 import Web3

RPC_URL = os.getenv("RPC_URL", "https://sepolia.base.org")
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS", "")
PRIVATE_KEY = os.getenv("PRIVATE_KEY", "")

CONTRACT_ABI = [
    {
        "inputs": [
            {"name": "question", "type": "string"},
            {"name": "verdict", "type": "string"},
            {"name": "agentId", "type": "string"},
            {"name": "userAgreed", "type": "bool"},
        ],
        "name": "logDecision",
        "outputs": [],
        "type": "function",
    },
    {
        "inputs": [{"name": "agentId", "type": "string"}],
        "name": "getReputation",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [
            {"name": "agentId", "type": "string"},
            {"name": "ensName", "type": "string"},
        ],
        "name": "registerAgent",
        "outputs": [],
        "type": "function",
    },
    {
        "inputs": [],
        "name": "getAllAgents",
        "outputs": [{"name": "", "type": "string[]"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [{"name": "agentId", "type": "string"}],
        "name": "getAgentStats",
        "outputs": [
            {"name": "reputation", "type": "uint256"},
            {"name": "totalVotes", "type": "uint256"},
            {"name": "upvotes", "type": "uint256"},
            {"name": "ensName", "type": "string"},
            {"name": "creator", "type": "address"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
]


def get_contract():
    if not CONTRACT_ADDRESS:
        return None, None
    w3 = Web3(Web3.HTTPProvider(RPC_URL))
    contract = w3.eth.contract(
        address=Web3.to_checksum_address(CONTRACT_ADDRESS),
        abi=CONTRACT_ABI,
    )
    return w3, contract


async def get_reputation_onchain(agent_id: str) -> int:
    try:
        w3, contract = get_contract()
        if not contract:
            return 500
        rep = contract.functions.getReputation(agent_id).call()
        return int(rep)
    except Exception:
        return 500


async def get_all_reputations(agent_ids: list[str]) -> dict:
    reputations = {}
    for agent_id in agent_ids:
        reputations[agent_id] = await get_reputation_onchain(agent_id)
    return reputations


async def log_decision_onchain(
    question: str, verdict: str, agent_id: str, user_agreed: bool
) -> str:
    try:
        w3, contract = get_contract()
        if not contract or not PRIVATE_KEY:
            return ""

        account = w3.eth.account.from_key(PRIVATE_KEY)
        nonce = w3.eth.get_transaction_count(account.address)

        tx = contract.functions.logDecision(
            question, verdict, agent_id, user_agreed
        ).build_transaction(
            {
                "from": account.address,
                "nonce": nonce,
                "gas": 500000,
                "gasPrice": w3.eth.gas_price,
                "chainId": 84532,
            }
        )

        signed = w3.eth.account.sign_transaction(tx, private_key=PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        return tx_hash.hex()
    except Exception as e:
        print(f"Blockchain log failed: {e}")
        return ""


async def register_agent_onchain(agent_id: str, ens_name: str) -> str:
    try:
        w3, contract = get_contract()
        if not contract or not PRIVATE_KEY:
            return ""

        account = w3.eth.account.from_key(PRIVATE_KEY)
        nonce = w3.eth.get_transaction_count(account.address)

        tx = contract.functions.registerAgent(
            agent_id, ens_name
        ).build_transaction(
            {
                "from": account.address,
                "nonce": nonce,
                "gas": 500000,
                "gasPrice": w3.eth.gas_price,
                "chainId": 84532,
            }
        )

        signed = w3.eth.account.sign_transaction(tx, private_key=PRIVATE_KEY)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        return tx_hash.hex()
    except Exception as e:
        print(f"Agent registration onchain failed: {e}")
        return ""


async def get_agent_stats_onchain(agent_id: str) -> dict:
    try:
        w3, contract = get_contract()
        if not contract:
            return {"reputation": 500, "total_votes": 0, "upvotes": 0}

        stats = contract.functions.getAgentStats(agent_id).call()
        return {
            "reputation": int(stats[0]),
            "total_votes": int(stats[1]),
            "upvotes": int(stats[2]),
            "ens_name": stats[3],
            "creator": stats[4],
        }
    except Exception:
        return {"reputation": 500, "total_votes": 0, "upvotes": 0}
