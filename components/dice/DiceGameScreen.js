"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BottomNav from "@/components/home/BottomNav";
import BrandLogo from "@/components/brand/BrandLogo";
import { usePlatformStatus } from "@/components/platform/PlatformStatusProvider";
import { getToken } from "@/lib/auth";
import { getSocket } from "@/lib/socket";
import { getBalance } from "@/lib/walletApi";
import { getDiceConfig } from "@/lib/platformApi";
import { getMyRolls, roll } from "@/lib/diceApi";

const DEFAULT_CFG = {
  minBetAmount: 10,
  maxBetAmount: 100000,
  minTarget: 5,
  maxTarget: 95,
  houseEdge: 0.01,
};

const safeNumber = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeRoll = (r) => {
  if (!r) return null;
  const details = r.details || {};
  const result = details.rolledValue ?? r.result ?? r.rollResult ?? 50.00;
  const target = details.targetValue ?? r.target ?? 50.00;
  const condition = details.prediction ?? r.condition ?? "under";
  const status = r.state ?? r.status ?? (r.payout > 0 || r.winAmount > 0 ? "won" : "lost");
  const amount = r.amount ?? r.betAmount ?? 100;
  const winAmount = r.winAmount ?? r.payout ?? 0;
  const profit = r.profit !== undefined ? r.profit : (status === "won" ? winAmount - amount : -amount);
  
  return {
    id: r._id || r.id,
    result: Number(result),
    target: Number(target),
    condition,
    status,
    amount: Number(amount),
    winAmount: Number(winAmount),
    profit: Number(profit),
  };
};

