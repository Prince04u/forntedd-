"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BottomNav from "@/components/home/BottomNav";
import { usePlatformStatus } from "@/components/platform/PlatformStatusProvider";
import { getToken } from "@/lib/auth";
import { getSocket } from "@/lib/socket";
import { getBalance } from "@/lib/walletApi";
import { getAviatorConfig } from "@/lib/platformApi";
import { cashOut, cancelBet, getMyBets, getRecentRounds, placeBet } from "@/lib/aviatorApi";

const DEFAULT_LIMITS = { minBetAmount: 10, maxBetAmount: 50000, maxAutoCashOut: 100, houseEdge: 0.01 };
const HISTORY_LIMIT = 25;
const MY_BETS_LIMIT = 30;

const safeNumber = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const formatMultiplier = (value) => `${safeNumber(value, 1).toFixed(2)}x`;

const RedPlaneIcon = () => (
  <svg viewBox="0 0 100 50" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ width: "100%", height: "100%", transform: "scaleX(-1)" }}>
    {/* Propeller (spinning circular blur) */}
    <ellipse cx="9" cy="25" rx="3.5" ry="18" fill="#ffffff" opacity="0.22" stroke="#ffffff" strokeWidth="1" />
    <line x1="9" y1="5" x2="9" y2="45" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" opacity="0.75" />

    {/* Body */}
    <path d="M90 25 C90 21, 75 16, 45 16 C25 16, 12 20, 8 25 C12 30, 25 34, 45 34 C75 34, 90 29, 90 25 Z" fill="#ff053b" />
    <path d="M45 16 C35 16, 25 18, 8 25 C25 27, 35 28, 45 28 Z" fill="#ff5577" />
    <path d="M90 25 C85 25, 75 27, 55 28 C75 29, 85 29, 90 25 Z" fill="#880011" />

    {/* Underbelly details */}
    <path d="M50 34 C60 34, 70 33, 78 30 C70 31, 60 31, 50 31 Z" fill="#66000c" />

    {/* Wings */}
    <path d="M55 25 L45 47 C43 51, 48 51, 52 47 L68 25 Z" fill="#e11d48" />
    <path d="M55 25 L45 47 C44 49, 46 49, 48 47 L58 25 Z" fill="#ff5577" />

    {/* Tail fin */}
    <path d="M80 23 L90 6 C91 3, 86 3, 83 6 L75 23 Z" fill="#ff053b" />
    <path d="M80 23 L70 25 L85 27 L90 23 Z" fill="#b90022" />

    {/* Decal details */}
    <path d="M35 22 L55 22 L50 24 L35 24 Z" fill="#ffffff" opacity="0.3" />
    <circle cx="65" cy="25" r="2.5" fill="#ffd700" />
  </svg>
);

const FAKE_USERNAMES = [
  "A***h", "R***t", "S***y", "M***t", "P***v", "K***n", "J***t", "V***s", "A***t", "D***k",
  "N***j", "H***h", "G***v", "S***h", "Y***h", "R***l", "V***y", "A***n", "S***m", "P***k",
  "R***n", "M***h", "9***2", "9***9", "8***4", "7***0", "9***5", "8***1", "9***7", "6***3",
  "H***a", "A***d", "S***k", "S***m", "D***a", "M***a", "P***i", "R***u", "R***j", "V***k"
];

const generateFakePlayers = () => {
  const count = Math.floor(18 + Math.random() * 15);
  const list = [];
  for (let i = 0; i < count; i++) {
    const username = FAKE_USERNAMES[Math.floor(Math.random() * FAKE_USERNAMES.length)];
    const amount = Math.floor(10 + Math.random() * 40) * 10; // ₹100 to ₹4000
    const targetCashout = parseFloat((1.05 + Math.random() * 5.0).toFixed(2));
    list.push({
      username,
      amount,
      targetCashout,
      cashedOutAtMultiplier: null,
      cashedOut: false
    });
  }
  return list.sort((a, b) => b.amount - a.amount);
};

