// MetaMask exposes window.ethereum in the page (main) world only — inject bridge there,
// then relay extension messages from the popup via chrome.runtime.onMessage.

(function injectPageEthereumBridge() {
  const script = document.createElement("script");
  script.textContent =
    "(" +
    function () {
      window.addEventListener("message", function (event) {
        if (event.source !== window) return;
        if (!event.data || event.data.type !== "DELIBERATE_REQUEST") return;
        var id = event.data.id;
        var payload = event.data.payload;
        if (typeof window.ethereum === "undefined") {
          window.postMessage(
            {
              type: "DELIBERATE_ERROR",
              id: id,
              error: "No Ethereum provider. Install MetaMask and open this site in a normal tab.",
            },
            "*"
          );
          return;
        }
        window.ethereum
          .request(payload)
          .then(function (result) {
            window.postMessage({ type: "DELIBERATE_RESPONSE", id: id, result: result }, "*");
          })
          .catch(function (err) {
            window.postMessage(
              {
                type: "DELIBERATE_ERROR",
                id: id,
                error: err && err.message ? err.message : String(err),
              },
              "*"
            );
          });
      });
    }.toString() +
    ")();";
  (document.documentElement || document.head).appendChild(script);
  script.remove();
})();

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (!request || request.type !== "DELIBERATE_ETHEREUM") return false;
  const id =
    "d_" + Math.random().toString(36).slice(2) + "_" + Date.now().toString(36);

  function onWindowMessage(event) {
    if (!event.data || event.data.id !== id) return;
    if (event.data.type === "DELIBERATE_RESPONSE") {
      window.removeEventListener("message", onWindowMessage);
      sendResponse({ ok: true, result: event.data.result });
    }
    if (event.data.type === "DELIBERATE_ERROR") {
      window.removeEventListener("message", onWindowMessage);
      sendResponse({ ok: false, error: event.data.error });
    }
  }

  window.addEventListener("message", onWindowMessage);
  window.postMessage(
    { type: "DELIBERATE_REQUEST", id: id, payload: request.payload },
    "*"
  );
  return true;
});