function GoldDie({ value }) {
  const renderTopPips = () => {
    switch (value) {
      case 1:
        return <circle cx="40" cy="25" r="4" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>;
      case 2:
        return (
          <>
            <circle cx="52" cy="19" r="3.2" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
            <circle cx="28" cy="31" r="3.2" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
          </>
        );
      case 3:
        return (
          <>
            <circle cx="52" cy="19" r="3.2" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
            <circle cx="40" cy="25" r="3.2" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
            <circle cx="28" cy="31" r="3.2" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
          </>
        );
      case 4:
        return (
          <>
            <circle cx="28" cy="19" r="3.2" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
            <circle cx="52" cy="19" r="3.2" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
            <circle cx="28" cy="31" r="3.2" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
            <circle cx="52" cy="31" r="3.2" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
          </>
        );
      case 5:
        return (
          <>
            <circle cx="28" cy="19" r="3.2" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
            <circle cx="52" cy="19" r="3.2" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
            <circle cx="40" cy="25" r="3.2" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
            <circle cx="28" cy="31" r="3.2" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
            <circle cx="52" cy="31" r="3.2" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
          </>
        );
      case 6:
        return (
          <>
            <circle cx="28" cy="17" r="2.8" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
            <circle cx="28" cy="25" r="2.8" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
            <circle cx="28" cy="33" r="2.8" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
            <circle cx="52" cy="17" r="2.8" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
            <circle cx="52" cy="25" r="2.8" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
            <circle cx="52" cy="33" r="2.8" fill="#302002" stroke="#fff" strokeWidth="0.4" opacity="0.95"/>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <svg viewBox="0 0 80 80" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="dieGoldTop" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
          <stop offset="0%" stop-color="#FFFDF2"/>
          <stop offset="35%" stop-color="#FCD974"/>
          <stop offset="80%" stop-color="#C29A21"/>
          <stop offset="100%" stop-color="#84620A"/>
        </radialGradient>
        <linearGradient id="dieGoldLeft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#EAA61E"/>
          <stop offset="60%" stop-color="#B28414"/>
          <stop offset="100%" stop-color="#604605"/>
        </linearGradient>
        <linearGradient id="dieGoldRight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#FFF0BE"/>
          <stop offset="50%" stop-color="#CE9B21"/>
          <stop offset="100%" stop-color="#72550D"/>
        </linearGradient>
      </defs>

      {/* Top Face */}
      <polygon points="40,10 70,25 40,40 10,25" fill="url(#dieGoldTop)" stroke="#FFF7D1" strokeWidth="0.5" strokeLinejoin="round"/>
      
      {/* Left Face */}
      <polygon points="10,25 40,40 40,75 10,60" fill="url(#dieGoldLeft)" stroke="#B58D21" strokeWidth="0.5" strokeLinejoin="round"/>
      
      {/* Right Face */}
      <polygon points="70,25 40,40 40,75 70,60" fill="url(#dieGoldRight)" stroke="#FFF7D1" strokeWidth="0.5" strokeLinejoin="round"/>
      
      {/* Inner reflections */}
      <polyline points="10,25 40,40 70,25" fill="none" stroke="#FFFDF5" strokeWidth="0.8" opacity="0.65"/>
      <line x1="40" y1="40" x2="40" y2="75" fill="none" stroke="#FFE9A3" strokeWidth="0.8" opacity="0.55"/>

      {/* Render pips on Top Face */}
      {renderTopPips()}

      {/* Left Face Pips (isometric ellipsis, representing 3) */}
      <g opacity="0.95">
        <ellipse cx="20" cy="40" rx="2" ry="2.8" fill="#302002" stroke="#fff" strokeWidth="0.2"/>
        <ellipse cx="25" cy="50" rx="2" ry="2.8" fill="#302002" stroke="#fff" strokeWidth="0.2"/>
        <ellipse cx="30" cy="60" rx="2" ry="2.8" fill="#302002" stroke="#fff" strokeWidth="0.2"/>
      </g>

      {/* Right Face Pips (isometric ellipsis, representing 4) */}
      <g opacity="0.95">
        <ellipse cx="50" cy="43" rx="2" ry="2.8" fill="#302002" stroke="#fff" strokeWidth="0.2"/>
        <ellipse cx="60" cy="48" rx="2" ry="2.8" fill="#302002" stroke="#fff" strokeWidth="0.2"/>
        <ellipse cx="50" cy="57" rx="2" ry="2.8" fill="#302002" stroke="#fff" strokeWidth="0.2"/>
        <ellipse cx="60" cy="62" rx="2" ry="2.8" fill="#302002" stroke="#fff" strokeWidth="0.2"/>
      </g>
    </svg>
  );
}

export default function DiceGameScreen() {
  const router = useRouter();
  const { maintenanceMode, message: maintenanceMessage, blocksAction } = usePlatformStatus();

  const [mounted, setMounted] = useState(false);
  const [balance, setBalance] = useState(0);
  const [cfg, setCfg] = useState(DEFAULT_CFG);
  const [myRolls, setMyRolls] = useState([]);

  const [condition, setCondition] = useState("under"); // under | over
  const [target, setTarget] = useState(49.5);
  const [betAmount, setBetAmount] = useState(100);

  const [autoBetEnabled, setAutoBetEnabled] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const [stopOnProfit, setStopOnProfit] = useState(0);
  const [stopOnLoss, setStopOnLoss] = useState(0);
  const [autoDelayMs, setAutoDelayMs] = useState(900);
  const [sessionProfit, setSessionProfit] = useState(0);

  const [rollingNumber, setRollingNumber] = useState(null);
  const [lastRoll, setLastRoll] = useState(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [d1, setD1] = useState(3);
  const [d2, setD2] = useState(4);

  const autoLoopRef = useRef({ cancelled: false, running: false });

  const bettingLocked = loading || maintenanceMode || blocksAction("bet");

  const normalizedTarget = useMemo(() => {
    const min = safeNumber(cfg.minTarget, DEFAULT_CFG.minTarget);
    const max = safeNumber(cfg.maxTarget, DEFAULT_CFG.maxTarget);
    return clamp(safeNumber(target, 50), min, max);
  }, [cfg.maxTarget, cfg.minTarget, target]);

  const winChance = useMemo(() => {
    const t = normalizedTarget;
    return condition === "under" ? t : 100 - t;
  }, [condition, normalizedTarget]);

  const multiplier = useMemo(() => {
    const edge = clamp(safeNumber(cfg.houseEdge, DEFAULT_CFG.houseEdge), 0, 0.2);
    const chance = clamp(winChance, 0.01, 99.99);
    return (1 - edge) / (chance / 100);
  }, [cfg.houseEdge, winChance]);

  const profitOnWin = useMemo(() => betAmount * (multiplier - 1), [betAmount, multiplier]);

  const loadData = useCallback(async () => {
    if (!getToken()) return;
    try {
      const [balanceRes, configRes, rollsRes] = await Promise.all([
        getBalance(),
        getDiceConfig().catch(() => ({ data: null })),
        getMyRolls({ limit: 30 }).catch(() => ({ rolls: [] })),
      ]);

      setBalance(balanceRes?.data?.balance ?? balanceRes?.balance ?? 0);

      const c = configRes?.data || configRes || {};
      setCfg({
        minBetAmount: safeNumber(c.minBetAmount, DEFAULT_CFG.minBetAmount),
        maxBetAmount: safeNumber(c.maxBetAmount, DEFAULT_CFG.maxBetAmount),
        minTarget: safeNumber(c.minTarget, DEFAULT_CFG.minTarget),
        maxTarget: safeNumber(c.maxTarget, DEFAULT_CFG.maxTarget),
        houseEdge: safeNumber(c.houseEdge, DEFAULT_CFG.houseEdge),
      });

      const rolls = rollsRes?.data?.rolls || rollsRes?.rolls || rollsRes?.data || [];
      setMyRolls((Array.isArray(rolls) ? rolls : []).map(normalizeRoll));
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load Dice");
    }
  }, []);

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
      socket.on("wallet:updated", onWalletUpdated);
    });

    return () => {
      cancelled = true;
      if (activeSocket) {
        activeSocket.off("wallet:updated", onWalletUpdated);
      }
    };
  }, [loadData, router]);

  const validate = () => {
    if (betAmount < cfg.minBetAmount || betAmount > cfg.maxBetAmount) {
      return `Bet amount must be between ₹${cfg.minBetAmount} and ₹${cfg.maxBetAmount.toLocaleString("en-IN")}`;
    }
    if (betAmount > balance) return "Insufficient balance";
    return "";
  };

  const executeRoll = useCallback(async (overrideCondition) => {
    const activeCondition = overrideCondition ?? condition;
    if (overrideCondition) {
      setCondition(overrideCondition);
    }
    const validation = validate();
    if (validation) {
      setError(validation);
      return null;
    }

    setError("");
    setLoading(true);

    const spinner = { id: null, stopped: false };
    spinner.id = window.setInterval(() => {
      if (spinner.stopped) return;
      setRollingNumber(Number((Math.random() * 100).toFixed(2)));
      setD1(Math.floor(Math.random() * 6) + 1);
      setD2(Math.floor(Math.random() * 6) + 1);
    }, 55);

    try {
      const payload = {
        amount: betAmount,
        condition: activeCondition,
        target: normalizedTarget,
        clientRollId: `dc_${Date.now()}`,
      };

      const res = await roll(payload);
      const rawRollData = res?.data || res;
      const rollData = normalizeRoll(rawRollData);
      
      // Spin for 600ms to build up tension before revealing landing value
      await new Promise((resolve) => setTimeout(resolve, 600));

      if (rollData) {
        // Stop spinner and show final roll value
        spinner.stopped = true;
        if (spinner.id) window.clearInterval(spinner.id);
        setRollingNumber(null);

        setLastRoll(rollData);
        setMyRolls((prev) => [rollData, ...prev].slice(0, 30));
        
        // Settle dice face values
        const val = rollData.result;
        const finalSum = Math.round(2 + (val / 100) * 10);
        let finalD1 = Math.min(6, Math.max(1, Math.floor(finalSum / 2)));
        let finalD2 = finalSum - finalD1;
        if (finalD2 > 6) {
          finalD1 += (finalD2 - 6);
          finalD2 = 6;
        }
        setD1(finalD1);
        setD2(finalD2);
      }

      if (res?.data?.balance != null) setBalance(res.data.balance);
      if (res?.balance != null) setBalance(res.balance);

      await loadData();

      return rollData;
    } catch (err) {
      setError(err.response?.data?.message || "Roll failed");
      return null;
    } finally {
      spinner.stopped = true;
      if (spinner.id) window.clearInterval(spinner.id);
      setRollingNumber(null);
      setLoading(false);
    }
  }, [betAmount, condition, loadData, normalizedTarget]);

  const handleRollClick = async (overrideCondition) => {
    if (bettingLocked) return;
    await executeRoll(overrideCondition);
  };

  const startAuto = async () => {
    if (autoLoopRef.current.running) return;
    if (bettingLocked) return;

    autoLoopRef.current.cancelled = false;
    autoLoopRef.current.running = true;
    setAutoRunning(true);
    setError("");
    setSessionProfit(0);

    while (!autoLoopRef.current.cancelled) {
      if (maintenanceMode || blocksAction("bet")) break;
      if (!getToken()) break;
      if (betAmount > balance) {
        setError("Auto bet stopped: insufficient balance");
        break;
      }

      const rollData = await executeRoll();
      if (!rollData) {
        // If backend rejects or network errors, stop to avoid burning requests.
        break;
      }

      const profit = safeNumber(rollData.profit, rollData.status === "won" ? rollData.payout - betAmount : -betAmount);
      setSessionProfit((prev) => {
        const next = prev + profit;
        return next;
      });

      const nextProfit = (autoLoopRef.current.lastProfit ?? 0) + profit;
      autoLoopRef.current.lastProfit = nextProfit;

      if (stopOnProfit > 0 && nextProfit >= stopOnProfit) {
        setError(`Auto bet stopped: reached profit target (+₹${stopOnProfit.toFixed(2)})`);
        break;
      }
      if (stopOnLoss > 0 && nextProfit <= -stopOnLoss) {
        setError(`Auto bet stopped: reached loss limit (−₹${stopOnLoss.toFixed(2)})`);
        break;
      }

      await new Promise((r) => setTimeout(r, clamp(autoDelayMs, 250, 5000)));
    }

    autoLoopRef.current.running = false;
    autoLoopRef.current.cancelled = false;
    autoLoopRef.current.lastProfit = 0;
    setAutoRunning(false);
  };

  const stopAuto = () => {
    autoLoopRef.current.cancelled = true;
    setAutoRunning(false);
  };

  useEffect(() => {
    if (!autoBetEnabled) {
      stopAuto();
      return;
    }
    if (!autoRunning) return;
  }, [autoBetEnabled, autoRunning]);

  const rollDisplay = rollingNumber !== null ? rollingNumber : lastRoll ? lastRoll.result : 50.00;

  const handlePosition = useMemo(() => {
    if (rollingNumber !== null) return rollingNumber;
    if (lastRoll !== null) return lastRoll.result;
    return normalizedTarget;
  }, [rollingNumber, lastRoll, normalizedTarget]);

  const trackBackground = useMemo(() => {
    if (condition === "under") {
      return `linear-gradient(to right, #22c55e 0%, #22c55e ${normalizedTarget}%, #991b1b ${normalizedTarget}%, #991b1b 100%)`;
    } else {
      return `linear-gradient(to right, #991b1b 0%, #991b1b ${normalizedTarget}%, #3b82f6 ${normalizedTarget}%, #3b82f6 100%)`;
    }
  }, [condition, normalizedTarget]);

  if (!mounted) {
    return (
      <main className="dice-game">
        <div className="dc-msg">Loading...</div>
      </main>
    );
  }

  return (
    <main className="dice-game">
      <header className="dc-header">
        <div className="dc-header-left">
          <Link href="/" className="dc-back" aria-label="Back to home">
            ‹
          </Link>
          <span className="dc-header-logo-text">DICE</span>
          <button className="dc-header-how" type="button">How to Play?</button>
        </div>
        <div className="dc-header-right">
          <span className="dc-header-balance">{balance.toFixed(2)} INR</span>
          <button className="dc-header-menu-btn" aria-label="Menu">
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </header>

      {error && <div className="auth-error dc-msg">{error}</div>}

      <section className="dc-board-stage">
        {/* Real-time roll history bar */}
        <div className="sp-dc-history-bar">
          <div className="sp-dc-history-scroll">
            {myRolls.slice(0, 10).map((r, i) => {
              const val = safeNumber(r.result, 50);
              const isLow = val < 50;
              return (
                <span 
                  key={r.id || r._id || i} 
                  className={`sp-dc-history-pill ${isLow ? "low" : "high"}`}
                >
                  {val.toFixed(2)}
                </span>
              );
            })}
          </div>
          <button 
            type="button" 
            className="sp-dc-history-toggle-btn"
            onClick={() => setHistoryOpen(!historyOpen)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="sp-dc-clock-icon"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
            <span className="sp-dc-chevron">▼</span>
          </button>
        </div>

        {/* Roll outcome main screen display */}
        <div className="dc-outcome-card">
          <div className="dc-outcome-value">
            {typeof rollDisplay === "number" ? rollDisplay.toFixed(2) : rollDisplay}
          </div>

          {/* Golden Spribe Slider bar indicator (read-only output representation of target & roll values) */}
          <div className="sp-dc-slider-container">
            <div className="sp-dc-slider-track-overlay" style={{ background: trackBackground }}>
              <div className="sp-dc-ticks" />
              <div className="sp-dc-handle" style={{ left: `${handlePosition}%` }}>
                <span className="sp-dc-handle-dot" />
              </div>
            </div>
            <div className="sp-dc-slider-labels">
              <span>0</span>
              <span>25</span>
              <span>50</span>
              <span>75</span>
              <span>100</span>
            </div>
          </div>
        </div>

        {/* Payout & win stats capsule pill card */}
        <div className="sp-dc-payout-box">
          <div className="sp-dc-payout-row">
            <div className="sp-dc-payout-col">
              <span className="sp-dc-label">Payout</span>
              <div className="sp-dc-value-badge">{multiplier.toFixed(2)} x</div>
            </div>
            <div className="sp-dc-mini-track">
              <div className="sp-dc-mini-fill" style={{ width: `${winChance}%` }} />
              <div className="sp-dc-mini-thumb" style={{ left: `${winChance}%` }}>
                ‹›
              </div>
              <input 
                type="range"
                className="sp-dc-mini-range-native"
                min={cfg.minTarget}
                max={cfg.maxTarget}
                step={0.1}
                value={winChance}
                disabled={bettingLocked || autoRunning}
                onChange={(e) => {
                  const newChance = Number(e.target.value);
                  if (condition === "under") {
                    setTarget(newChance);
                  } else {
                    setTarget(100 - newChance);
                  }
                }}
              />
            </div>
          </div>
          <div className="sp-dc-metrics-sub">
            <span className="sp-dc-pot-win">Potential win: <strong>{profitOnWin.toFixed(2)} INR</strong></span>
            <span className="sp-dc-chance">Chance: <strong>{winChance.toFixed(2)} %</strong></span>
          </div>
        </div>

        {/* Spribe Control bar row */}
        <div className="sp-dc-control-row">
          {/* Bet Amount input */}
          <div className="sp-dc-bet-picker">
            <span className="sp-dc-bet-label">Bet INR</span>
            <div className="sp-dc-bet-control-container">
              <button 
                type="button"
                className="sp-dc-picker-btn" 
                disabled={bettingLocked || autoRunning}
                onClick={() => setBetAmount(prev => Math.max(cfg.minBetAmount, prev - 10))}
              >
                -
              </button>
              <input 
                type="number" 
                value={betAmount} 
                disabled={bettingLocked || autoRunning}
                onChange={(e) => setBetAmount(Math.max(0, Number(e.target.value) || 0))} 
                className="sp-dc-bet-input"
              />
              <button type="button" className="sp-dc-picker-btn-presets">🔲</button>
              <button 
                type="button"
                className="sp-dc-picker-btn" 
                disabled={bettingLocked || autoRunning}
                onClick={() => setBetAmount(prev => Math.min(cfg.maxBetAmount, prev + 10))}
              >
                +
              </button>
            </div>
          </div>

          {/* Speed roll toggle */}
          <button className="sp-dc-speed-btn" type="button" disabled={bettingLocked || autoRunning}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="sp-dc-speed-icon"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>
          </button>

          {/* Roll Under Button */}
          <button 
            type="button" 
            className="sp-dc-roll-btn sp-dc-under" 
            disabled={bettingLocked || autoRunning} 
            onClick={() => handleRollClick("under")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="sp-dc-arrow-svg"><path d="M12 5v14M19 12l-7 7-7-7"/></svg>
            <span className="sp-dc-target-val">{normalizedTarget.toFixed(2)}</span>
          </button>

          {/* Roll Over Button */}
          <button 
            type="button" 
            className="sp-dc-roll-btn sp-dc-over" 
            disabled={bettingLocked || autoRunning} 
            onClick={() => handleRollClick("over")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="sp-dc-arrow-svg"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
            <span className="sp-dc-target-val">{(100 - normalizedTarget).toFixed(2)}</span>
          </button>
        </div>
      </section>



      {historyOpen && (
        <section className="dc-history">
          <h2>Roll history</h2>
          <table className="dc-table">
            <thead>
              <tr>
                <th>Roll</th>
                <th>Target</th>
                <th>Status</th>
                <th>P/L</th>
              </tr>
            </thead>
            <tbody>
              {myRolls.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ color: "var(--theme-text-dim)", padding: "0.875rem 0.25rem" }}>
                    No rolls yet
                  </td>
                </tr>
              ) : (
              myRolls.slice(0, 25).map((r) => {
                return (
                  <tr key={r.id}>
                    <td style={{ fontFamily: "monospace", color: "var(--theme-text-muted)" }}>
                      {r.result.toFixed(2)}
                    </td>
                    <td>
                      {r.condition} {r.target.toFixed(2)}
                    </td>
                    <td>
                      <span className={`dc-pill ${r.status === "won" ? "win" : "loss"}`}>{r.status}</span>
                    </td>
                    <td style={{ color: r.profit >= 0 ? "#86efac" : "var(--theme-danger-text)", fontWeight: 800 }}>
                      {r.profit >= 0 ? "+" : "−"}₹{Math.abs(r.profit).toFixed(2)}
                    </td>
                  </tr>
                );
              })
              )}
            </tbody>
          </table>
        </section>
      )}

      <BottomNav />
    </main>
  );
}

