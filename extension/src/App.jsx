import { useEffect, useState } from "react";
import Onboarding from "./Onboarding.jsx";
import Chat from "./Chat.jsx";

export default function App() {
  const [view, setView] = useState("loading");

  useEffect(() => {
    (async () => {
      try {
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          const res = await chrome.storage.local.get(["deliberateWallet"]);
          setView(res && res.deliberateWallet ? "chat" : "onboarding");
          return;
        }
      } catch (_) {}
      setView("onboarding");
    })();
  }, []);

  if (view === "loading") return null;
  if (view === "chat") {
    return (
      <Chat
        onLogout={() => setView("onboarding")}
        onBack={() => setView("onboarding")}
      />
    );
  }
  return <Onboarding onComplete={() => setView("chat")} />;
}
