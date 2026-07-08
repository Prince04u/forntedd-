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
      setMyRolls(Array.isArray(rolls) ? rolls : []);
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

  const executeRoll = useCallback(async () => {
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
        condition,
        target: normalizedTarget,
        clientRollId: `dc_${Date.now()}`,
      };

      const res = await roll(payload);
      const rollData = res?.data?.roll || res?.roll || res?.data || null;
      if (rollData) {
        setLastRoll(rollData);
        setMyRolls((prev) => [rollData, ...prev].slice(0, 30));
        
        // Settle dice based on roll result (0 to 100 maps to sum 2 to 12)
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

  const handleRollClick = async () => {
    if (bettingLocked) return;
    await executeRoll();
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

  const rollDisplay = rollingNumber != null ? rollingNumber : lastRoll?.result ?? "—";
  const lastStatus = lastRoll?.status;
  const resultPill =
    lastStatus === "won" ? <span className="dc-pill win">WIN</span> : lastStatus === "lost" ? <span className="dc-pill loss">LOST</span> : null;

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
        <Link href="/" className="dc-back" aria-label="Back to home">
          ‹
        </Link>
        <BrandLogo href="/" size="sm" className="dc-brand-logo" />
        <div className="dc-header-icons">
          <button type="button" onClick={loadData} disabled={loading} title="Refresh" aria-label="Refresh">
            ↻
          </button>
        </div>
      </header>

      <section className="dc-wallet-card">
        <div className="dc-wallet-row">
          <div>
            <span className="dc-wallet-label">Wallet balance</span>
            <div className="dc-wallet-amount">₹{balance.toFixed(2)}</div>
          </div>
          <div className="dc-wallet-actions">
            <Link href="/wallet" className="dc-btn-withdraw">
              Withdraw
            </Link>
            <Link href="/wallet/deposit" className="dc-btn-deposit">
              Deposit
            </Link>
          </div>
        </div>
      </section>

      {(maintenanceMode || blocksAction("bet")) && (
        <div className="dc-maintenance-notice">
          {maintenanceMessage || "Dice is temporarily unavailable during maintenance."}
        </div>
      )}

      {error && <div className="auth-error dc-msg">{error}</div>}

      <section className="dc-hero">
        <span className="dc-hero-kicker">Dice</span>
        <h1 className="dc-hero-title">Bet under or over. Fast rolls. Instant payouts.</h1>
        <p className="dc-hero-copy">
          Adjustable win chance and multiplier using Lucky Nova’s existing wallet flow and bet locking rules.
        </p>
      </section>

      <section className="dc-panel">
        <div className="dc-panel-top">
          <div className="dc-metric">
            <span>Win chance</span>
            <strong>{winChance.toFixed(2)}%</strong>
            <small>{condition === "under" ? `Roll under ${normalizedTarget.toFixed(2)}` : `Roll over ${normalizedTarget.toFixed(2)}`}</small>
          </div>
          <div className="dc-metric">
            <span>Multiplier</span>
            <strong>{multiplier.toFixed(2)}x</strong>
            <small>Profit on win: +₹{profitOnWin.toFixed(2)}</small>
          </div>
        </div>

        <div className="dc-roll-stage">
          <div className="dc-dice-container" aria-label="Gold metallic casino dice">
            <div className={`dc-dice-wrap ${rollingNumber !== null ? "dc-rolling" : ""}`}>
              <div className="dc-die">
                <GoldDie value={d1} />
              </div>
              <div className="dc-die">
                <GoldDie value={d2} />
              </div>
            </div>
            <div className="dc-dice-number-display">
              <div className="dc-roll-number">{typeof rollDisplay === "number" ? rollDisplay.toFixed(2) : rollDisplay}</div>
              <div className="dc-roll-label">{rollingNumber !== null ? "ROLLING..." : "ROLL RESULT"}</div>
            </div>
          </div>
          <div className="dc-roll-result">
            {resultPill}
            <p>
              Target: <strong>{normalizedTarget.toFixed(2)}</strong> · Mode: <strong>{condition}</strong>
            </p>
            <p>
              Stake: <strong>₹{betAmount.toFixed(2)}</strong> · Session P/L:{" "}
              <strong style={{ color: sessionProfit >= 0 ? "#86efac" : "var(--theme-danger-text)" }}>
                {sessionProfit >= 0 ? "+" : "−"}₹{Math.abs(sessionProfit).toFixed(2)}
              </strong>
            </p>
          </div>
        </div>
      </section>

      <section className="dc-controls">
        <span className="dc-control-label">Bet controls</span>

        <div className="dc-toggle-row">
          <button
            type="button"
            className={`dc-toggle ${condition === "under" ? "active" : ""}`}
            disabled={bettingLocked || autoRunning}
            onClick={() => setCondition("under")}
          >
            Under
          </button>
          <button
            type="button"
            className={`dc-toggle ${condition === "over" ? "active" : ""}`}
            disabled={bettingLocked || autoRunning}
            onClick={() => setCondition("over")}
          >
            Over
          </button>
        </div>

        <div className="dc-slider-wrap">
          <div className="dc-slider-meta">
            <span>Target</span>
            <strong>{normalizedTarget.toFixed(2)}</strong>
            <span>
              Limits {cfg.minTarget}–{cfg.maxTarget}
            </span>
          </div>
          <input
            className="dc-slider"
            type="range"
            min={cfg.minTarget}
            max={cfg.maxTarget}
            step={0.1}
            value={normalizedTarget}
            disabled={bettingLocked || autoRunning}
            onChange={(e) => setTarget(Number(e.target.value))}
          />
        </div>

        <div className="dc-input-row">
          <input
            className="dc-input"
            type="number"
            min={cfg.minBetAmount}
            max={cfg.maxBetAmount}
            value={betAmount}
            disabled={bettingLocked || autoRunning}
            onChange={(e) => setBetAmount(Math.max(0, Number(e.target.value) || 0))}
            aria-label="Bet amount"
          />
          <input
            className="dc-input"
            type="number"
            min={250}
            max={5000}
            step={50}
            value={autoDelayMs}
            disabled={bettingLocked || autoRunning}
            onChange={(e) => setAutoDelayMs(clamp(Number(e.target.value) || 900, 250, 5000))}
            aria-label="Auto bet delay milliseconds"
          />
        </div>

        <div className="dc-autobet">
          <input
            className="dc-input"
            type="number"
            min={0}
            step={1}
            value={stopOnProfit}
            disabled={bettingLocked || autoRunning}
            onChange={(e) => setStopOnProfit(Math.max(0, Number(e.target.value) || 0))}
            aria-label="Stop on profit"
            placeholder="Stop on profit"
          />
          <input
            className="dc-input"
            type="number"
            min={0}
            step={1}
            value={stopOnLoss}
            disabled={bettingLocked || autoRunning}
            onChange={(e) => setStopOnLoss(Math.max(0, Number(e.target.value) || 0))}
            aria-label="Stop on loss"
            placeholder="Stop on loss"
          />
        </div>

        <div style={{ marginTop: "0.75rem" }}>
          <button
            type="button"
            className={`dc-toggle ${autoBetEnabled ? "active" : ""}`}
            disabled={bettingLocked || autoRunning}
            onClick={() => setAutoBetEnabled((v) => !v)}
          >
            Auto bet
          </button>
        </div>

        <div style={{ marginTop: "0.75rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
          <button type="button" className="dc-btn roll" disabled={bettingLocked || autoRunning} onClick={handleRollClick}>
            {loading ? "Rolling..." : `Roll · ₹${betAmount.toFixed(2)}`}
          </button>
          {autoBetEnabled ? (
            <button
              type="button"
              className="dc-btn stop"
              disabled={bettingLocked}
              onClick={() => (autoRunning ? stopAuto() : startAuto())}
            >
              {autoRunning ? "Stop" : "Start auto"}
            </button>
          ) : (
            <button type="button" className="dc-btn stop" disabled>
              Auto bet off
            </button>
          )}
        </div>
      </section>

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
                const status = r.status || (r.payout > 0 ? "won" : "lost");
                const profit = safeNumber(r.profit, status === "won" ? r.payout - r.amount : -r.amount);
                return (
                  <tr key={r.id || r._id}>
                    <td style={{ fontFamily: "monospace", color: "var(--theme-text-muted)" }}>
                      {safeNumber(r.result, 0).toFixed(2)}
                    </td>
                    <td>
                      {String(r.condition || condition)} {safeNumber(r.target, 0).toFixed(2)}
                    </td>
                    <td>
                      <span className={`dc-pill ${status === "won" ? "win" : "loss"}`}>{status}</span>
                    </td>
                    <td style={{ color: profit >= 0 ? "#86efac" : "var(--theme-danger-text)", fontWeight: 800 }}>
                      {profit >= 0 ? "+" : "−"}₹{Math.abs(profit).toFixed(2)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </section>

      <BottomNav />
    </main>
  );
}

