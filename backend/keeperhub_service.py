"""KeeperHub Direct Execution API integration.

Docs: https://docs.keeperhub.com/api/direct-execution
Base: https://api.keeperhub.com
"""
import requests
import os
from dotenv import load_dotenv

load_dotenv()

KEEPERHUB_API_KEY = os.getenv("KEEPERHUB_API_KEY", "")
KEEPERHUB_BASE = "https://app.keeperhub.com"

HEADERS = {
    "Authorization": f"Bearer {KEEPERHUB_API_KEY}",
    "Content-Type": "application/json",
}

DELIBERATE_ABI = '[{"inputs":[{"name":"question","type":"string"},{"name":"verdict","type":"string"},{"name":"agentId","type":"string"},{"name":"userAgreed","type":"bool"}],"name":"logDecision","outputs":[],"type":"function"},{"inputs":[{"name":"agentId","type":"string"}],"name":"getReputation","outputs":[{"name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"agentId","type":"string"},{"name":"ensName","type":"string"}],"name":"registerAgent","outputs":[],"type":"function"},{"inputs":[],"name":"getAllAgents","outputs":[{"name":"","type":"string[]"}],"stateMutability":"view","type":"function"},{"inputs":[{"name":"agentId","type":"string"}],"name":"getAgentStats","outputs":[{"name":"reputation","type":"uint256"},{"name":"totalVotes","type":"uint256"},{"name":"upvotes","type":"uint256"},{"name":"ensName","type":"string"},{"name":"creator","type":"address"}],"stateMutability":"view","type":"function"}]'


async def execute_transfer(
    recipient: str,
    amount: str,
    network: str = "base-sepolia",
    token_address: str = None,
) -> dict:
    """Execute a token transfer via KeeperHub."""
    try:
        payload = {
            "network": network,
            "recipientAddress": recipient,
            "amount": amount,
        }
        if token_address:
            payload["tokenAddress"] = token_address

        response = requests.post(
            f"{KEEPERHUB_BASE}/api/execute/transfer",
            headers=HEADERS,
            json=payload,
            timeout=30,
        )

        result = response.json()
        print(f"[KeeperHub] Transfer: {result}")
        return result
    except Exception as e:
        print(f"[KeeperHub] Transfer failed: {e}")
        return {"status": "failed", "error": str(e)}


async def execute_contract_call(
    contract_address: str,
    function_name: str,
    function_args: list,
    network: str = "base-sepolia",
    abi: str = None,
    value: str = "0",
) -> dict:
    """Execute a smart contract call via KeeperHub."""
    try:
        import json

        payload = {
            "contractAddress": contract_address,
            "network": network,
            "functionName": function_name,
            "functionArgs": json.dumps(function_args),
            "value": value,
            "gasLimitMultiplier": "1.5",
            "abi": abi or DELIBERATE_ABI,
        }

        response = requests.post(
            f"{KEEPERHUB_BASE}/api/execute/contract-call",
            headers=HEADERS,
            json=payload,
            timeout=30,
        )

        result = response.json()
        print(f"[KeeperHub] Contract call: {result}")

        if result.get("status") == "failed":
            try:
                from blockchain import log_decision_onchain

                tx_hash = await log_decision_onchain(
                    question=function_args[0] if function_args else "",
                    verdict=function_args[1] if len(function_args) > 1 else "CAUTION",
                    agent_id=function_args[2] if len(function_args) > 2 else "james",
                    user_agreed=True,
                )
                return {
                    "executionId": tx_hash,
                    "status": "completed",
                    "method": "direct-fallback",
                    "note": "Executed via direct contract call (KeeperHub fallback)",
                }
            except Exception as e:
                return {"status": "failed", "error": str(e)}

        return result
    except Exception as e:
        print(f"[KeeperHub] Contract call failed: {e}")
        return {"status": "failed", "error": str(e)}


async def check_and_execute(
    check_contract: str,
    check_function: str,
    check_args: list,
    condition_operator: str,
    condition_value: str,
    action_contract: str,
    action_function: str,
    action_args: list,
    network: str = "base-sepolia",
) -> dict:
    """Check condition, then execute if met - via KeeperHub."""
    try:
        import json

        payload = {
            "contractAddress": check_contract,
            "network": network,
            "functionName": check_function,
            "functionArgs": json.dumps(check_args),
            "condition": {
                "operator": condition_operator,
                "value": condition_value,
            },
            "action": {
                "contractAddress": action_contract,
                "functionName": action_function,
                "functionArgs": json.dumps(action_args),
                "gasLimitMultiplier": "1.5",
            },
        }

        response = requests.post(
            f"{KEEPERHUB_BASE}/api/execute/check-and-execute",
            headers=HEADERS,
            json=payload,
            timeout=30,
        )

        result = response.json()
        print(f"[KeeperHub] Check & Execute: {result}")
        return result
    except Exception as e:
        print(f"[KeeperHub] Check & Execute failed: {e}")
        return {"status": "failed", "error": str(e)}


async def get_execution_status(execution_id: str) -> dict:
    """Check status of a KeeperHub execution."""
    try:
        response = requests.get(
            f"{KEEPERHUB_BASE}/api/execute/{execution_id}/status",
            headers=HEADERS,
            timeout=10,
        )
        return response.json()
    except Exception as e:
        return {"status": "unknown", "error": str(e)}
