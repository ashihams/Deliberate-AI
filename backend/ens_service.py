import os
from dotenv import load_dotenv
from web3 import Web3
from ens import ENS
from eth_account import Account

load_dotenv()

ALCHEMY_KEY = os.getenv("ALCHEMY_API_KEY", "")
ALCHEMY_RPC = f"https://eth-sepolia.g.alchemy.com/v2/{ALCHEMY_KEY}"
PRIVATE_KEY = os.getenv("PRIVATE_KEY", "")
ENS_REGISTRY = "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e"
ENS_PARENT = os.getenv("ENS_PARENT", "deliberate.eth")

REGISTRY_ABI = [
    {
        "inputs": [
            {"name": "node", "type": "bytes32"},
            {"name": "label", "type": "bytes32"},
            {"name": "owner", "type": "address"}
        ],
        "name": "setSubnodeOwner",
        "outputs": [{"name": "", "type": "bytes32"}],
        "type": "function"
    }
]


def get_ens_w3():
    return Web3(Web3.HTTPProvider(ALCHEMY_RPC))


def namehash(name):
    node = b'\x00' * 32
    if name:
        labels = name.split('.')
        for label in reversed(labels):
            label_hash = Web3.keccak(text=label)
            node = Web3.keccak(node + label_hash)
    return node


def resolve_ens_name(ens_name: str) -> str:
    try:
        w3 = get_ens_w3()
        ns = ENS.from_web3(w3)
        address = ns.address(ens_name)
        return address or ""
    except Exception as e:
        print(f"[ENS] Resolve failed for {ens_name}: {e}")
        return ""


def reverse_lookup(address: str) -> str:
    try:
        w3 = get_ens_w3()
        ns = ENS.from_web3(w3)
        name = ns.name(address)
        return name or ""
    except Exception as e:
        print(f"[ENS] Reverse lookup failed for {address}: {e}")
        return ""


def build_agent_ens(agent_id: str) -> str:
    return f"{agent_id}.{ENS_PARENT}"


def create_ens_subname(agent_id: str) -> str:
    """Create an ENS subname for a new agent onchain"""
    try:
        w3 = get_ens_w3()
        account = Account.from_key(PRIVATE_KEY)

        contract = w3.eth.contract(
            address=Web3.to_checksum_address(ENS_REGISTRY),
            abi=REGISTRY_ABI
        )

        parent_node = namehash(ENS_PARENT)
        label_hash = Web3.keccak(text=agent_id)

        tx = contract.functions.setSubnodeOwner(
            parent_node,
            label_hash,
            account.address
        ).build_transaction({
            "from": account.address,
            "nonce": w3.eth.get_transaction_count(account.address),
            "gas": 100000,
            "gasPrice": w3.eth.gas_price,
            "chainId": 11155111
        })

        signed = w3.eth.account.sign_transaction(tx, account.key)
        tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

        ens_name = f"{agent_id}.{ENS_PARENT}"
        if receipt.status == 1:
            print(f"[ENS] Created {ens_name} - TX: {tx_hash.hex()}")
            return ens_name
        else:
            print(f"[ENS] Failed to create {ens_name}")
            return ens_name
    except Exception as e:
        print(f"[ENS] Subname creation failed for {agent_id}: {e}")
        return f"{agent_id}.{ENS_PARENT}"