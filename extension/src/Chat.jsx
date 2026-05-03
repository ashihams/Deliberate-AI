import { useEffect, useRef, useState } from "react";
import "./chat.css";
import { connectWallet } from "./utils/wallet.js";
import {
  fetchPortfolio,
  fetchAgents,
  postChat,
  logDecision,
  registerAgent,
  getUserChat,
  saveUserChat,
  getUserAgents,
} from "./utils/api.js";
import { truncateAddress, nowTime } from "./utils/format.js";
import { personalSign } from "./utils/sign.js";
import { AGENT_COLORS as DEFAULT_COLORS, DEFAULT_AGENTS } from "./utils/agents.js";

const DEMO_WALLET = "0x94F3Dd2002EF0AD05526849f742280A66fDC5777";

export default function Chat({ onLogout, onBack }) {
  const [currentWallet, setCurrentWallet] = useState("");
  const [walletSummary, setWalletSummary] = useState("");
  const [agents, setAgents] = useState(() =>
    DEFAULT_AGENTS.map((a) => ({ ...a, active: true }))
  );
  const [agentColors, setAgentColors] = useState({ ...DEFAULT_COLORS });
  const [messages, setMessages] = useState([]);
  const [typingAgent, setTypingAgent] = useState(null);
  const [showOnchain, setShowOnchain] = useState(false);
  const [currentDebate, setCurrentDebate] = useState(null);
  const [lastTxHash, setLastTxHash] = useState("");
  const [inputValue, setInputValue] = useState("");

  const [theme, setTheme] = useState("light");
  const [profile, setProfile] = useState({ firstName: "", lastName: "" });
  const [username, setUsername] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [marketplaceOpen, setMarketplaceOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const chatStreamRef = useRef(null);
  const menuRef = useRef(null);
  const kebabRef = useRef(null);
  const saveTimerRef = useRef(null);

  useEffect(() => {
    document.body.classList.add("chat-body");
    return () => document.body.classList.remove("chat-body");
  }, []);

  useEffect(() => {
    document.body.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    (async () => {
      let wallet = "";
      let storedTheme = "light";
      let firstName = "";
      let lastName = "";
      let storedUsername = "";
      try {
        if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
          const res = await chrome.storage.local.get([
            "deliberateWallet",
            "deliberateTheme",
            "deliberateUserFirstName",
            "deliberateUserLastName",
            "deliberateUsername",
          ]);
          wallet = (res && res.deliberateWallet) || DEMO_WALLET;
          storedTheme = (res && res.deliberateTheme) || "light";
          firstName = (res && res.deliberateUserFirstName) || "";
          lastName = (res && res.deliberateUserLastName) || "";
          storedUsername = (res && res.deliberateUsername) || "";
        } else {
          wallet = DEMO_WALLET;
        }
      } catch (_) {
        wallet = DEMO_WALLET;
      }
      setCurrentWallet(wallet);
      setTheme(storedTheme);
      setProfile({ firstName, lastName });
      setUsername(storedUsername);

      const welcome = {
        role: "agent",
        agent_id: "james",
        agent_name: "James",
        ens_name: "james.deliberate.eth",
        content:
          "Welcome to Deliberate. Connect your wallet and ask the committee anything.",
        reputation: 500,
        timestamp: nowTime(),
      };

      let initialMessages = [welcome];
      if (storedUsername) {
        try {
          const remoteMessages = await getUserChat(storedUsername);
          if (Array.isArray(remoteMessages) && remoteMessages.length > 0) {
            initialMessages = remoteMessages;
          }
        } catch (_) {}
      }
      setMessages(initialMessages);
      setHydrated(true);

      try {
        const data = await fetchPortfolio(wallet);
        const eth = data.eth_balance ? data.eth_balance.toFixed(4) + " ETH" : "";
        setWalletSummary(data.summary || eth);
      } catch (_) {}

      try {
        const list = await fetchAgents();
        if (Array.isArray(list)) {
          setAgents((prev) =>
            prev.map((a) => {
              const remote = list.find((r) => r.id === a.id);
              return remote
                ? { ...a, reputation: remote.reputation || a.reputation }
                : a;
            })
          );
        }
      } catch (_) {}

      if (storedUsername) {
        try {
          const userAgents = await getUserAgents(storedUsername);
          if (Array.isArray(userAgents) && userAgents.length > 0) {
            setAgents((prev) => {
              const existing = new Set(prev.map((a) => a.id));
              const additions = userAgents
                .filter((a) => a && a.id && !existing.has(a.id))
                .map((a) => ({
                  id: a.id,
                  name: a.name,
                  ens_name: a.ens_name || `${a.id}.deliberate.eth`,
                  reputation: a.reputation || 500,
                  active: true,
                }));
              return [...prev, ...additions];
            });
            setAgentColors((prev) => {
              const next = { ...prev };
              for (const a of userAgents) {
                if (a && a.id && !next[a.id]) {
                  next[a.id] = a.color || "#534AB7";
                }
              }
              return next;
            });
          }
        } catch (_) {}
      }
    })();
  }, []);

  // Persist chat history to MongoDB whenever messages change (debounced).
  useEffect(() => {
    if (!hydrated || !username) return undefined;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveUserChat(username, messages).catch(() => {});
    }, 600);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [messages, hydrated, username]);

  useEffect(() => {
    if (chatStreamRef.current) {
      chatStreamRef.current.scrollTop = chatStreamRef.current.scrollHeight;
    }
  }, [messages, typingAgent]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDown = (e) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target) &&
        kebabRef.current &&
        !kebabRef.current.contains(e.target)
      ) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  useEffect(() => {
    if (!marketplaceOpen && !profileOpen && !menuOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setMarketplaceOpen(false);
        setProfileOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [marketplaceOpen, profileOpen, menuOpen]);

  const handleConnect = async () => {
    const wallet = await connectWallet();
    if (!wallet) return;
    setCurrentWallet(wallet);
    try {
      const data = await fetchPortfolio(wallet);
      const eth = data.eth_balance ? data.eth_balance.toFixed(4) + " ETH" : "";
      setWalletSummary(data.summary || eth);
    } catch (_) {}
    try {
      const list = await fetchAgents();
      if (Array.isArray(list)) {
        setAgents((prev) =>
          prev.map((a) => {
            const remote = list.find((r) => r.id === a.id);
            return remote ? { ...a, reputation: remote.reputation || a.reputation } : a;
          })
        );
      }
    } catch (_) {}
  };

  const handleDisconnect = async () => {
    setCurrentWallet("");
    setWalletSummary("");
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.remove(["deliberateWallet"]);
      }
    } catch (_) {}
  };

  const handleSend = async () => {
    const topic = inputValue.trim();
    if (!topic) return;
    setInputValue("");

    const wallet = currentWallet || DEMO_WALLET;
    if (!currentWallet) setCurrentWallet(wallet);

    setMessages((prev) => [
      ...prev,
      { role: "user", content: topic, timestamp: nowTime() },
    ]);

    const mention = (topic.match(/@([a-zA-Z]+)/) || [])[1]?.toLowerCase();
    const active = agents.filter((a) => a.active).map((a) => a.id);
    const targeted = mention && active.includes(mention) ? [mention] : active;

    try {
      const data = await postChat({
        message: topic,
        wallet_address: wallet,
        active_agents: targeted,
      });
      const responses = Array.isArray(data) ? data : data.responses || [];
      setCurrentDebate({ topic, verdict: "CAUTION", messages: responses });

      for (const msg of responses) {
        setTypingAgent(msg.agent_id);
        await new Promise((r) => setTimeout(r, 600));
        setTypingAgent(null);
        setMessages((prev) => [
          ...prev,
          { role: "agent", ...msg, timestamp: nowTime() },
        ]);
        if ((msg.agent_id || "").toLowerCase() === "james") setShowOnchain(true);
      }
    } catch (err) {
      console.error("Chat error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          agent_id: "james",
          agent_name: "James",
          ens_name: "james.deliberate.eth",
          content:
            "Backend unavailable. Make sure the server is running on port 8001.",
          reputation: 500,
          timestamp: nowTime(),
        },
      ]);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setShowOnchain(false);
    setCurrentDebate(null);
    setTypingAgent(null);
    if (username) {
      saveUserChat(username, []).catch(() => {});
    }
  };

  const handleSign = async () => {
    if (!currentDebate || !currentWallet) return;
    try {
      const msg =
        "Deliberate\nQuestion: " +
        currentDebate.topic +
        "\nVerdict: " +
        currentDebate.verdict +
        "\nTime: " +
        new Date().toISOString() +
        "\nWallet: " +
        currentWallet;
      const sig = await personalSign(msg, currentWallet);
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          agent_id: "james",
          agent_name: "James",
          ens_name: "james.deliberate.eth",
          content: "✍️ Signed: " + sig.slice(0, 12) + "..." + sig.slice(-6),
          reputation: 500,
          timestamp: nowTime(),
        },
      ]);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRecord = async () => {
    if (!currentDebate || !currentWallet) return;
    try {
      const result = await logDecision({
        question: currentDebate.topic,
        verdict: currentDebate.verdict,
        agent_id: "james",
        user_agreed: true,
        wallet_address: currentWallet,
      });
      const txHash = result.tx_hash || "";
      setLastTxHash(txHash);
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          agent_id: "james",
          agent_name: "James",
          ens_name: "james.deliberate.eth",
          content: "⛓️ Recorded onchain. TX: " + (txHash || "pending"),
          reputation: 500,
          timestamp: nowTime(),
        },
      ]);
      try {
        const list = await fetchAgents();
        if (Array.isArray(list)) {
          setAgents((prev) =>
            prev.map((a) => {
              const remote = list.find((r) => r.id === a.id);
              return remote ? { ...a, reputation: remote.reputation || a.reputation } : a;
            })
          );
        }
      } catch (_) {}
    } catch (e) {
      console.error(e);
    }
  };

  const handleExplorer = () => {
    const hash =
      lastTxHash ||
      "0x0000000000000000000000000000000000000000000000000000000000000000";
    window.open("https://sepolia.basescan.org/tx/" + hash, "_blank");
  };

  const handleAddAgent = async () => {
    const name = window.prompt("Agent name:");
    if (!name) return;
    const role = window.prompt("Role:") || "Advisor";
    const style = window.prompt("Personality:") || "balanced";
    try {
      const created = await registerAgent({
        name,
        role,
        style,
        model: "llama-3.3-70b-versatile",
        wallet_address: currentWallet || DEMO_WALLET,
        username,
      });
      console.log("Created agent:", created);
      setAgentColors((prev) => ({
        ...prev,
        [created.id]: created.color || "#534AB7",
      }));
      setAgents((prev) => [
        ...prev,
        {
          id: created.id,
          name: created.name,
          ens_name: created.ens_name,
          reputation: created.reputation || 500,
          active: true,
        },
      ]);
      setMessages((prev) => [
        ...prev,
        {
          role: "agent",
          agent_id: created.id,
          agent_name: created.name,
          ens_name: created.ens_name,
          content:
            created.name +
            " (" +
            role +
            ") has joined the group chat as " +
            created.ens_name,
          reputation: 500,
          timestamp: nowTime(),
        },
      ]);
    } catch (e) {
      console.error("Add agent error:", e);
      alert("Failed: " + (e.message || "Unknown error"));
    }
  };

  const toggleAgent = (id) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === id ? { ...a, active: !a.active } : a))
    );
  };

  const toggleTheme = async () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ deliberateTheme: next });
      }
    } catch (_) {}
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.clear();
      }
    } catch (_) {}
    if (typeof onLogout === "function") onLogout();
  };

  const onMenuItem = (action) => () => {
    setMenuOpen(false);
    action();
  };

  const isConnected = !!currentWallet;

  return (
    <div className="app">
      <div className="shell">
        <header className="header">
          <div className="header-left">
            <button
              type="button"
              className="back-btn"
              aria-label="Back to sign in"
              title="Back to sign in"
              onClick={() => {
                if (typeof onBack === "function") onBack();
              }}
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
          </div>
          <div className="brand">
            <h1 className="title">Deliberate</h1>
            <p className="subtitle">AI Investment Committee</p>
          </div>
          <div className="header-right">
            <button
              ref={kebabRef}
              className="kebab-btn"
              type="button"
              aria-label="Menu"
              onClick={() => setMenuOpen((o) => !o)}
            >
              <span className="kebab-dots">
                <span />
                <span />
                <span />
              </span>
            </button>
          </div>
          {menuOpen && (
            <div ref={menuRef} className="kebab-menu" role="menu">
              <button
                type="button"
                className="menu-item"
                onClick={onMenuItem(() => setMarketplaceOpen(true))}
              >
                <span className="menu-item-icon">🛒</span>
                <span>Agent Marketplace</span>
              </button>
              <div className="menu-divider" />
              <button
                type="button"
                className="menu-item"
                onClick={onMenuItem(handleNewChat)}
              >
                <span className="menu-item-icon">🆕</span>
                <span>New Chat</span>
              </button>
              <div className="menu-divider" />
              <button
                type="button"
                className="menu-item"
                onClick={onMenuItem(isConnected ? handleDisconnect : handleConnect)}
              >
                <span className="menu-item-icon">{isConnected ? "🔌" : "💼"}</span>
                <span>{isConnected ? "Disconnect Wallet" : "Connect Wallet"}</span>
              </button>
              <div className="menu-divider" />
              <button
                type="button"
                className="menu-item"
                onClick={onMenuItem(toggleTheme)}
              >
                <span className="menu-item-icon">{theme === "dark" ? "☀️" : "🌙"}</span>
                <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
              </button>
              <div className="menu-divider" />
              <button
                type="button"
                className="menu-item"
                onClick={onMenuItem(() => setProfileOpen(true))}
              >
                <span className="menu-item-icon">👤</span>
                <span>Profile</span>
              </button>
              <div className="menu-divider" />
              <button
                type="button"
                className="menu-item menu-item-danger"
                onClick={handleLogout}
              >
                <span className="menu-item-icon">🚪</span>
                <span>Logout</span>
              </button>
            </div>
          )}
        </header>

        <div className="chat-layout">
          <main className="chat-main">
            <div className="chat-stream" ref={chatStreamRef}>
              {messages.map((msg, idx) =>
                msg.role === "user" ? (
                  <UserMessage key={idx} content={msg.content} time={msg.timestamp} />
                ) : (
                  <AgentMessage key={idx} msg={msg} colors={agentColors} />
                )
              )}
              {typingAgent && (
                <TypingIndicator color={agentColors[typingAgent] || "#7F77DD"} />
              )}
            </div>

            <div className="composer">
              <div className="input-row">
                <button
                  className="record-btn"
                  type="button"
                  onClick={handleRecord}
                  aria-label="Record onchain"
                  title={
                    currentDebate
                      ? "Record this decision onchain"
                      : "Run a chat first, then record onchain"
                  }
                  disabled={!currentDebate}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <circle
                      cx="12"
                      cy="12"
                      r="9.5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                    />
                    <circle cx="12" cy="12" r="5" fill="currentColor" />
                  </svg>
                </button>
                <input
                  className="chat-input"
                  placeholder="Ask the group... (use @marcus to tag an agent)"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <button
                  className="send-btn"
                  type="button"
                  onClick={handleSend}
                  aria-label="Send"
                  title="Send"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      d="M3.4 20.4l17.45-7.48a1 1 0 000-1.84L3.4 3.6a1 1 0 00-1.39 1.16L4 11l9 1-9 1-1.99 6.24a1 1 0 001.39 1.16z"
                      fill="currentColor"
                    />
                  </svg>
                </button>
              </div>
            </div>
          </main>
        </div>

        {marketplaceOpen && (
          <div
            className="modal-backdrop"
            onClick={() => setMarketplaceOpen(false)}
          >
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Agent Marketplace</h2>
                <button
                  type="button"
                  className="modal-close"
                  onClick={() => setMarketplaceOpen(false)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="market-grid">
                  {agents.map((a) => (
                    <div key={a.id} className="market-card">
                      <div className="market-card-head">
                        <span
                          className="avatar"
                          style={{ background: agentColors[a.id] || "#7F77DD" }}
                        >
                          {a.name.charAt(0)}
                        </span>
                        <span className="market-card-name">{a.name}</span>
                      </div>
                      <div className="market-card-ens">{a.ens_name}</div>
                      <div className="market-card-foot">
                        <button
                          type="button"
                          className={"market-toggle" + (a.active ? " active" : "")}
                          onClick={() => toggleAgent(a.id)}
                        >
                          {a.active ? "Active" : "Inactive"}
                        </button>
                        <Stars rep={a.reputation} className="market-card-rep" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="add-agent-btn"
                  onClick={handleAddAgent}
                >
                  + Add Agent
                </button>
              </div>
            </div>
          </div>
        )}

        {profileOpen && (
          <div className="modal-backdrop" onClick={() => setProfileOpen(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Profile</h2>
                <button
                  type="button"
                  className="modal-close"
                  onClick={() => setProfileOpen(false)}
                  aria-label="Close"
                >
                  ×
                </button>
              </div>
              <div className="modal-body">
                <div className="profile-card">
                  <div className="profile-avatar">
                    {(profile.firstName || "U").charAt(0).toUpperCase()}
                  </div>
                  <h3 className="profile-name">
                    {(profile.firstName + " " + profile.lastName).trim() || "Anonymous"}
                  </h3>
                  <div className="profile-row">
                    <span className="profile-row-label">Wallet</span>
                    <span className="profile-row-value">
                      {currentWallet ? truncateAddress(currentWallet) : "Disconnected"}
                    </span>
                  </div>
                  <div className="profile-row">
                    <span className="profile-row-label">Status</span>
                    <span className="profile-row-value">
                      {isConnected ? "Connected" : "Not connected"}
                    </span>
                  </div>
                  <div className="profile-row">
                    <span className="profile-row-label">Theme</span>
                    <span className="profile-row-value">
                      {theme === "dark" ? "Dark" : "Light"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function UserMessage({ content, time }) {
  return (
    <div className="msg-row user">
      <div>
        <div className="bubble user">{content}</div>
        <div className="time user-time">{time}</div>
      </div>
    </div>
  );
}

function AgentMessage({ msg, colors }) {
  const id = (msg.agent_id || "marcus").toLowerCase();
  const color = colors[id] || "#7F77DD";
  const name = msg.agent_name || id;
  const ens = msg.ens_name || id + ".deliberate.eth";
  const text = msg.content || msg.argument || "";
  return (
    <div className="msg-row">
      <div className="agent-wrap">
        <div className="agent-meta">
          <span className="avatar" style={{ background: color }}>
            {name.charAt(0)}
          </span>
          <span>
            {name} · {ens}
          </span>
        </div>
        <div
          className="bubble agent"
          style={{ borderLeft: "3px solid " + color }}
        >
          {text}
        </div>
        <div className="time">{msg.timestamp || nowTime()}</div>
      </div>
    </div>
  );
}

function TypingIndicator({ color }) {
  return (
    <div className="typing">
      <span className="typing-dot" style={{ background: color }} />
      <span className="typing-dot" style={{ background: color }} />
      <span className="typing-dot" style={{ background: color }} />
    </div>
  );
}

function Stars({ rep, className = "" }) {
  const score = Math.max(
    0,
    Math.min(5, Math.round((Number(rep || 0) / 1000) * 5 * 2) / 2)
  );
  const full = Math.floor(score);
  const half = score - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  const cls = ("stars " + className).trim();
  return (
    <span className={cls} title={`${rep} reputation`}>
      {Array.from({ length: full }).map((_, i) => (
        <span key={"f" + i} className="star full">★</span>
      ))}
      {half ? <span className="star half">★</span> : null}
      {Array.from({ length: empty }).map((_, i) => (
        <span key={"e" + i} className="star empty">★</span>
      ))}
    </span>
  );
}
