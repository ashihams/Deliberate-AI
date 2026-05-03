// personal_sign via MetaMask using the same chrome.scripting injection that
// popup.js used. No behavior change.

export async function personalSign(message, walletAddress) {
  if (
    typeof chrome === "undefined" ||
    !chrome.tabs ||
    !chrome.scripting
  ) {
    throw new Error("Sign requires the extension popup context.");
  }
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) {
    throw new Error("Open a webpage first (e.g. google.com), then try again.");
  }
  const results = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: async (m, w) =>
      window.ethereum.request({ method: "personal_sign", params: [m, w] }),
    args: [message, walletAddress],
  });
  return results[0].result;
}
