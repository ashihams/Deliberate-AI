import requests
import subprocess
import json
import time
import os

AXL_API = "http://127.0.0.1:9002"
AXL_BINARY = os.getenv("AXL_BINARY_PATH", "../axl/node.exe")
AXL_CONFIG = os.getenv("AXL_CONFIG_PATH", "../axl/node-config.json")
_axl_process = None


def start_axl_node() -> bool:
    global _axl_process
    try:
        _axl_process = subprocess.Popen(
            [AXL_BINARY, "--config", AXL_CONFIG],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        time.sleep(2)
        topo = get_topology()
        if topo:
            print(f"AXL started: {topo.get('our_public_key', '')[:16]}...")
            return True
        return False
    except Exception as e:
        print(f"AXL start failed (continuing without it): {e}")
        return False


def get_topology() -> dict:
    try:
        resp = requests.get(f"{AXL_API}/topology", timeout=3)
        if resp.status_code == 200:
            return resp.json()
    except Exception:
        pass
    return {}


def broadcast_message(from_agent_id: str, message: dict) -> bool:
    try:
        topo = get_topology()
        peers = topo.get("peers", [])
        up_peers = [p for p in peers if p.get("up") and p.get("public_key")]
        for peer in up_peers:
            requests.post(
                f"{AXL_API}/send",
                data=json.dumps({"from": from_agent_id, **message}).encode(),
                headers={"X-Destination-Peer-Id": peer["public_key"]},
                timeout=5,
            )
            print(f"[AXL] Sent from {from_agent_id} to peer {peer['public_key'][:16]}...")
        return True
    except Exception:
        return False


def is_running() -> bool:
    return get_topology() != {}
