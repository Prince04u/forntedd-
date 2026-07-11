"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState } from "react";
import { getToken } from "@/lib/auth";
import { getSocket } from "@/lib/socket";
import { getBalance } from "@/lib/walletApi";
import {
  getCurrentPeriod,
  getRecentResults,
  placeBet,
  getMyBets,
} from "@/lib/k3Api";
import {
  DURATIONS,
  DURATION_SEC,
  getDurationMeta,
  formatTimer,
  MULTIPLIERS,
  formatBetLabel,
} from "@/lib/k3Utils";
import { usePlatformStatus } from "@/components/platform/PlatformStatusProvider";
import BrandLogo from "@/components/brand/BrandLogo";

export default function K3GameScreen() {
  const params = useParams();
  const router = useRouter();
  let duration = params.duration || "1m";
  // Normalize manually typed URLs like /k3/1min
  if (duration === "1min") duration = "1m";
  if (duration === "3min") duration = "3m";
  if (duration === "5min") duration = "5m";
  if (duration === "10min") duration = "10m";

  const durationMeta = getDurationMeta(duration);
  const { maintenanceMode, blocksAction } = usePlatformStatus();

  const [balance, setBalance] = useState(0);
  const [period, setPeriod] = useState(null);
  const [results, setResults] = useState([]);
  const [myBets, setMyBets] = useState([]);
  const [historyTab, setHistoryTab] = useState("game");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [betCategory, setBetCategory] = useState("total"); // total, size, parity, 3_same
  const [betSheet, setBetSheet] = useState(null); // { betType, betValue, multiplier }
  const [baseAmount, setBaseAmount] = useState(10);
  const [quantity, setQuantity] = useState(1);
  const [diceAnim, setDiceAnim] = useState([1, 2, 3]);
  const [isRolling, setIsRolling] = useState(false);

  const timer = formatTimer(period?.remainingSeconds ?? 0);
  const remainingSeconds = period?.remainingSeconds ?? 0;
  const showCountdownOverlay = remainingSeconds > 0 && remainingSeconds <= 5;
  const bettingLocked = showCountdownOverlay || loading || maintenanceMode || blocksAction("bet");

  const loadData = useCallback(async () => {
    if (!getToken()) return;
    try {
      const [balanceRes, periodRes, resultsRes, betsRes] = await Promise.all([
        getBalance(),
        getCurrentPeriod(duration),
        getRecentResults(duration, 50),
        getMyBets({ limit: 20, duration }),
      ]);
      setBalance(balanceRes.data.balance);
      setPeriod(periodRes.data);
      setResults(resultsRes.data || []);
      setMyBets(betsRes.data?.bets || []);
    } catch (err) {
      setError("Failed to load game");
    }
  }, [duration]);

  useEffect(() => {
    loadData();
    let activeSocket = null;
    let cancelled = false;

    getSocket().then((socket) => {
      if (!socket || cancelled) return;
      activeSocket = socket;

      socket.emit("k3:join", duration);

      const onTick = (data) => {
        setPeriod((prev) => {
          if (!prev || prev.periodId !== data.periodId) return data;
          return { ...prev, remainingSeconds: data.remainingSeconds };
        });
        if (data.remainingSeconds <= 5) setIsRolling(true);
        else setIsRolling(false);
      };

      const onResult = (data) => {
        if (data.duration === duration) {
          setResults((prev) => [data, ...prev].slice(0, 50));
          setDiceAnim(data.result.dice);
          setIsRolling(false);
          setTimeout(() => loadData(), 2000);
        }
      };

      socket.on("k3:tick", onTick);
      socket.on("k3:result", onResult);
    });

    return () => {
      cancelled = true;
      if (activeSocket) {
        activeSocket.emit("k3:leave", duration);
        activeSocket.off("k3:tick");
        activeSocket.off("k3:result");
      }
    };
  }, [duration, loadData]);

  // Handle rolling animation
  useEffect(() => {
    let interval;
    if (isRolling) {
      interval = setInterval(() => {
        setDiceAnim([
          Math.floor(Math.random() * 6) + 1,
          Math.floor(Math.random() * 6) + 1,
          Math.floor(Math.random() * 6) + 1,
        ]);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isRolling]);

  const handlePlaceBet = async () => {
    if (!betSheet || bettingLocked) return;
    setLoading(true);
    try {
      const amount = baseAmount * quantity;
      await placeBet(duration, {
        betType: betSheet.betType,
        betValue: betSheet.betValue,
        amount
      });
      setBetSheet(null);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to place bet");
    } finally {
      setLoading(false);
    }
  };

  const renderBetGrid = () => {
    if (betCategory === "total") {
      return (
        <div className="k3-bet-grid">
          {Array.from({ length: 16 }, (_, i) => i + 3).map(num => (
            <div key={num} className="k3-bet-btn" onClick={() => setBetSheet({ betType: "total", betValue: String(num), multiplier: MULTIPLIERS[`total_${num}`] })}>
              <span className="k3-bet-value">{num}</span>
              <span className="k3-bet-multiplier">{MULTIPLIERS[`total_${num}`]}x</span>
            </div>
          ))}
        </div>
      );
    }
    if (betCategory === "size") {
      return (
        <div className="k3-bet-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className="k3-bet-btn" onClick={() => setBetSheet({ betType: "size", betValue: "big", multiplier: MULTIPLIERS.size })}>
            <span className="k3-bet-value">Big</span>
            <span className="k3-bet-multiplier">{MULTIPLIERS.size}x</span>
          </div>
          <div className="k3-bet-btn" onClick={() => setBetSheet({ betType: "size", betValue: "small", multiplier: MULTIPLIERS.size })}>
            <span className="k3-bet-value">Small</span>
            <span className="k3-bet-multiplier">{MULTIPLIERS.size}x</span>
          </div>
        </div>
      );
    }
    if (betCategory === "parity") {
      return (
        <div className="k3-bet-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <div className="k3-bet-btn" onClick={() => setBetSheet({ betType: "parity", betValue: "odd", multiplier: MULTIPLIERS.parity })}>
            <span className="k3-bet-value">Odd</span>
            <span className="k3-bet-multiplier">{MULTIPLIERS.parity}x</span>
          </div>
          <div className="k3-bet-btn" onClick={() => setBetSheet({ betType: "parity", betValue: "even", multiplier: MULTIPLIERS.parity })}>
            <span className="k3-bet-value">Even</span>
            <span className="k3-bet-multiplier">{MULTIPLIERS.parity}x</span>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="k3-container">
      <div className="k3-header">
        <Link href="/" className="k3-header-back">←</Link>
        <div className="k3-header-title">K3 Lottery - {durationMeta.label}</div>
        <div>
          <BrandLogo width={80} />
        </div>
      </div>

      <div className="k3-wallet-card">
        <div style={{ fontSize: 14, color: "#888" }}>Wallet Balance</div>
        <div className="k3-wallet-balance">₹{balance.toFixed(2)}</div>
      </div>

      <div className="k3-game-area">
        <div className="k3-period-header">
          <div>
            <div style={{ fontSize: 12, color: "#888" }}>Period</div>
            <div className="k3-period-id">{period?.periodId || "Loading..."}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#888", textAlign: "right" }}>Count Down</div>
            <div className="k3-timer">
              <div className="k3-timer-box">{timer.mm[0]}</div>
              <div className="k3-timer-box">{timer.mm[1]}</div>
              <span>:</span>
              <div className="k3-timer-box">{timer.ss[0]}</div>
              <div className="k3-timer-box">{timer.ss[1]}</div>
            </div>
          </div>
        </div>

        <div className="k3-dice-container">
          {diceAnim.map((die, i) => (
            <div key={i} className="k3-die">{die}</div>
          ))}
        </div>
        
        {showCountdownOverlay && (
          <div style={{ textAlign: "center", color: "#ff4d4f", fontWeight: "bold", marginBottom: 15 }}>
            Stop Betting
          </div>
        )}

        <div className="k3-bet-tabs">
          <div className={`k3-bet-tab ${betCategory === "total" ? "active" : ""}`} onClick={() => setBetCategory("total")}>Total</div>
          <div className={`k3-bet-tab ${betCategory === "size" ? "active" : ""}`} onClick={() => setBetCategory("size")}>Size</div>
          <div className={`k3-bet-tab ${betCategory === "parity" ? "active" : ""}`} onClick={() => setBetCategory("parity")}>Parity</div>
        </div>

        {renderBetGrid()}
      </div>

      <div className="k3-history-area">
        <div className="k3-history-tabs">
          <div className={`k3-history-tab ${historyTab === "game" ? "active" : ""}`} onClick={() => setHistoryTab("game")}>Game History</div>
          <div className={`k3-history-tab ${historyTab === "my" ? "active" : ""}`} onClick={() => setHistoryTab("my")}>My History</div>
        </div>

        {historyTab === "game" ? (
          <div>
            {results.map((r, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #eee" }}>
                <span>{r.periodId}</span>
                <span style={{ fontWeight: "bold", color: "#ff4d4f" }}>{r.result?.sum} ({r.result?.size})</span>
              </div>
            ))}
          </div>
        ) : (
          <div>
            {myBets.map((b, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #eee" }}>
                <span>{b.periodId}</span>
                <span style={{ fontWeight: "bold", color: b.state === "won" ? "#4ade80" : "#f87171" }}>
                  {b.state === "won" ? `+₹${b.winAmount}` : "-₹" + b.amount}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {betSheet && (
        <div className="k3-modal-overlay">
          <div className="k3-bet-modal">
            <div className="k3-modal-header">
              <h3>{formatBetLabel(betSheet.betType, betSheet.betValue)}</h3>
              <button onClick={() => setBetSheet(null)} style={{ border: "none", background: "none", fontSize: 20 }}>✕</button>
            </div>
            <div className="k3-amount-selector">
              <span>Amount</span>
              <div style={{ display: "flex", gap: 10 }}>
                {[10, 100, 1000].map(amt => (
                  <button key={amt} onClick={() => setBaseAmount(amt)} style={{ background: baseAmount === amt ? "#ff4d4f" : "#eee", color: baseAmount === amt ? "#fff" : "#000", border: "none", padding: "5px 10px", borderRadius: 5 }}>{amt}</button>
                ))}
              </div>
            </div>
            <div className="k3-amount-selector">
              <span>Quantity</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <button className="k3-qty-btn" onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
                <input className="k3-qty-input" value={quantity} readOnly />
                <button className="k3-qty-btn" onClick={() => setQuantity(quantity + 1)}>+</button>
              </div>
            </div>
            <button className="k3-total-btn" onClick={handlePlaceBet} disabled={bettingLocked}>
              Total amount ₹{baseAmount * quantity}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
