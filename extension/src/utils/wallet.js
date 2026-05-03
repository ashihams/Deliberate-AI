// Wallet connection logic. Internal handshake (chrome.tabs + chrome.scripting +
// window.ethereum) is preserved unchanged. Demo wallet is used as a fallback so
// the demo flow always reaches the chat page even if MetaMask is missing.

const DEMO_WALLET = "0x94F3Dd2002EF0AD05526849f742280A66fDC5777";

async function tryMetaMask() {
  if (
    typeof chrome === "undefined" ||
    !chrome.tabs ||
    !chrome.scripting ||
    !chrome.storage
  ) {
    return { wallet: "", reason: "no-extension-context" };
  }
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id) {
      return { wallet: "", reason: "no-active-tab" };
    }
    const url = tab.url || "";
    if (
      url.startsWith("chrome://") ||
      url.startsWith("chrome-extension://") ||
      url.startsWith("edge://") ||
      url.startsWith("about:")
    ) {
      return { wallet: "", reason: "restricted-tab" };
    }
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async () => {
        if (!window.ethereum) throw new Error("MetaMask not found");
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        return accounts[0];
      },
    });
    const wallet =
      results && results[0] && typeof results[0].result === "string"
        ? results[0].result
        : "";
    if (wallet) return { wallet, reason: "metamask" };
    return { wallet: "", reason: "metamask-empty" };
  } catch (err) {
    return {
      wallet: "",
      reason: (err && err.message) || "metamask-error",
    };
  }
}

export async function connectWallet() {
  const { wallet: real, reason } = await tryMetaMask();

  if (reason === "restricted-tab") {
    alert(
      "Open a regular webpage (e.g. https://google.com) in the active tab, then try Connect Wallet again."
    );
  } else if (reason === "no-active-tab") {
    alert("Open a webpage first (e.g. google.com), then try Connect Wallet again.");
  } else if (reason === "no-extension-context") {
    alert(
      "This page must be opened as the extension popup (chrome://extensions → Load unpacked → click the Deliberate icon)."
    );
  }

  const wallet = real || DEMO_WALLET;

  try {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ deliberateWallet: wallet });
    }
  } catch (_) {}

  return wallet;
}
