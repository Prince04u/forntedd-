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
  
  const [betCategory, setBetCategory] = useState("total");
  const [betSheet, setBetSheet] = useState(null);
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
        <div className="k3-chip-grid">
          {Array.from({ length: 16 }, (_, i) => i + 3).map(num => {
            let theme = "theme-gold";
            if (num === 3 || num === 18) theme = "theme-red";
            else if (num === 4 || num === 17) theme = "theme-green";
            return (
              <div key={num} className={`k3-chip-btn ${theme}`} onClick={() => setBetSheet({ betType: "total", betValue: String(num), multiplier: MULTIPLIERS[`total_${num}`] })}>
                <span className="k3-chip-val">{num}</span>
                <span className="k3-chip-mult">{MULTIPLIERS[`total_${num}`]}x</span>
              </div>
            );
          })}
        </div>
      );
    }
    if (betCategory === "2_same") {
      return (
        <div className="k3-chip-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {[11, 22, 33, 44, 55, 66].map(num => (
            <div key={num} className="k3-chip-btn theme-gold" onClick={() => setBetSheet({ betType: "2_same_specific", betValue: String(num), multiplier: MULTIPLIERS["2_same_specific"] })}>
              <span className="k3-chip-val" style={{ fontSize: "16px" }}>{num}*</span>
              <span className="k3-chip-mult">{MULTIPLIERS["2_same_specific"]}x</span>
            </div>
          ))}
        </div>
      );
    }
    if (betCategory === "3_same") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div className="k3-action-btn" style={{ borderColor: "rgba(245, 197, 66, 0.4)", background: "linear-gradient(145deg, rgba(245, 197, 66, 0.1), #111)" }} onClick={() => setBetSheet({ betType: "3_same_any", betValue: "any", multiplier: MULTIPLIERS["3_same_any"] })}>
            <span className="k3-chip-val" style={{ color: "#F5C542" }}>Any 3 Same</span>
            <span className="k3-chip-mult">{MULTIPLIERS["3_same_any"]}x</span>
          </div>
          <div className="k3-chip-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {[111, 222, 333, 444, 555, 666].map(num => (
              <div key={num} className="k3-chip-btn theme-red" onClick={() => setBetSheet({ betType: "3_same_specific", betValue: String(num), multiplier: MULTIPLIERS["3_same_specific"] })}>
                <span className="k3-chip-val" style={{ fontSize: "16px" }}>{num}</span>
                <span className="k3-chip-mult">{MULTIPLIERS["3_same_specific"]}x</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    if (betCategory === "different") {
      return (
        <div className="k3-action-btn" style={{ borderColor: "rgba(245, 197, 66, 0.4)", background: "linear-gradient(145deg, rgba(245, 197, 66, 0.1), #111)" }} onClick={() => setBetSheet({ betType: "3_seq_any", betValue: "seq", multiplier: MULTIPLIERS["3_seq_any"] })}>
          <span className="k3-chip-val" style={{ color: "#F5C542" }}>3 Sequential (e.g. 123)</span>
          <span className="k3-chip-mult">{MULTIPLIERS["3_seq_any"]}x</span>
        </div>
      );
    }
  };

  return (
    <div className="k3-container">
      {/* 1. Header */}
      <div className="k3-header">
        <div className="k3-header-left">
          <Link href="/" className="k3-back-btn">←</Link>
          <div className="k3-header-title">K3 Lottery</div>
        </div>
        <div className="k3-header-center">
          {durationMeta.label}
        </div>
        <div className="k3-header-right">
          <button className="k3-icon-btn">💵</button>
          <button className="k3-icon-btn">📜</button>
          <button className="k3-icon-btn">≡</button>
        </div>
      </div>

      {/* 2. Wallet Card */}
      <div className="k3-wallet-wrapper">
        <div className="k3-wallet-card">
          <div className="k3-wallet-label">Wallet Balance</div>
          <div className="k3-wallet-balance-row">
            <div className="k3-wallet-balance">₹{balance.toFixed(2)}</div>
            <div className="k3-wallet-refresh" onClick={loadData}>↻</div>
          </div>
          <div className="k3-wallet-actions">
            <button className="k3-btn k3-btn-secondary">Withdraw</button>
            <button className="k3-btn k3-btn-primary">Deposit</button>
          </div>
        </div>
      </div>

      {/* 3. Game Tabs */}
      <div className="k3-game-tabs">
        {DURATIONS.map((d) => (
          <Link key={d.id} href={`/k3/${d.id}`} style={{ textDecoration: "none", flex: "0 0 auto" }}>
            <div className={`k3-game-tab ${duration === d.id ? "active" : ""}`}>
              {d.label}
            </div>
          </Link>
        ))}
      </div>

      {/* 4 & 5 & 6 & 7 & 8. Main Game Area Wrapper */}
      <div className="k3-game-arena">
        {showCountdownOverlay && (
          <div className="k3-locked-overlay">
            <div className="k3-locked-text">Stop Betting</div>
          </div>
        )}
        
        {/* Period & Countdown */}
        <div className="k3-period-header">
          <div className="k3-period-col">
            <span className="k3-period-label">Period</span>
            <span className="k3-period-value">{period?.periodId || "Loading..."}</span>
          </div>
          <div className="k3-period-col" style={{ alignItems: "flex-end" }}>
            <span className="k3-period-label">Count Down</span>
            <div className="k3-timer-display">
              <div className="k3-time-box">{timer.mm[0]}</div>
              <div className="k3-time-box">{timer.mm[1]}</div>
              <span className="k3-time-sep">:</span>
              <div className="k3-time-box">{timer.ss[0]}</div>
              <div className="k3-time-box">{timer.ss[1]}</div>
            </div>
          </div>
        </div>

        {/* Premium Dice Arena */}
        <div className="k3-dice-stage">
          {diceAnim.map((die, i) => (
            <div key={i} className="k3-die-wrapper">
              <div className={`k3-die-3d ${isRolling ? "rolling" : ""}`}>
                <div className="k3-die-value">{die}</div>
              </div>
              <div className="k3-die-shadow"></div>
            </div>
          ))}
        </div>
        
        {/* Betting Tabs (Segmented Controls) */}
        <div className="k3-segments">
          <div className={`k3-segment ${betCategory === "total" ? "active" : ""}`} onClick={() => setBetCategory("total")}>TOTAL</div>
          <div className={`k3-segment ${betCategory === "2_same" ? "active" : ""}`} onClick={() => setBetCategory("2_same")}>2 SAME</div>
          <div className={`k3-segment ${betCategory === "3_same" ? "active" : ""}`} onClick={() => setBetCategory("3_same")}>3 SAME</div>
          <div className={`k3-segment ${betCategory === "different" ? "active" : ""}`} onClick={() => setBetCategory("different")}>DIFFERENT</div>
        </div>

        {/* Compact Betting Chips */}
        {renderBetGrid()}

        {/* Bottom Bet Buttons (Big, Small, Odd, Even) */}
        <div className="k3-bottom-actions">
          <div className="k3-action-btn big" onClick={() => setBetSheet({ betType: "size", betValue: "big", multiplier: MULTIPLIERS.size })}>
            <span className="k3-chip-val" style={{ fontSize: "16px" }}>BIG</span>
            <span className="k3-chip-mult">{MULTIPLIERS.size}x</span>
          </div>
          <div className="k3-action-btn small" onClick={() => setBetSheet({ betType: "size", betValue: "small", multiplier: MULTIPLIERS.size })}>
            <span className="k3-chip-val" style={{ fontSize: "16px" }}>SMALL</span>
            <span className="k3-chip-mult">{MULTIPLIERS.size}x</span>
          </div>
          <div className="k3-action-btn odd" onClick={() => setBetSheet({ betType: "parity", betValue: "odd", multiplier: MULTIPLIERS.parity })}>
            <span className="k3-chip-val" style={{ fontSize: "16px" }}>ODD</span>
            <span className="k3-chip-mult">{MULTIPLIERS.parity}x</span>
          </div>
          <div className="k3-action-btn even" onClick={() => setBetSheet({ betType: "parity", betValue: "even", multiplier: MULTIPLIERS.parity })}>
            <span className="k3-chip-val" style={{ fontSize: "16px" }}>EVEN</span>
            <span className="k3-chip-mult">{MULTIPLIERS.parity}x</span>
          </div>
        </div>
      </div>

      {/* 9 & 10. History Section */}
      <div className="k3-history-area">
        <div className="k3-history-tabs">
          <div className={`k3-history-tab ${historyTab === "game" ? "active" : ""}`} onClick={() => setHistoryTab("game")}>Game History</div>
          <div className={`k3-history-tab ${historyTab === "my" ? "active" : ""}`} onClick={() => setHistoryTab("my")}>My History</div>
        </div>

        <div className="k3-table-wrapper">
          {historyTab === "game" ? (
            <table className="k3-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Dice Result</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => (
                  <tr key={i}>
                    <td style={{ color: "#F5C542" }}>{r.periodId.slice(-4)}</td>
                    <td>
                      <div className="k3-table-dice">
                        {r.result?.dice?.map((d, j) => <div key={j} className="k3-mini-die">{d}</div>)}
                      </div>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                        <span className={`k3-badge ${r.result?.size}`}>{r.result?.size === "big" ? "Big" : "Small"}</span>
                        <span className={`k3-badge ${r.result?.parity}`}>{r.result?.parity === "odd" ? "Odd" : "Even"}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="k3-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Bet</th>
                  <th>Amount</th>
                  <th>Profit</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {myBets.map((b, i) => (
                  <tr key={i}>
                    <td style={{ color: "#F5C542" }}>{b.periodId.slice(-4)}</td>
                    <td>{formatBetLabel(b.details.betType, b.details.betValue)}</td>
                    <td>₹{b.amount}</td>
                    <td className={b.state === "won" ? "k3-status-win" : (b.state === "lost" ? "k3-status-lose" : "")}>
                      {b.state === "won" ? `+₹${b.winAmount}` : (b.state === "lost" ? `-₹${b.amount}` : "0")}
                    </td>
                    <td>
                      <span className={`k3-badge ${b.state === "won" ? "win" : (b.state === "lost" ? "lose" : "pending")}`}>
                        {b.state.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Bet Modal (Premium Amount Selector) */}
      {betSheet && (
        <div className="k3-modal-overlay">
          <div className="k3-bet-modal">
            <div className="k3-modal-header">
              <div className="k3-modal-title">Place Bet</div>
              <div className="k3-modal-close" onClick={() => setBetSheet(null)}>✕</div>
            </div>

            <div className="k3-modal-selected">
              <div style={{ fontSize: "14px", color: "#B7B7B7", textTransform: "uppercase", letterSpacing: "1px" }}>Selected</div>
              <div style={{ fontSize: "28px", fontWeight: 900, color: "#FFFFFF", margin: "4px 0" }}>{formatBetLabel(betSheet.betType, betSheet.betValue)}</div>
              <div style={{ fontSize: "13px", color: "#F5C542", fontWeight: 700 }}>Multiplier: {betSheet.multiplier}x</div>
            </div>

            <div className="k3-modal-row" style={{ marginBottom: "12px" }}>
              <span className="k3-modal-label">Base Amount</span>
            </div>
            
            <div className="k3-multipliers-row">
              {[1, 10, 50, 100, 500, 1000].map(amt => (
                <button key={amt} className={`k3-mult-btn ${baseAmount === amt ? "active" : ""}`} onClick={() => setBaseAmount(amt)}>₹{amt}</button>
              ))}
            </div>

            <div className="k3-modal-row">
              <span className="k3-modal-label">Quantity</span>
              <div className="k3-qty-control">
                <button className="k3-qty-btn" onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
                <input className="k3-qty-input" value={quantity} readOnly />
                <button className="k3-qty-btn" onClick={() => setQuantity(quantity + 1)}>+</button>
              </div>
            </div>

            <button className="k3-confirm-btn" onClick={handlePlaceBet} disabled={bettingLocked}>
              Total Bet: ₹{baseAmount * quantity}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