export default function AviatorGameScreen() {
  const router = useRouter();
  const { maintenanceMode, message: maintenanceMessage, blocksAction } = usePlatformStatus();

  const [mounted, setMounted] = useState(false);
  const [balance, setBalance] = useState(0);
  const [limits, setLimits] = useState(DEFAULT_LIMITS);

  // --- Betting Panel 1 States ---
  const [betAmount1, setBetAmount1] = useState(100);
  const [autoCashOutEnabled1, setAutoCashOutEnabled1] = useState(false);
  const [autoCashOut1, setAutoCashOut1] = useState(2.0);
  const [autoBetEnabled1, setAutoBetEnabled1] = useState(false);
  const [activeBet1, setActiveBet1] = useState(null);
  const [loading1, setLoading1] = useState(false);
  const [error1, setError1] = useState("");

  // --- Betting Panel 2 States ---
  const [betAmount2, setBetAmount2] = useState(100);
  const [autoCashOutEnabled2, setAutoCashOutEnabled2] = useState(false);
  const [autoCashOut2, setAutoCashOut2] = useState(2.0);
  const [autoBetEnabled2, setAutoBetEnabled2] = useState(false);
  const [activeBet2, setActiveBet2] = useState(null);
  const [loading2, setLoading2] = useState(false);
  const [error2, setError2] = useState("");

  // --- Live Flight States ---
  const [liveMultiplier, setLiveMultiplier] = useState(1.0);
  const [roundStatus, setRoundStatus] = useState("idle"); // starting | running | crashed
  const [countdown, setCountdown] = useState("5.0");
  const [crashMultiplier, setCrashMultiplier] = useState(null);
  const [roundId, setRoundId] = useState(null);
  const [players, setPlayers] = useState([]);
  const [fakePlayers, setFakePlayers] = useState([]);
  const [myBets, setMyBets] = useState([]);
  const [recentRounds, setRecentRounds] = useState([]);

  // Sidebar Tab Control
  const [activeTab, setActiveTab] = useState("all"); // all | mine

  const lastAutoBetAttemptRef1 = useRef(0);
  const lastAutoBetAttemptRef2 = useRef(0);

  const bettingLocked = maintenanceMode || blocksAction("bet");

  // Load basic page context info
  const loadData = useCallback(async () => {
    if (!getToken()) return;
    try {
      const [balanceRes, configRes, roundsRes, betsRes] = await Promise.all([
        getBalance(),
        getAviatorConfig().catch(() => ({ data: null })),
        getRecentRounds({ limit: HISTORY_LIMIT }).catch(() => ({ rounds: [] })),
        getMyBets({ limit: MY_BETS_LIMIT }).catch(() => ({ bets: [] })),
      ]);

      setBalance(balanceRes?.data?.balance ?? balanceRes?.balance ?? 0);

      const cfg = configRes?.data || configRes || {};
      setLimits({
        minBetAmount: safeNumber(cfg.minBetAmount, DEFAULT_LIMITS.minBetAmount),
        maxBetAmount: safeNumber(cfg.maxBetAmount, DEFAULT_LIMITS.maxBetAmount),
        maxAutoCashOut: safeNumber(cfg.maxAutoCashOut, DEFAULT_LIMITS.maxAutoCashOut),
        houseEdge: safeNumber(cfg.houseEdge, DEFAULT_LIMITS.houseEdge),
      });

      const rounds = roundsRes?.data?.rounds || roundsRes?.rounds || roundsRes?.data || [];
      setRecentRounds(Array.isArray(rounds) ? rounds : []);

      const bets = betsRes?.data?.bets || betsRes?.bets || betsRes?.data || [];
      setMyBets(Array.isArray(bets) ? bets : []);
    } catch (err) {
      console.error(err);
    }
  }, []);

  // Socket management & real-time listeners
  useEffect(() => {
    setMounted(true);
    if (!getToken()) {
      router.replace("/login");
      return undefined;
    }

    loadData();

    let activeSocket = null;
    let cancelled = false;

    const onWalletUpdated = (data) => {
      if (typeof data?.balance === "number") setBalance(data.balance);
    };

    getSocket().then((socket) => {
      if (!socket || cancelled) return;
      activeSocket = socket;

      socket.emit("join:user");
      socket.emit("join:aviator");

      socket.on("wallet:updated", onWalletUpdated);

      socket.on("aviator:round:starting", (data) => {
        setRoundStatus("starting");
        setCrashMultiplier(null);
        setPlayers([]);
        setLiveMultiplier(1.0);
        if (data?.roundId) setRoundId(data.roundId);
        setFakePlayers(generateFakePlayers());
      });

      socket.on("aviator:multiplier", (data) => {
        setRoundStatus("flying");
        if (data?.roundId) setRoundId(data.roundId);
        if (typeof data?.multiplier === "number") {
          setLiveMultiplier(Math.max(1.0, data.multiplier));
        }
      });

      socket.on("aviator:crash", async (data) => {
        setRoundStatus("crashed");
        if (data?.roundId) setRoundId(data.roundId);
        if (typeof data?.crashMultiplier === "number") {
          setCrashMultiplier(data.crashMultiplier);
          setLiveMultiplier(Math.max(1.0, data.crashMultiplier));
        }

        // Reset active bets at crash
        setActiveBet1(null);
        setActiveBet2(null);

        await loadData();
      });

      socket.on("aviator:state", (data) => {
        if (data?.state) {
          setRoundStatus(data.state);
          if (data.state === "waiting") {
            setRoundStatus("starting");
            // Regenerate if starting from fresh sync
            if (fakePlayers.length === 0) setFakePlayers(generateFakePlayers());
          }
        }
        if (data?.countdown) setCountdown(data.countdown);
        if (data?.periodId) setRoundId(data.periodId);
        if (data?.multiplier && data.state === "flying") {
          setLiveMultiplier(Number(data.multiplier));
        }
      });

      socket.on("aviator:players", (data) => {
        const list = data?.players;
        if (Array.isArray(list)) setPlayers(list);
      });

      socket.on("aviator:bet:update", (data) => {
        if (!data?.betId) return;
        
        setActiveBet1((prev) => {
          if (prev && (prev.id === data.betId || prev._id === data.betId)) {
            return { ...prev, ...data };
          }
          return prev;
        });

        setActiveBet2((prev) => {
          if (prev && (prev.id === data.betId || prev._id === data.betId)) {
            return { ...prev, ...data };
          }
          return prev;
        });
      });
    });

    return () => {
      cancelled = true;
      if (activeSocket) {
        activeSocket.off("wallet:updated", onWalletUpdated);
        activeSocket.off("aviator:round:starting");
        activeSocket.off("aviator:multiplier");
        activeSocket.off("aviator:crash");
        activeSocket.off("aviator:state");
        activeSocket.off("aviator:players");
        activeSocket.off("aviator:bet:update");
      }
    };
  }, [loadData, router]);

  // Place Bet Panel 1
  const handleBet1 = async () => {
    if (bettingLocked || loading1) return;
    if (activeBet1) return; // Cancel bet handled separately

    if (betAmount1 < limits.minBetAmount || betAmount1 > limits.maxBetAmount) {
      setError1(`Bet: ₹${limits.minBetAmount} - ₹${limits.maxBetAmount}`);
      return;
    }
    if (betAmount1 > balance) {
      setError1("Insufficient balance");
      return;
    }

    setError1("");
    setLoading1(true);
    try {
      const payload = {
        amount: betAmount1,
        autoCashOutMultiplier: autoCashOutEnabled1 ? autoCashOut1 : null,
        autoBet: autoBetEnabled1,
        clientRoundId: `av1_${Date.now()}`,
      };

      const res = await placeBet(payload);
      const bet = res?.data?.bet || res?.bet || res?.data || null;
      if (bet) setActiveBet1({ ...bet, status: bet.status || "active" });
      if (res?.data?.balance != null) setBalance(res.data.balance);
      if (res?.balance != null) setBalance(res.balance);
      await loadData();
    } catch (err) {
      setError1(err.response?.data?.message || "Failed to place bet");
    } finally {
      setLoading1(false);
    }
  };

  // Cashout Panel 1
  const handleCashOut1 = async () => {
    if (loading1 || !activeBet1) return;
    const betId = activeBet1.id || activeBet1._id;
    if (!betId) return;

    setError1("");
    setLoading1(true);
    try {
      const res = await cashOut({ betId });
      const bet = res?.data?.bet || res?.bet || null;
      if (bet) setActiveBet1(bet);
      if (res?.data?.balance != null) setBalance(res.data.balance);
      if (res?.balance != null) setBalance(res.balance);
      await loadData();
    } catch (err) {
      setError1(err.response?.data?.message || "Failed to cash out");
    } finally {
      setLoading1(false);
    }
  };

  // Place Bet Panel 2
  const handleBet2 = async () => {
    if (bettingLocked || loading2) return;
    if (activeBet2) return;

    if (betAmount2 < limits.minBetAmount || betAmount2 > limits.maxBetAmount) {
      setError2(`Bet: ₹${limits.minBetAmount} - ₹${limits.maxBetAmount}`);
      return;
    }
    if (betAmount2 > balance) {
      setError2("Insufficient balance");
      return;
    }

    setError2("");
    setLoading2(true);
    try {
      const payload = {
        amount: betAmount2,
        autoCashOutMultiplier: autoCashOutEnabled2 ? autoCashOut2 : null,
        autoBet: autoBetEnabled2,
        clientRoundId: `av2_${Date.now()}`,
      };

      const res = await placeBet(payload);
      const bet = res?.data?.bet || res?.bet || res?.data || null;
      if (bet) setActiveBet2({ ...bet, status: bet.status || "active" });
      if (res?.data?.balance != null) setBalance(res.data.balance);
      if (res?.balance != null) setBalance(res.balance);
      await loadData();
    } catch (err) {
      setError2(err.response?.data?.message || "Failed to place bet");
    } finally {
      setLoading2(false);
    }
  };

  // Cashout Panel 2
  const handleCashOut2 = async () => {
    if (loading2 || !activeBet2) return;
    const betId = activeBet2.id || activeBet2._id;
    if (!betId) return;

    setError2("");
    setLoading2(true);
    try {
      const res = await cashOut({ betId });
      const bet = res?.data?.bet || res?.bet || null;
      if (bet) setActiveBet2(bet);
      if (res?.data?.balance != null) setBalance(res.data.balance);
      if (res?.balance != null) setBalance(res.balance);
      await loadData();
    } catch (err) {
      setError2(err.response?.data?.message || "Failed to cash out");
    } finally {
      setLoading2(false);
    }
  };

  // Cancel Bet Panel 1
  const handleCancel1 = async () => {
    if (!activeBet1) return;
    const betId = activeBet1.id || activeBet1._id;
    if (!betId) return;

    setError1("");
    setLoading1(true);
    try {
      const res = await cancelBet({ betId });
      if (res?.success) {
        setActiveBet1(null);
        await loadData();
      }
    } catch (err) {
      setError1(err.response?.data?.message || "Failed to cancel bet");
    } finally {
      setLoading1(false);
    }
  };

  // Cancel Bet Panel 2
  const handleCancel2 = async () => {
    if (!activeBet2) return;
    const betId = activeBet2.id || activeBet2._id;
    if (!betId) return;

    setError2("");
    setLoading2(true);
    try {
      const res = await cancelBet({ betId });
      if (res?.success) {
        setActiveBet2(null);
        await loadData();
      }
    } catch (err) {
      setError2(err.response?.data?.message || "Failed to cancel bet");
    } finally {
      setLoading2(false);
    }
  };

  // Auto Bet loops
  useEffect(() => {
    if (!autoBetEnabled1) return;
    if (!mounted || !getToken() || bettingLocked || activeBet1 || roundStatus !== "starting") return;

    const now = Date.now();
    if (now - lastAutoBetAttemptRef1.current < 2000) return;
    lastAutoBetAttemptRef1.current = now;
    handleBet1();
  }, [roundStatus, autoBetEnabled1]);

  useEffect(() => {
    if (!autoBetEnabled2) return;
    if (!mounted || !getToken() || bettingLocked || activeBet2 || roundStatus !== "starting") return;

    const now = Date.now();
    if (now - lastAutoBetAttemptRef2.current < 2000) return;
    lastAutoBetAttemptRef2.current = now;
    handleBet2();
  }, [roundStatus, autoBetEnabled2]);

  // Real-time fake player cashouts updater
  useEffect(() => {
    if (roundStatus !== "flying" || fakePlayers.length === 0) return;

    let updated = false;
    const newList = fakePlayers.map((p) => {
      if (!p.cashedOut && liveMultiplier >= p.targetCashout) {
        updated = true;
        return {
          ...p,
          cashedOut: true,
          cashedOutAtMultiplier: p.targetCashout,
        };
      }
      return p;
    });

    if (updated) {
      setFakePlayers(newList);
    }
  }, [liveMultiplier, roundStatus, fakePlayers]);

  // Plane animation coordinate mapping
  const planeStyle = useMemo(() => {
    if (roundStatus !== "flying") {
      return { left: "10px", bottom: "15px", transform: "rotate(0deg)", position: "absolute", zIndex: 6, width: "58px", height: "36px" };
    }
    const m = Math.max(1, safeNumber(liveMultiplier, 1.0));
    
    // progress scales from 0 to 1 based on multiplier
    const progress = Math.min(1.0, (m - 1.0) / 12.0); // max scale at 13.0x
    const left = `${10 + progress * 72}%`;
    const bottom = `${15 + progress * 55}%`;
    const tilt = Math.max(-5, Math.min(15, progress * 15));
    
    return {
      left,
      bottom,
      transform: `rotate(${tilt}deg)`,
      position: "absolute",
      zIndex: 6,
      pointerEvents: "none",
      width: "58px",
      height: "36px",
      transition: "left 0.1s linear, bottom 0.1s linear, transform 0.1s linear"
    };
  }, [liveMultiplier, roundStatus]);

  // Dynamic quadratic bezier curve trail tracking the plane in real-time
  const pathD = useMemo(() => {
    if (roundStatus !== "flying") return "";
    const m = Math.max(1, safeNumber(liveMultiplier, 1.0));
    const progress = Math.min(1.0, (m - 1.0) / 12.0);
    const endX = 10 + progress * 72; // percentage
    const endY = 15 + progress * 55; // percentage
    
    // SVG coordinate space is 0 to 100
    // Start point: (10, 85) top-relative
    // End point: (endX, 100 - endY) top-relative
    const startX = 10;
    const startY = 85;
    const currentX = endX;
    const currentY = 100 - endY;
    
    // Smooth quadratic curve control point
    const controlX = startX + (currentX - startX) * 0.45;
    const controlY = startY + (currentY - startY) * 0.9;
    
    return `M ${startX},${startY} Q ${controlX},${controlY} ${currentX},${currentY}`;
  }, [liveMultiplier, roundStatus]);

  // Dynamic status pill tag colors matching recent rounds history
  const getPillClass = (mult) => {
    const val = safeNumber(mult, 1.0);
    if (val < 2.0) return "mult-blue";
    if (val < 10.0) return "mult-purple";
    return "mult-pink";
  };

  if (!mounted) {
    return (
      <div className="sp-aviator-container">
        <div className="av-msg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="sp-aviator-container">
      {/* Header bar matching Spribe aesthetics */}
      <header className="sp-av-header">
        <div className="sp-av-header-left">
          <Link href="/" className="sp-av-back-btn" aria-label="Go back">
            ‹
          </Link>
          <span className="sp-av-logo-text">Aviator</span>
          <span className="sp-av-help-badge">How to play</span>
        </div>
        <div className="sp-av-header-right">
          <div className="sp-av-balance-pill">
            <span className="sp-av-balance-value">{balance.toFixed(2)} INR</span>
          </div>
          <button className="sp-av-menu-btn" aria-label="Menu">
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </header>

      {/* Main split game wrapper */}
      <div className="sp-av-main-layout">
        {/* Left Side: Stats panel */}
        <aside className="sp-av-stats-panel">
          <div className="sp-av-stats-tabs">
            <button 
              className={`sp-av-tab-btn ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              All Bets
            </button>
            <button 
              className={`sp-av-tab-btn ${activeTab === "mine" ? "active" : ""}`}
              onClick={() => setActiveTab("mine")}
            >
              My Bets
            </button>
          </div>

          <div className="sp-av-stats-content">
            {activeTab === "all" ? (
              <div className="sp-av-players-list">
                <div className="sp-av-list-header">
                  <span>User</span>
                  <span>Bet</span>
                  <span>Multiplier</span>
                  <span>Cash out</span>
                </div>
                {fakePlayers.length === 0 ? (
                  <div className="sp-av-empty-list">Waiting for wagers...</div>
                ) : (
                  fakePlayers.map((p, idx) => (
                    <div className="sp-av-list-row" key={idx}>
                      <span className="sp-av-user-col">{p.username}</span>
                      <span>₹{safeNumber(p.amount, 0).toFixed(2)}</span>
                      <span className={p.cashedOut ? "text-green" : "text-gray"}>
                        {p.cashedOut ? `${Number(p.cashedOutAtMultiplier).toFixed(2)}x` : "—"}
                      </span>
                      <span className={p.cashedOut ? "text-green font-bold" : "text-gray"}>
                        {p.cashedOut ? `₹${(p.amount * p.cashedOutAtMultiplier).toFixed(2)}` : "—"}
                      </span>
                    </div>
                  ))
                )}
              </div>
            ) : (
              <div className="sp-av-players-list">
                <div className="sp-av-list-header">
                  <span>Bet Amount</span>
                  <span>Status</span>
                  <span>Payout</span>
                </div>
                {myBets.length === 0 ? (
                  <div className="sp-av-empty-list">No bets yet</div>
                ) : (
                  myBets.slice(0, 15).map((b, idx) => {
                    const status = b.status || "pending";
                    const isWin = status === "won" || status === "cashed_out";
                    return (
                      <div className="sp-av-list-row" key={b.id || b._id || idx}>
                        <span>₹{safeNumber(b.amount ?? b.betAmount, 0).toFixed(2)}</span>
                        <span className={isWin ? "text-green" : "text-red"}>
                          {status === "cashed_out" || status === "won" ? "WIN" : status === "lost" ? "LOST" : "PENDING"}
                        </span>
                        <span className={isWin ? "text-green font-bold" : "text-gray"}>
                          {isWin 
                            ? `₹${safeNumber(b.payout ?? b.winAmount, 0).toFixed(2)}` 
                            : "—"}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </aside>

        {/* Right Side: Game Arena (Flight & Bets) */}
        <div className="sp-av-arena">
          {/* Top Multiplier History Strip */}
          <div className="sp-av-history-bar">
            {recentRounds.slice(0, 14).map((r, idx) => {
              const mult = r.crashPoint ?? r.crashMultiplier ?? r.crash_multiplier ?? 1.0;
              return (
                <span className={`sp-av-history-pill ${getPillClass(mult)}`} key={r.roundId || idx}>
                  {Number(mult).toFixed(2)}x
                </span>
              );
            })}
          </div>

          {/* Flight Stage Board */}
          <div className="sp-av-stage">
            {/* Grid Overlay */}
            <div className="sp-av-grid-bg" />

            {/* Countdown / Wait Screen */}
            {roundStatus === "starting" && (
              <div className="sp-av-wait-overlay">
                <span className="sp-av-countdown-label">WAITING FOR NEXT ROUND</span>
                <span className="sp-av-countdown-timer">{Number(countdown).toFixed(1)}s</span>
                <div className="sp-av-progress-bar-container">
                  <div 
                    className="sp-av-progress-bar-fill" 
                    style={{ width: `${(Number(countdown) / 5.0) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* In-Flight Multiplier Display */}
            {roundStatus === "flying" && (
              <div className="sp-av-live-multiplier-center">
                {formatMultiplier(liveMultiplier)}
              </div>
            )}

            {/* Crashed Screen */}
            {roundStatus === "crashed" && (
              <div className="sp-av-crash-overlay">
                <span className="sp-av-crash-label">FLEW AWAY!</span>
                <span className="sp-av-crash-multiplier text-red">
                  {formatMultiplier(crashMultiplier || liveMultiplier)}
                </span>
              </div>
            )}

             {/* Center Partner Logo Placeholder */}
            {(roundStatus === "starting" || roundStatus === "idle") && (
              <div className="sp-av-center-logo">
                <span className="sp-av-partner-tag">SPRIBE</span>
                <span className="sp-av-partner-title">AVIATOR</span>
              </div>
            )}

            {/* Flight Path SVG Line */}
            {roundStatus === "flying" && (
              <svg className="sp-av-flight-svg" viewBox="0 0 100 100" preserveAspectRatio="none" width="100%" height="100%">
                <path
                  d={pathD}
                  fill="none"
                  stroke="#ff053b"
                  strokeWidth="2.5"
                  className="sp-av-path-animation"
                />
              </svg>
            )}

            {/* Flying Red Plane Icon */}
            {roundStatus === "flying" && (
              <div className="sp-av-plane-wrapper" style={planeStyle}>
                <RedPlaneIcon />
              </div>
            )}
          </div>

          {/* Double Bet Control Panels */}
          <div className="sp-av-double-bet-wrapper">
            {/* Bet Panel 1 */}
            <div className="sp-av-bet-panel">
              <div className="sp-av-panel-header">
                <button 
                  className={`sp-av-mode-btn ${!autoBetEnabled1 && !autoCashOutEnabled1 ? "active" : ""}`}
                  onClick={() => { setAutoBetEnabled1(false); setAutoCashOutEnabled1(false); }}
                >
                  Bet
                </button>
                <button 
                  className={`sp-av-mode-btn ${autoBetEnabled1 || autoCashOutEnabled1 ? "active" : ""}`}
                  onClick={() => { setAutoCashOutEnabled1(true); }}
                >
                  Auto
                </button>
              </div>

              <div className="sp-av-panel-body">
                {/* Amount Selectors */}
                <div className="sp-av-input-controls">
                  <div className="sp-av-number-picker">
                    <button className="sp-av-pick-btn" onClick={() => setBetAmount1(Math.max(limits.minBetAmount, betAmount1 - 10))}>-</button>
                    <input 
                      type="number" 
                      className="sp-av-amount-input" 
                      value={betAmount1} 
                      onChange={(e) => setBetAmount1(Math.max(limits.minBetAmount, Number(e.target.value) || limits.minBetAmount))}
                    />
                    <button className="sp-av-pick-btn" onClick={() => setBetAmount1(Math.min(limits.maxBetAmount, betAmount1 + 10))}>+</button>
                  </div>
                  <div className="sp-av-quick-presets">
                    <button className="sp-av-preset-btn" onClick={() => setBetAmount1(100)}>100</button>
                    <button className="sp-av-preset-btn" onClick={() => setBetAmount1(200)}>200</button>
                    <button className="sp-av-preset-btn" onClick={() => setBetAmount1(500)}>500</button>
                    <button className="sp-av-preset-btn" onClick={() => setBetAmount1(1000)}>1000</button>
                  </div>
                </div>

                {/* Big Action Button */}
                <div className="sp-av-action-button-col">
                  {/* Validation Error Banner */}
                  {error1 && <div className="sp-av-panel-error">{error1}</div>}

                  {!activeBet1 ? (
                    <button 
                      className="sp-av-giant-btn btn-green"
                      disabled={loading1}
                      onClick={handleBet1}
                    >
                      <span className="btn-label-title">BET</span>
                      <span className="btn-label-sub">{betAmount1} INR</span>
                    </button>
                  ) : (activeBet1.status === "active" || activeBet1.state === "pending" || activeBet1.state === "next_round") && roundStatus === "flying" ? (
                    <button 
                      className="sp-av-giant-btn btn-orange"
                      disabled={loading1}
                      onClick={handleCashOut1}
                    >
                      <span className="btn-label-title">CASH OUT</span>
                      <span className="btn-label-sub">{(betAmount1 * liveMultiplier).toFixed(2)} INR</span>
                    </button>
                  ) : (
                    <button 
                      className="sp-av-giant-btn btn-red"
                      onClick={handleCancel1}
                    >
                      <span className="btn-label-title">CANCEL</span>
                      <span className="btn-label-sub">Waiting Round</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Auto Bet Features */}
              {(autoBetEnabled1 || autoCashOutEnabled1) && (
                <div className="sp-av-auto-features">
                  <div className="sp-av-auto-row">
                    <span className="sp-av-auto-label">Auto Bet</span>
                    <button 
                      className={`sp-av-auto-toggle ${autoBetEnabled1 ? "enabled" : ""}`}
                      onClick={() => setAutoBetEnabled1(v => !v)}
                    >
                      {autoBetEnabled1 ? "ON" : "OFF"}
                    </button>
                  </div>
                  <div className="sp-av-auto-row">
                    <span className="sp-av-auto-label">Auto Cashout</span>
                    <button 
                      className={`sp-av-auto-toggle ${autoCashOutEnabled1 ? "enabled" : ""}`}
                      onClick={() => setAutoCashOutEnabled1(v => !v)}
                    >
                      {autoCashOutEnabled1 ? "ON" : "OFF"}
                    </button>
                    {autoCashOutEnabled1 && (
                      <input 
                        type="number" 
                        step="0.1" 
                        min="1.01" 
                        className="sp-av-auto-input" 
                        value={autoCashOut1}
                        onChange={(e) => setAutoCashOut1(Math.max(1.01, Number(e.target.value) || 1.01))}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Bet Panel 2 */}
            <div className="sp-av-bet-panel">
              <div className="sp-av-panel-header">
                <button 
                  className={`sp-av-mode-btn ${!autoBetEnabled2 && !autoCashOutEnabled2 ? "active" : ""}`}
                  onClick={() => { setAutoBetEnabled2(false); setAutoCashOutEnabled2(false); }}
                >
                  Bet
                </button>
                <button 
                  className={`sp-av-mode-btn ${autoBetEnabled2 || autoCashOutEnabled2 ? "active" : ""}`}
                  onClick={() => { setAutoCashOutEnabled2(true); }}
                >
                  Auto
                </button>
              </div>

              <div className="sp-av-panel-body">
                {/* Amount Selectors */}
                <div className="sp-av-input-controls">
                  <div className="sp-av-number-picker">
                    <button className="sp-av-pick-btn" onClick={() => setBetAmount2(Math.max(limits.minBetAmount, betAmount2 - 10))}>-</button>
                    <input 
                      type="number" 
                      className="sp-av-amount-input" 
                      value={betAmount2} 
                      onChange={(e) => setBetAmount2(Math.max(limits.minBetAmount, Number(e.target.value) || limits.minBetAmount))}
                    />
                    <button className="sp-av-pick-btn" onClick={() => setBetAmount2(Math.min(limits.maxBetAmount, betAmount2 + 10))}>+</button>
                  </div>
                  <div className="sp-av-quick-presets">
                    <button className="sp-av-preset-btn" onClick={() => setBetAmount2(100)}>100</button>
                    <button className="sp-av-preset-btn" onClick={() => setBetAmount2(200)}>200</button>
                    <button className="sp-av-preset-btn" onClick={() => setBetAmount2(500)}>500</button>
                    <button className="sp-av-preset-btn" onClick={() => setBetAmount2(1000)}>1000</button>
                  </div>
                </div>

                {/* Big Action Button */}
                <div className="sp-av-action-button-col">
                  {/* Validation Error Banner */}
                  {error2 && <div className="sp-av-panel-error">{error2}</div>}

                  {!activeBet2 ? (
                    <button 
                      className="sp-av-giant-btn btn-green"
                      disabled={loading2}
                      onClick={handleBet2}
                    >
                      <span className="btn-label-title">BET</span>
                      <span className="btn-label-sub">{betAmount2} INR</span>
                    </button>
                  ) : (activeBet2.status === "active" || activeBet2.state === "pending" || activeBet2.state === "next_round") && roundStatus === "flying" ? (
                    <button 
                      className="sp-av-giant-btn btn-orange"
                      disabled={loading2}
                      onClick={handleCashOut2}
                    >
                      <span className="btn-label-title">CASH OUT</span>
                      <span className="btn-label-sub">{(betAmount2 * liveMultiplier).toFixed(2)} INR</span>
                    </button>
                  ) : (
                    <button 
                      className="sp-av-giant-btn btn-red"
                      onClick={handleCancel2}
                    >
                      <span className="btn-label-title">CANCEL</span>
                      <span className="btn-label-sub">Waiting Round</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Auto Bet Features */}
              {(autoBetEnabled2 || autoCashOutEnabled2) && (
                <div className="sp-av-auto-features">
                  <div className="sp-av-auto-row">
                    <span className="sp-av-auto-label">Auto Bet</span>
                    <button 
                      className={`sp-av-auto-toggle ${autoBetEnabled2 ? "enabled" : ""}`}
                      onClick={() => setAutoBetEnabled2(v => !v)}
                    >
                      {autoBetEnabled2 ? "ON" : "OFF"}
                    </button>
                  </div>
                  <div className="sp-av-auto-row">
                    <span className="sp-av-auto-label">Auto Cashout</span>
                    <button 
                      className={`sp-av-auto-toggle ${autoCashOutEnabled2 ? "enabled" : ""}`}
                      onClick={() => setAutoCashOutEnabled2(v => !v)}
                    >
                      {autoCashOutEnabled2 ? "ON" : "OFF"}
                    </button>
                    {autoCashOutEnabled2 && (
                      <input 
                        type="number" 
                        step="0.1" 
                        min="1.01" 
                        className="sp-av-auto-input" 
                        value={autoCashOut2}
                        onChange={(e) => setAutoCashOut2(Math.max(1.01, Number(e.target.value) || 1.01))}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
