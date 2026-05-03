import { useState } from "react";
import Onboarding from "./Onboarding.jsx";
import Chat from "./Chat.jsx";

export default function App() {
  // Always start on the Sign In / Sign Up choice screen on every popup open.
  // The user's stored data (username / wallet / chat history) is still preserved
  // in chrome.storage.local + MongoDB and is restored after they sign in again.
  const [view, setView] = useState("onboarding");

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
