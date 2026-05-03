import { useState } from "react";
import { connectWallet } from "./utils/wallet.js";

const DEMO_WALLET = "0x94F3Dd2002EF0AD05526849f742280A66fDC5777";

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState("choice");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [connecting, setConnecting] = useState(false);

  const persistName = async (val) => {
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({
          deliberateUserFirstName: val,
          deliberateUserLastName: "",
        });
      }
    } catch (_) {}
  };

  const handleSignIn = async () => {
    await persistName(name.trim());
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ deliberateWallet: DEMO_WALLET });
      }
    } catch (_) {}
    if (typeof onComplete === "function") onComplete();
  };

  const handleConnectWallet = async () => {
    setConnecting(true);
    try {
      const wallet = await connectWallet();
      try {
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          await chrome.storage.local.set({
            deliberateWallet: wallet,
            deliberateUserFirstName: name.trim(),
            deliberateUserLastName: "",
          });
        }
      } catch (_) {}
      if (typeof onComplete === "function") onComplete();
    } finally {
      setConnecting(false);
    }
  };

  const canContinue =
    name.trim().length > 0 && password.trim().length > 0;

  const goTo = (next) => {
    setName("");
    setPassword("");
    setStep(next);
  };

  return (
    <main className="db-root">
      <div className="db-content">
        {step === "choice" ? (
          <>
            <header className="db-header">
              <h1 className="db-wordmark">Deliberate</h1>
              <p className="db-tag">Welcome — get started.</p>
            </header>

            <div className="db-choice">
              <button
                type="button"
                className="db-choice-btn primary"
                onClick={() => goTo("signin")}
              >
                <span className="db-choice-title">Sign In</span>
                <span className="db-choice-sub">
                  Continue with your existing account
                </span>
              </button>
              <button
                type="button"
                className="db-choice-btn"
                onClick={() => goTo("signup")}
              >
                <span className="db-choice-title">Sign Up</span>
                <span className="db-choice-sub">Create a new account</span>
              </button>
            </div>

            <p className="db-helper">
              Your AI investment committee, on-chain.
            </p>
          </>
        ) : (
          <>
            <header className="db-header signup">
              <button
                type="button"
                className="db-back"
                aria-label="Back"
                onClick={() => goTo("choice")}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M15.5 5.5L9 12l6.5 6.5"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                </svg>
              </button>
              <h1 className="db-wordmark signup">
                {step === "signup" ? "Create account" : "Welcome back"}
              </h1>
              <p className="db-tag">
                {step === "signup"
                  ? "Set up your account to continue."
                  : "Sign in to your account."}
              </p>
            </header>

            <form
              className="db-form"
              onSubmit={(e) => {
                e.preventDefault();
                if (connecting || !canContinue) return;
                if (step === "signup") handleConnectWallet();
                else handleSignIn();
              }}
            >
              <div className="db-field">
                <label htmlFor="name">Name</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Your name"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="db-input"
                />
              </div>

              <div className="db-field">
                <label htmlFor="password">
                  {step === "signup" ? "Create password" : "Password"}
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder={
                    step === "signup" ? "Create a password" : "Password"
                  }
                  autoComplete={
                    step === "signup" ? "new-password" : "current-password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="db-input"
                />
              </div>

              <button
                type="submit"
                disabled={connecting || !canContinue}
                className="db-cta"
              >
                {step === "signup"
                  ? connecting
                    ? "Connecting…"
                    : "Connect Wallet"
                  : "Sign In"}
              </button>

              <p className="db-helper">
                {step === "signup"
                  ? "You'll connect your wallet to finish creating your account."
                  : "Use the credentials you signed up with."}
              </p>
            </form>
          </>
        )}
      </div>

      <div className="db-mountains" aria-hidden="true">
        <svg viewBox="0 0 1440 360" preserveAspectRatio="none" width="100%" height="100%">
          <defs>
            <linearGradient id="mtnSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
              <stop offset="1" stopColor="#dbeafe" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="mtnFar" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#93c5fd" />
              <stop offset="1" stopColor="#60a5fa" />
            </linearGradient>
            <linearGradient id="mtnMid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3b82f6" />
              <stop offset="1" stopColor="#1d4ed8" />
            </linearGradient>
            <linearGradient id="mtnNear" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1e3a8a" />
              <stop offset="1" stopColor="#0b1a40" />
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="1440" height="360" fill="url(#mtnSky)" />
          <polygon
            fill="url(#mtnFar)"
            points="0,360 0,230 160,150 280,210 430,120 600,200 760,140 920,210 1080,150 1240,220 1440,160 1440,360"
          />
          <polygon
            fill="url(#mtnMid)"
            points="0,360 0,290 120,220 260,290 420,200 560,280 720,210 880,290 1020,230 1180,300 1320,240 1440,290 1440,360"
          />
          <polygon fill="#ffffff" fillOpacity=".8" points="420,200 442,216 398,216" />
          <polygon fill="#ffffff" fillOpacity=".8" points="720,210 744,228 696,228" />
          <polygon fill="#ffffff" fillOpacity=".8" points="1020,230 1042,246 998,246" />
          <polygon
            fill="url(#mtnNear)"
            points="0,360 0,330 180,290 340,330 520,280 700,330 880,290 1060,330 1240,290 1440,320 1440,360"
          />
        </svg>
      </div>

      <style>{`
        .db-root {
          position: relative;
          min-height: 100vh;
          width: 100%;
          background: #ffffff;
          color: #0b1220;
          font-family: Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 38px 22px 220px;
          overflow: hidden;
          box-sizing: border-box;
        }

        .db-mountains {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          height: 220px;
          line-height: 0;
          pointer-events: none;
          z-index: 0;
        }
        .db-content { position: relative; z-index: 1; }

        .db-content {
          width: 100%;
          max-width: 360px;
          display: flex;
          flex-direction: column;
          gap: 30px;
        }

        .db-header { text-align: center; position: relative; }
        .db-header.signup { padding-top: 4px; }
        .db-back {
          position: absolute;
          left: -6px;
          top: 0;
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          color: #334155;
          cursor: pointer;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s ease;
          padding: 0;
        }
        .db-back:hover { background: #eef2f7; }
        .db-back svg { width: 20px; height: 20px; display: block; }

        .db-wordmark {
          margin: 0;
          color: #000000;
          font-weight: 900;
          font-size: 48px;
          line-height: 1;
          letter-spacing: -0.045em;
          white-space: nowrap;
        }
        .db-wordmark.signup { font-size: 26px; letter-spacing: -0.02em; }
        .db-tag {
          margin: 14px 0 0;
          color: #64748b;
          font-size: 14px;
        }

        .db-choice {
          display: flex;
          flex-direction: column;
          gap: 14px;
          width: 100%;
        }
        .db-choice-btn {
          appearance: none;
          width: 100%;
          padding: 18px 18px;
          border-radius: 16px;
          border: 1.5px solid #e2e8f0;
          background: #ffffff;
          color: #0b1220;
          cursor: pointer;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          transition: border-color 0.15s ease, transform 0.08s ease,
            box-shadow 0.15s ease, background 0.15s ease, color 0.15s ease;
          font-family: inherit;
        }
        .db-choice-btn:hover:not(:disabled) {
          border-color: #2563eb;
          transform: translateY(-1px);
          box-shadow: 0 8px 22px rgba(37, 99, 235, 0.12);
        }
        .db-choice-btn:active:not(:disabled) { transform: translateY(0); }

        .db-choice-btn.primary {
          background: #1d4ed8;
          border-color: #1d4ed8;
          color: #ffffff;
        }
        .db-choice-btn.primary:hover:not(:disabled) {
          background: #1e40af;
          border-color: #1e40af;
          box-shadow: 0 10px 26px rgba(37, 99, 235, 0.32);
        }
        .db-choice-title {
          font-size: 17px;
          font-weight: 800;
          letter-spacing: -0.01em;
        }
        .db-choice-sub {
          font-size: 12px;
          font-weight: 500;
          color: #64748b;
        }
        .db-choice-btn.primary .db-choice-sub {
          color: #d8e2f9;
        }

        .db-form { display: flex; flex-direction: column; gap: 16px; }
        .db-field { display: flex; flex-direction: column; gap: 6px; }
        .db-field label {
          font-size: 12px;
          font-weight: 600;
          color: #334155;
        }

        .db-input {
          appearance: none;
          width: 100%;
          padding: 13px 16px;
          border-radius: 12px;
          border: 1.5px solid #e2e8f0;
          background: #ffffff;
          font-size: 14px;
          color: #0b1220;
          outline: none;
          transition: border-color .15s ease, box-shadow .15s ease;
          box-sizing: border-box;
        }
        .db-input::placeholder { color: #94a3b8; }
        .db-input:hover { border-color: #c7d6f7; }
        .db-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 4px rgba(37,99,235,.12);
        }

        .db-cta {
          margin-top: 8px;
          width: 100%;
          padding: 14px 16px;
          border-radius: 999px;
          border: none;
          background: #1d4ed8;
          color: #ffffff;
          font-size: 15px;
          font-weight: 700;
          cursor: pointer;
          transition: background .15s ease, transform .08s ease, opacity .2s ease;
          letter-spacing: 0.01em;
        }
        .db-cta:hover:not(:disabled) { background: #1e40af; }
        .db-cta:active:not(:disabled) { transform: translateY(1px); }
        .db-cta:disabled {
          background: #cbd5e1;
          cursor: not-allowed;
        }

        .db-helper {
          margin: 0;
          text-align: center;
          font-size: 12px;
          color: #64748b;
        }
      `}</style>
    </main>
  );
}
