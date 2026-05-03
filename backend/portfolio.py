import os
import requests
from web3 import Web3
from models import Portfolio


async def get_portfolio(wallet_address: str) -> Portfolio:
    MORALIS_KEY = os.getenv("MORALIS_API_KEY")
    RPC_URL = os.getenv("RPC_URL", "https://sepolia.base.org")

    w3 = Web3(Web3.HTTPProvider(RPC_URL))

    try:
        balance_wei = w3.eth.get_balance(wallet_address)
        eth_balance = float(w3.from_wei(balance_wei, "ether"))
    except Exception:
        eth_balance = 0.0

    tokens = []
    try:
        response = requests.get(
            f"https://deep-index.moralis.io/api/v2.2/wallets/{wallet_address}/tokens",
            headers={"X-API-Key": MORALIS_KEY},
            params={"chain": "base"},
            timeout=10,
        )
        if response.status_code == 200:
            token_data = response.json().get("result", [])
            tokens = [
                {
                    "symbol": t.get("symbol", "UNKNOWN"),
                    "balance": float(t.get("balance_formatted", 0)),
                    "usd_value": float(t.get("usd_value", 0) or 0),
                }
                for t in token_data[:10]
            ]
    except Exception:
        pass

    portfolio_lines = [f"ETH: {eth_balance:.4f} ETH"]
    for token in tokens:
        if token["balance"] > 0:
            line = f"{token['symbol']}: {token['balance']:.4f}"
            if token["usd_value"] > 0:
                line += f" (~${token['usd_value']:.2f})"
            portfolio_lines.append(line)

    if not tokens and eth_balance == 0:
        portfolio_text = "New wallet — no holdings detected yet."
    else:
        portfolio_text = "User's current holdings:\n" + "\n".join(portfolio_lines)

    summary = portfolio_text.split("\n")[1] if "\n" in portfolio_text else portfolio_text

    return Portfolio(
        address=wallet_address,
        eth_balance=eth_balance,
        tokens=tokens,
        portfolio_text=portfolio_text,
        summary=summary,
    )
