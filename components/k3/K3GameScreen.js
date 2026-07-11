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
  const [betSheet, setBetSheet] = useState(null); // Used to track selected bet
  const [baseAmount, setBaseAmount] = useState(10);
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
      await placeBet(duration, {
        betType: betSheet.betType,
        betValue: betSheet.betValue,
        amount: baseAmount
      });
      setBetSheet(null);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to place bet");
    } finally {
      setLoading(false);
    }
  };

  const isSelected = (bType, bVal) => {
    return betSheet?.betType === bType && betSheet?.betValue === bVal;
  };

  const selectBet = (bType, bVal, mult) => {
    if (isSelected(bType, bVal)) {
      setBetSheet(null);
    } else {
      setBetSheet({ betType: bType, betValue: bVal, multiplier: mult });
    }
  };

  const renderDiceValue = (val) => {
    // Render dots based on dice value
    const getDots = (v) => {
      switch (v) {
        case 1: return [4];
        case 2: return [0, 8];
        case 3: return [0, 4, 8];
        case 4: return [0, 2, 6, 8];
        case 5: return [0, 2, 4, 6, 8];
        case 6: return [0, 2, 3, 5, 6, 8];
        default: return [];
      }
    };
    const dots = getDots(val);
    return Array.from({ length: 9 }).map((_, i) => (
      <div key={i} className={dots.includes(i) ? "k3-dot" : ""}></div>
    ));
  };

  const renderMiniDice = (val) => {
    const getDots = (v) => {
      switch (v) {
        case 1: return [4];
        case 2: return [0, 8];
        case 3: return [0, 4, 8];
        case 4: return [0, 2, 6, 8];
        case 5: return [0, 2, 4, 6, 8];
        case 6: return [0, 2, 3, 5, 6, 8];
        default: return [];
      }
    };
    const dots = getDots(val);
    return Array.from({ length: 9 }).map((_, i) => (
      <div key={i} className={dots.includes(i) ? "k3-mini-dot" : ""}></div>
    ));
  };

  const renderBetGrid = () => {
    if (betCategory === "total") {
      return (
        <div className="k3-chip-grid">
          {Array.from({ length: 16 }, (_, i) => i + 3).map(num => {
            let theme = "theme-red";
            if (num % 2 === 0) theme = "theme-green";
            const active = isSelected("total", String(num)) ? "selected" : "";
            return (
              <div key={num} className={`k3-chip-btn ${theme} ${active}`} onClick={() => selectBet("total", String(num), MULTIPLIERS[`total_${num}`])}>
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
            <div key={num} className={`k3-chip-btn theme-red ${isSelected("2_same_specific", String(num)) ? "selected" : ""}`} onClick={() => selectBet("2_same_specific", String(num), MULTIPLIERS["2_same_specific"])}>
              <span className="k3-chip-val" style={{ fontSize: "20px" }}>{num}*</span>
              <span className="k3-chip-mult">{MULTIPLIERS["2_same_specific"]}x</span>
            </div>
          ))}
        </div>
      );
    }
    if (betCategory === "3_same") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div className={`k3-action-btn big ${isSelected("3_same_any", "any") ? "selected" : ""}`} onClick={() => selectBet("3_same_any", "any", MULTIPLIERS["3_same_any"])}>
            <span className="k3-chip-val" style={{ color: "#F5C542", fontSize: "16px" }}>Any 3 Same</span>
            <span className="k3-chip-mult">{MULTIPLIERS["3_same_any"]}x</span>
          </div>
          <div className="k3-chip-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
            {[111, 222, 333, 444, 555, 666].map(num => (
              <div key={num} className={`k3-chip-btn theme-red ${isSelected("3_same_specific", String(num)) ? "selected" : ""}`} onClick={() => selectBet("3_same_specific", String(num), MULTIPLIERS["3_same_specific"])}>
                <span className="k3-chip-val" style={{ fontSize: "18px" }}>{num}</span>
                <span className="k3-chip-mult">{MULTIPLIERS["3_same_specific"]}x</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    if (betCategory === "different") {
      return (
        <div className={`k3-action-btn big ${isSelected("3_seq_any", "seq") ? "selected" : ""}`} onClick={() => selectBet("3_seq_any", "seq", MULTIPLIERS["3_seq_any"])}>
          <span className="k3-chip-val" style={{ color: "#F5C542", fontSize: "16px" }}>3 Sequential (e.g. 123)</span>
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
          <BrandLogo width={32} />
          <div className="k3-header-title">K3 Lottery</div>
        </div>
        <div className="k3-header-right">
          <div className="k3-header-btn">
            History
          </div>
          <div className="k3-header-btn">
            ₹{balance.toFixed(2)}
          </div>
          <div className="k3-header-icon">
            ≡
          </div>
        </div>
      </div>

      {/* 2. Wallet Card */}
      <div className="k3-wallet-wrapper">
        <div className="k3-wallet-card">
          <div className="k3-wallet-left">
            <div className="k3-wallet-label">
              Wallet Balance 
              <span onClick={loadData} style={{ cursor: "pointer", color: "#F5C542", fontSize: "16px" }}>↻</span>
            </div>
            <div className="k3-wallet-balance">₹{balance.toFixed(2)}</div>
          </div>
          <div className="k3-wallet-right">
            <button className="k3-btn-action k3-btn-withdraw">Withdraw</button>
            <button className="k3-btn-action k3-btn-deposit">Deposit</button>
          </div>
        </div>
      </div>

      {/* 3. Game Tabs */}
      <div className="k3-game-tabs">
        {DURATIONS.map((d) => (
          <Link key={d.id} href={`/k3/${d.id}`} style={{ textDecoration: "none", flex: 1 }}>
            <div className={`k3-game-tab ${duration === d.id ? "active" : ""}`}>
              <span>{d.icon}</span> {d.label}
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
            <span className="k3-period-value">
              {period?.periodId || "Loading..."}
            </span>
            <div style={{ fontSize: "11px", color: "#F5C542", marginTop: "4px", border: "1px solid rgba(245, 197, 66, 0.4)", borderRadius: "4px", padding: "4px 8px", display: "inline-block", width: "max-content" }}>
              How to play &gt;
            </div>
          </div>
          <div className="k3-timer-col">
            <div className="k3-timer-ring"></div>
            <div className="k3-timer-display">
              <span className="k3-timer-label">Time Remaining</span>
              <div className="k3-timer-boxes">
                <div className="k3-time-box">{timer.mm[0]}{timer.mm[1]}</div>
                <span className="k3-time-sep">:</span>
                <div className="k3-time-box">{timer.ss[0]}{timer.ss[1]}</div>
              </div>
              <div className="k3-timer-boxes" style={{ marginTop: "2px" }}>
                <span className="k3-time-unit" style={{ width: "42px" }}>Min</span>
                <span className="k3-time-sep" style={{ opacity: 0 }}>:</span>
                <span className="k3-time-unit" style={{ width: "42px" }}>Sec</span>
              </div>
            </div>
          </div>
        </div>

        {/* Premium Dice Arena */}
        <div className="k3-dice-stage">
          {diceAnim.map((die, i) => (
            <div key={i} className="k3-die-wrapper">
              <div className={`k3-die-3d ${isRolling ? "rolling" : ""}`}>
                <div className="k3-die-value">
                  {renderDiceValue(die)}
                </div>
              </div>
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

        {/* Bottom Bet Buttons (Small, Big, Even, Odd) */}
        <div className="k3-bottom-actions">
          <div className={`k3-action-btn small ${isSelected("size", "small") ? "selected" : ""}`} onClick={() => selectBet("size", "small", MULTIPLIERS.size)}>
            <span className="k3-chip-val">SMALL</span>
            <span className="k3-chip-mult">{MULTIPLIERS.size}x</span>
          </div>
          <div className={`k3-action-btn big ${isSelected("size", "big") ? "selected" : ""}`} onClick={() => selectBet("size", "big", MULTIPLIERS.size)}>
            <span className="k3-chip-val">BIG</span>
            <span className="k3-chip-mult">{MULTIPLIERS.size}x</span>
          </div>
          <div className={`k3-action-btn even ${isSelected("parity", "even") ? "selected" : ""}`} onClick={() => selectBet("parity", "even", MULTIPLIERS.parity)}>
            <span className="k3-chip-val">EVEN</span>
            <span className="k3-chip-mult">{MULTIPLIERS.parity}x</span>
          </div>
          <div className={`k3-action-btn odd ${isSelected("parity", "odd") ? "selected" : ""}`} onClick={() => selectBet("parity", "odd", MULTIPLIERS.parity)}>
            <span className="k3-chip-val">ODD</span>
            <span className="k3-chip-mult">{MULTIPLIERS.parity}x</span>
          </div>
        </div>

        {/* Inline Bet Controls */}
        <div className="k3-bet-controls">
          <div className="k3-bet-input-group">
            <button className="k3-bet-ctrl-btn" onClick={() => setBaseAmount(Math.max(10, baseAmount - 10))}>-</button>
            <input className="k3-bet-input" value={baseAmount.toFixed(2)} readOnly />
            <button className="k3-bet-ctrl-btn" onClick={() => setBaseAmount(baseAmount + 10)}>+</button>
          </div>
          <div className="k3-quick-mults">
            <button className="k3-quick-btn" onClick={() => setBaseAmount(10)}>x1</button>
            <button className="k3-quick-btn" onClick={() => setBaseAmount(50)}>x5</button>
            <button className="k3-quick-btn" onClick={() => setBaseAmount(100)}>x10</button>
            <button className="k3-quick-btn" onClick={() => setBaseAmount(200)}>x20</button>
            <button className="k3-quick-btn" style={{ color: "#F5C542" }} onClick={() => setBaseAmount(1000)}>MAX</button>
          </div>
          <button className="k3-confirm-bet" onClick={handlePlaceBet} disabled={!betSheet || bettingLocked}>
            CONFIRM BET
          </button>
        </div>
      </div>

      {/* 9 & 10. History Section */}
      <div className="k3-history-area">
        <div className="k3-history-tabs">
          <div className={`k3-history-tab ${historyTab === "game" ? "active" : ""}`} onClick={() => setHistoryTab("game")}>GAME HISTORY</div>
          <div className={`k3-history-tab ${historyTab === "my" ? "active" : ""}`} onClick={() => setHistoryTab("my")}>MY HISTORY</div>
        </div>

        <div className="k3-table-wrapper">
          {historyTab === "game" ? (
            <table className="k3-table">
              <thead>
                <tr>
                  <th>PERIOD</th>
                  <th>RESULT</th>
                  <th>TOTAL</th>
                  <th>SIZE/PARITY</th>
                </tr>
              </thead>
              <tbody>
                {results.map((r, i) => {
                  const sum = r.result?.dice?.reduce((a, b) => a + b, 0) || 0;
                  return (
                    <tr key={i}>
                      <td style={{ color: "#F5C542" }}>{r.periodId}</td>
                      <td>
                        <div className="k3-table-dice">
                          {r.result?.dice?.map((d, j) => (
                            <div key={j} className="k3-mini-die">
                              {renderMiniDice(d)}
                            </div>
                          ))}
                        </div>
                      </td>
                      <td style={{ color: "#F5C542", fontWeight: 900 }}>{sum}</td>
                      <td>
                        <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                          <span className={`k3-badge ${r.result?.size}`}>{r.result?.size === "big" ? "Big" : "Small"}</span>
                          <span className={`k3-badge ${r.result?.parity}`}>{r.result?.parity === "odd" ? "Odd" : "Even"}</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <table className="k3-table">
              <thead>
                <tr>
                  <th>PERIOD</th>
                  <th>BET</th>
                  <th>AMOUNT</th>
                  <th>MULTIPLIER</th>
                  <th>PROFIT</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {myBets.map((b, i) => (
                  <tr key={i}>
                    <td style={{ color: "#F5C542" }}>{b.periodId}</td>
                    <td>{formatBetLabel(b.details.betType, b.details.betValue)}</td>
                    <td>₹{b.amount.toFixed(2)}</td>
                    <td style={{ color: "#BDBDBD" }}>{b.winAmount > 0 ? (b.winAmount/b.amount).toFixed(2) : "-"}x</td>
                    <td className={b.state === "won" ? "k3-profit-win" : (b.state === "lost" ? "k3-profit-lose" : "")}>
                      {b.state === "won" ? `+₹${b.winAmount.toFixed(2)}` : (b.state === "lost" ? `-₹${b.amount.toFixed(2)}` : "0")}
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
    </div>
  );
}
