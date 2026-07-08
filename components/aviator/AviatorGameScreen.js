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
import { getAviatorConfig } from "@/lib/platformApi";
import { cashOut, getMyBets, getRecentRounds, placeBet } from "@/lib/aviatorApi";

const DEFAULT_LIMITS = { minBetAmount: 10, maxBetAmount: 100000, maxAutoCashOut: 100, houseEdge: 0.01 };
const HISTORY_LIMIT = 20;
const MY_BETS_LIMIT = 30;

const safeNumber = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const formatMultiplier = (value) => `${safeNumber(value, 1).toFixed(2)}x`;

export default function AviatorGameScreen() {
  const router = useRouter();
  const { maintenanceMode, message: maintenanceMessage, blocksAction } = usePlatformStatus();

  const [mounted, setMounted] = useState(false);
  const [balance, setBalance] = useState(0);
  const [limits, setLimits] = useState(DEFAULT_LIMITS);

  const [betAmount, setBetAmount] = useState(100);
  const [autoCashOutEnabled, setAutoCashOutEnabled] = useState(true);
  const [autoCashOut, setAutoCashOut] = useState(2);
  const [autoBetEnabled, setAutoBetEnabled] = useState(false);

  const [liveMultiplier, setLiveMultiplier] = useState(1);
  const [roundStatus, setRoundStatus] = useState("idle"); // idle | starting | running | crashed
  const [crashMultiplier, setCrashMultiplier] = useState(null);
  const [roundId, setRoundId] = useState(null);
  const [players, setPlayers] = useState([]);

  const [myBets, setMyBets] = useState([]);
  const [recentRounds, setRecentRounds] = useState([]);

  const [activeBet, setActiveBet] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const lastAutoBetAttemptRef = useRef(0);

  const bettingLocked = loading || maintenanceMode || blocksAction("bet");

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
      setError(err.response?.data?.message || "Failed to load Aviator");
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
      socket.emit("join:aviator");

      socket.on("wallet:updated", onWalletUpdated);

      socket.on("aviator:round:starting", (data) => {
        setRoundStatus("starting");
        setCrashMultiplier(null);
        setPlayers([]);
        if (data?.roundId) setRoundId(data.roundId);
        setLiveMultiplier(1);
      });

      socket.on("aviator:multiplier", (data) => {
        if (data?.roundId) setRoundId(data.roundId);
        setRoundStatus("running");
        if (typeof data?.multiplier === "number") {
          setLiveMultiplier(Math.max(1, data.multiplier));
        }
      });

      socket.on("aviator:crash", async (data) => {
        if (data?.roundId) setRoundId(data.roundId);
        setRoundStatus("crashed");
        if (typeof data?.crashMultiplier === "number") {
          setCrashMultiplier(data.crashMultiplier);
          setLiveMultiplier(Math.max(1, data.crashMultiplier));
        }
        // After the crash, refresh wallet + history (mirrors Mines/Wingo behavior).
        await loadData();
      });

      socket.on("aviator:players", (data) => {
        const list = data?.players;
        if (Array.isArray(list)) setPlayers(list);
      });

      socket.on("aviator:bet:update", (data) => {
        if (!data?.betId) return;
        setActiveBet((prev) => {
          if (!prev || prev.id !== data.betId) return prev;
          return { ...prev, ...data };
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
        activeSocket.off("aviator:players");
        activeSocket.off("aviator:bet:update");
      }
    };
  }, [loadData, router]);

  const validateBet = () => {
    if (betAmount < limits.minBetAmount || betAmount > limits.maxBetAmount) {
      return `Bet amount must be between ₹${limits.minBetAmount} and ₹${limits.maxBetAmount.toLocaleString("en-IN")}`;
    }
    if (betAmount > balance) return "Insufficient balance";
    if (autoCashOutEnabled) {
      if (autoCashOut < 1.01) return "Auto cash out must be at least 1.01x";
      if (autoCashOut > limits.maxAutoCashOut) return `Auto cash out must be ≤ ${limits.maxAutoCashOut}x`;
    }
    return "";
  };

  const handleBet = async () => {
    if (bettingLocked) return;
    if (activeBet?.status === "active") return;

    const validationMessage = validateBet();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    setError("");
    setLoading(true);
    try {
      const payload = {
        amount: betAmount,
        autoCashOutMultiplier: autoCashOutEnabled ? autoCashOut : null,
        autoBet: autoBetEnabled,
        clientRoundId: `av_${Date.now()}`,
      };

      const res = await placeBet(payload);
      const bet = res?.data?.bet || res?.bet || res?.data || null;
      if (bet) setActiveBet({ ...bet, status: bet.status || "active" });
      if (res?.data?.balance != null) setBalance(res.data.balance);
      if (res?.balance != null) setBalance(res.balance);

      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to place bet");
    } finally {
      setLoading(false);
    }
  };

  const handleCashOut = async () => {
    if (bettingLocked) return;
    if (!activeBet?.id) return;

    setError("");
    setLoading(true);
    try {
      const res = await cashOut({ betId: activeBet.id });
      const bet = res?.data?.bet || res?.bet || null;
      if (bet) setActiveBet(bet);
      if (res?.data?.balance != null) setBalance(res.data.balance);
      if (res?.balance != null) setBalance(res.balance);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to cash out");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!autoBetEnabled) return;
    if (!mounted || !getToken()) return;
    if (bettingLocked) return;
    if (activeBet?.status === "active") return;
    if (roundStatus !== "crashed") return;

    const now = Date.now();
    if (now - lastAutoBetAttemptRef.current < 1500) return;
    lastAutoBetAttemptRef.current = now;

    const timer = setTimeout(() => {
      handleBet();
    }, 750);

    return () => clearTimeout(timer);
  }, [activeBet?.status, autoBetEnabled, bettingLocked, mounted, roundStatus]);

  const stageTransform = useMemo(() => {
    const m = Math.max(1, safeNumber(liveMultiplier, 1));
    const x = Math.min(300, Math.log(m) / Math.log(50) * 320);
    const y = Math.min(110, (m - 1) * 18);
    const tilt = Math.max(-6, Math.min(18, y / 9));
    return `translate(${x}px, ${-y}px) rotate(${tilt}deg)`;
  }, [liveMultiplier]);

  const statusPill = useMemo(() => {
    if (roundStatus === "running") return { cls: "running", label: "LIVE" };
    if (roundStatus === "starting") return { cls: "starting", label: "Starting" };
    if (roundStatus === "crashed") return { cls: "crashed", label: "Crashed" };
    return { cls: "", label: "Waiting" };
  }, [roundStatus]);

  const activeBetLabel = useMemo(() => {
    if (!activeBet) return "No active bet";
    if (activeBet.status === "cashed_out") return `Cashed out · ${formatMultiplier(activeBet.cashoutMultiplier || activeBet.cashoutMultiplier)}`;
    if (activeBet.status === "lost") return "Lost";
    if (activeBet.status === "won") return "Won";
    if (activeBet.status === "active") return "Bet active";
    return activeBet.status || "—";
  }, [activeBet]);

  if (!mounted) {
    return (
      <main className="aviator-game">
        <div className="av-msg">Loading...</div>
      </main>
    );
  }

  return (
    <main className="aviator-game">
      <header className="av-header">
        <Link href="/" className="av-back" aria-label="Back to home">
          ‹
        </Link>
        <BrandLogo href="/" size="sm" className="av-brand-logo" />
        <div className="av-header-icons">
          <button type="button" onClick={loadData} disabled={loading} title="Refresh" aria-label="Refresh">
            ↻
          </button>
        </div>
      </header>

      <section className="av-wallet-card">
        <div className="av-wallet-row">
          <div>
            <span className="av-wallet-label">Wallet balance</span>
            <div className="av-wallet-amount">₹{balance.toFixed(2)}</div>
          </div>
          <div className="av-wallet-actions">
            <Link href="/wallet" className="av-btn-withdraw">
              Withdraw
            </Link>
            <Link href="/wallet/deposit" className="av-btn-deposit">
              Deposit
            </Link>
          </div>
        </div>
      </section>

      {(maintenanceMode || blocksAction("bet")) && (
        <div className="av-maintenance-notice">
          {maintenanceMessage || "Aviator is temporarily unavailable during maintenance."}
        </div>
      )}

      {error && <div className="auth-error av-msg">{error}</div>}

      <section className="av-hero">
        <span className="av-hero-kicker">Aviator</span>
        <h1 className="av-hero-title">Ride the multiplier. Cash out before it crashes.</h1>
        <p className="av-hero-copy">
          Uses your existing Lucky Nova wallet + auth session and listens to live round updates over sockets.
        </p>
      </section>

      <section className="av-panel">
        <div className="av-panel-top">
          <div className="av-multibox">
            <span className="av-meta-label">Multiplier</span>
            <strong className="av-multi-value">{formatMultiplier(liveMultiplier)}</strong>
            <div className="av-multi-sub">
              {roundId ? (
                <span>
                  Round <span style={{ fontFamily: "monospace" }}>{String(roundId).slice(-6)}</span>
                </span>
              ) : (
                <span>Waiting for round…</span>
              )}
            </div>
          </div>
          <div className="av-betbox">
            <span className="av-meta-label">My bet</span>
            <strong className="av-bet-value">
              {activeBet?.amount != null ? `₹${Number(activeBet.amount).toFixed(2)}` : "—"}
            </strong>
            <div className="av-multi-sub">{activeBetLabel}</div>
          </div>
        </div>

        <div className="av-stage" aria-label="Aviator stage">
          <div className="av-grid-lines" aria-hidden="true" />
          <div className={`av-stage-status ${statusPill.cls}`}>
            <span className="dot" aria-hidden="true" />
            {statusPill.label}
            {roundStatus === "crashed" && crashMultiplier != null ? (
              <span style={{ color: "var(--theme-gold-bright)" }}>{formatMultiplier(crashMultiplier)}</span>
            ) : null}
          </div>
          <div className="av-plane" style={{ transform: stageTransform }}>
            <span className="av-plane-icon" aria-hidden="true">
              <img
                src="/design/game-illustrations/aviator_plane_gold.svg"
                alt=""
                className="av-plane-img"
                draggable="false"
              />
            </span>
            <span className="av-plane-trail" aria-hidden="true" />
          </div>
        </div>
      </section>

      <section className="av-controls">
        <span className="av-control-label">Bet controls</span>
        <div className="av-row">
          <input
            className="av-input"
            type="number"
            min={limits.minBetAmount}
            max={limits.maxBetAmount}
            value={betAmount}
            disabled={bettingLocked}
            onChange={(e) => setBetAmount(Math.max(0, Number(e.target.value) || 0))}
            aria-label="Bet amount"
          />
          <input
            className="av-input"
            type="number"
            min={1.01}
            step={0.01}
            max={limits.maxAutoCashOut}
            value={autoCashOut}
            disabled={bettingLocked || !autoCashOutEnabled}
            onChange={(e) => setAutoCashOut(Math.max(1.01, Number(e.target.value) || 1.01))}
            aria-label="Auto cash out multiplier"
          />
        </div>

        <div className="av-toggle-row">
          <button
            type="button"
            className={`av-toggle ${autoCashOutEnabled ? "active" : ""}`}
            disabled={bettingLocked}
            onClick={() => setAutoCashOutEnabled((v) => !v)}
          >
            Auto cash out
          </button>
          <button
            type="button"
            className={`av-toggle ${autoBetEnabled ? "active" : ""}`}
            disabled={bettingLocked}
            onClick={() => setAutoBetEnabled((v) => !v)}
          >
            Auto bet
          </button>
        </div>

        <div className="av-action-row">
          <button type="button" className="av-btn bet" disabled={bettingLocked} onClick={handleBet}>
            {loading ? "Processing..." : `Bet · ₹${betAmount.toFixed(2)}`}
          </button>
          <button
            type="button"
            className="av-btn cashout"
            disabled={bettingLocked || !activeBet?.id || activeBet?.status !== "active"}
            onClick={handleCashOut}
          >
            {loading ? "Processing..." : "Cash out"}
          </button>
        </div>
      </section>

      <section className="av-split">
        <div className="av-card">
          <h2>
            Live players <span>({players.length})</span>
          </h2>
          {players.length === 0 ? (
            <div style={{ marginTop: "0.625rem", color: "var(--theme-text-dim)", fontSize: "0.8125rem" }}>
              Waiting for live player feed…
            </div>
          ) : (
            <div className="av-players">
              {players.slice(0, 30).map((p, idx) => (
                <div className="av-player" key={p.userId || p.id || idx}>
                  <strong>{p.username || p.userId?.slice?.(-6) || "Player"}</strong>
                  <span>
                    ₹{safeNumber(p.amount, 0).toFixed(2)}
                    {p.cashedOutAtMultiplier ? ` · ${formatMultiplier(p.cashedOutAtMultiplier)}` : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="av-card">
          <h2>
            Previous rounds <span>({recentRounds.length})</span>
          </h2>
          <table className="av-table">
            <thead>
              <tr>
                <th>Round</th>
                <th>Crash</th>
              </tr>
            </thead>
            <tbody>
              {recentRounds.length === 0 ? (
                <tr>
                  <td colSpan={2} style={{ color: "var(--theme-text-dim)", padding: "0.875rem 0.25rem" }}>
                    No rounds yet
                  </td>
                </tr>
              ) : (
                recentRounds.slice(0, HISTORY_LIMIT).map((r) => (
                  <tr key={r.roundId || r.id}>
                    <td style={{ fontFamily: "monospace", color: "var(--theme-text-muted)" }}>
                      {(r.roundId || r.id || "").slice(-6)}
                    </td>
                    <td style={{ color: "var(--theme-gold-bright)", fontWeight: 800 }}>
                      {formatMultiplier(r.crashMultiplier ?? r.crash_multiplier ?? 0)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="av-card">
          <h2>
            My history <span>({myBets.length})</span>
          </h2>
          <table className="av-table">
            <thead>
              <tr>
                <th>Bet</th>
                <th>Status</th>
                <th>Payout</th>
              </tr>
            </thead>
            <tbody>
              {myBets.length === 0 ? (
                <tr>
                  <td colSpan={3} style={{ color: "var(--theme-text-dim)", padding: "0.875rem 0.25rem" }}>
                    No bets yet
                  </td>
                </tr>
              ) : (
                myBets.slice(0, MY_BETS_LIMIT).map((b) => {
                  const status = b.status || "pending";
                  const pill =
                    status === "won" || status === "cashed_out"
                      ? "win"
                      : status === "lost"
                        ? "loss"
                        : "pending";
                  return (
                    <tr key={b.id || b._id}>
                      <td>₹{safeNumber(b.amount ?? b.betAmount, 0).toFixed(2)}</td>
                      <td>
                        <span className={`av-pill ${pill}`}>{String(status).replace(/_/g, " ")}</span>
                      </td>
                      <td>
                        {b.payout != null
                          ? `₹${safeNumber(b.payout, 0).toFixed(2)}`
                          : b.winAmount != null
                            ? `₹${safeNumber(b.winAmount, 0).toFixed(2)}`
                            : "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      <BottomNav />
    </main>
  );
}
