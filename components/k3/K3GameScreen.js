"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import React, { useCallback, useEffect, useState, useRef } from "react";
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

  const { maintenanceMode, blocksAction } = usePlatformStatus();

  const [balance, setBalance] = useState(0);
  const [period, setPeriod] = useState(null);
  const [results, setResults] = useState([]);
  const [myBets, setMyBets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [historyTab, setHistoryTab] = useState("game");
  
  const [betCategory, setBetCategory] = useState("total");
  const [betSheet, setBetSheet] = useState(null); 
  const [baseAmount, setBaseAmount] = useState(10);
  const [diceAnim, setDiceAnim] = useState([5, 4, 5]); // Matches screenshot
  const [isRolling, setIsRolling] = useState(false);

  const timer = formatTimer(period?.remainingSeconds ?? 0);
  const remainingSeconds = period?.remainingSeconds ?? 0;
  const showCountdownOverlay = remainingSeconds > 0 && remainingSeconds <= 5;
  const bettingLocked = showCountdownOverlay || loading || maintenanceMode || blocksAction("bet");

  const loadDataRef = useRef();

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

  loadDataRef.current = loadData;

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
          // Avoid jumping by only syncing if there's a > 2 second drift
          if (Math.abs(prev.remainingSeconds - data.remainingSeconds) > 2) {
            return { ...prev, remainingSeconds: data.remainingSeconds };
          }
          return prev;
        });
        if (data.remainingSeconds <= 5) setIsRolling(true);
        else setIsRolling(false);
      };

      const onResult = (data) => {
        if (data.duration === duration) {
          setResults((prev) => [data, ...prev].slice(0, 50));
          setDiceAnim(data.result.dice);
          setIsRolling(false);
          setTimeout(() => loadDataRef.current && loadDataRef.current(), 2000);
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

  // Local ticker to ensure smooth countdown without spamming the API
  useEffect(() => {
    const localTick = setInterval(() => {
      setPeriod((prev) => {
        if (prev && prev.remainingSeconds > 0) {
          return { ...prev, remainingSeconds: prev.remainingSeconds - 1 };
        } else if (prev && prev.remainingSeconds === 0) {
          // Trigger reload but set to -1 to avoid duplicate calls before new data arrives
          setTimeout(() => loadDataRef.current && loadDataRef.current(), 0);
          return { ...prev, remainingSeconds: -1 };
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(localTick);
  }, []);

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

  const renderBetGrid = () => {
    if (betCategory === "total") {
      const numbers = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
      return (
        <div className="k3-chip-grid">
          {numbers.map(num => {
            // Replicating exactly red vs green as shown in the mockup
            // Red: 3, 5, 7, 9, 11, 13, 15, 17
            // Green: 4, 6, 8, 10, 12, 14, 16, 18
            const theme = (num % 2 !== 0) ? "theme-red" : "theme-green";
            const active = isSelected("total", String(num)) ? "selected" : "";
            const multDisplay = (MULTIPLIERS[`total_${num}`] === 207) ? "207.36X" : (MULTIPLIERS[`total_${num}`] === 60 ? "69.12X" : `${MULTIPLIERS[`total_${num}`]}X`);

            return (
              <div key={num} className={`k3-chip-wrapper ${active}`} onClick={() => selectBet("total", String(num), MULTIPLIERS[`total_${num}`])}>
                <div className={`k3-chip-btn ${theme}`}>
                  <div className="k3-chip-inner">
                    <span className="k3-chip-val">{num}</span>
                  </div>
                </div>
                <span className="k3-chip-mult">{multDisplay}</span>
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
            <div key={num} className={`k3-chip-wrapper ${isSelected("2_same_specific", String(num)) ? "selected" : ""}`} onClick={() => selectBet("2_same_specific", String(num), MULTIPLIERS["2_same_specific"])}>
              <div className="k3-chip-btn theme-red">
                <div className="k3-chip-inner"><span className="k3-chip-val" style={{fontSize: "14px"}}>{num}*</span></div>
              </div>
              <span className="k3-chip-mult">{MULTIPLIERS["2_same_specific"]}X</span>
            </div>
          ))}
        </div>
      );
    }
    if (betCategory === "3_same") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", padding: "0 16px" }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div className={`k3-chip-wrapper ${isSelected("3_same_any", "any") ? "selected" : ""}`} onClick={() => selectBet("3_same_any", "any", MULTIPLIERS["3_same_any"])}>
              <div className="k3-chip-btn theme-green" style={{ width: "auto", padding: "0 16px", borderRadius: "32px" }}>
                <div className="k3-chip-inner" style={{ width: "auto", padding: "0 12px", borderRadius: "20px" }}>
                  <span className="k3-chip-val" style={{fontSize: "14px"}}>Any 3 Same</span>
                </div>
              </div>
              <span className="k3-chip-mult">{MULTIPLIERS["3_same_any"]}X</span>
            </div>
          </div>
          <div className="k3-chip-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)", padding: "0" }}>
            {[111, 222, 333, 444, 555, 666].map(num => (
              <div key={num} className={`k3-chip-wrapper ${isSelected("3_same_specific", String(num)) ? "selected" : ""}`} onClick={() => selectBet("3_same_specific", String(num), MULTIPLIERS["3_same_specific"])}>
                <div className="k3-chip-btn theme-red">
                  <div className="k3-chip-inner"><span className="k3-chip-val" style={{fontSize: "14px"}}>{num}</span></div>
                </div>
                <span className="k3-chip-mult">{MULTIPLIERS["3_same_specific"]}X</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    if (betCategory === "different") {
      return (
        <div style={{ display: "flex", justifyContent: "center", padding: "0 16px" }}>
          <div className={`k3-chip-wrapper ${isSelected("3_seq_any", "seq") ? "selected" : ""}`} onClick={() => selectBet("3_seq_any", "seq", MULTIPLIERS["3_seq_any"])}>
            <div className="k3-chip-btn theme-red" style={{ width: "auto", padding: "0 16px", borderRadius: "32px" }}>
              <div className="k3-chip-inner" style={{ width: "auto", padding: "0 12px", borderRadius: "20px" }}>
                <span className="k3-chip-val" style={{fontSize: "14px"}}>3 Sequential</span>
              </div>
            </div>
            <span className="k3-chip-mult">{MULTIPLIERS["3_seq_any"]}X</span>
          </div>
        </div>
      );
    }
    return null;
  };

  const getFaces = (topVal) => {
    switch (topVal) {
      case 1: return { top: 1, front: 2, right: 3 };
      case 2: return { top: 2, front: 6, right: 3 };
      case 3: return { top: 3, front: 1, right: 2 };
      case 4: return { top: 4, front: 5, right: 1 };
      case 5: return { top: 5, front: 4, right: 1 };
      case 6: return { top: 6, front: 2, right: 4 };
      default: return { top: 5, front: 4, right: 1 };
    }
  };

  return (
    <div className="k3-container">
      {/* HEADER */}
      <div className="k3-header">
        <Link href="/" className="k3-back-btn">{'<'}</Link>
        <div className="k3-header-logo">
          <BrandLogo width={40} />
          <span style={{ marginLeft: "8px", color: "#e8c97b", fontSize: "18px", letterSpacing: "1px", fontFamily: "serif" }}>LUCKY NOVA</span>
        </div>
      </div>

      {/* WALLET CARD */}
      <div className="k3-wallet-wrapper">
        <div className="k3-wallet-card">
          <div className="k3-wallet-left">
            <div className="k3-wallet-label">WALLET BALANCE</div>
            <div className="k3-wallet-balance">₹{balance.toFixed(2)}</div>
          </div>
          <div className="k3-wallet-right">
            <button className="k3-btn-action k3-btn-withdraw">Withdraw</button>
            <button className="k3-btn-action k3-btn-deposit">Deposit</button>
          </div>
        </div>
      </div>

      {/* GAME TABS */}
      <div className="k3-game-tabs">
        {DURATIONS.map((d) => (
          <Link key={d.id} href={`/k3/${d.id}`} style={{ textDecoration: "none", flex: 1 }}>
            <div className={`k3-game-tab ${duration === d.id ? "active" : ""}`}>
              <div className="k3-tab-icon">🕒</div>
              <span>{d.label}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* GAME ARENA */}
      <div className="k3-game-arena">
        {showCountdownOverlay && (
          <div className="k3-locked-overlay">
            <div className="k3-locked-text">Stop Betting</div>
          </div>
        )}
        
        {/* Period & Timer Row */}
        <div className="k3-period-header">
          <div className="k3-period-col">
            <div className="k3-period-label-row">
              <span className="k3-period-label">Period</span>
              <div className="k3-how-to-play">
                <span style={{ fontSize: "8px" }}>📖</span> How to play
              </div>
            </div>
            <span className="k3-period-value">
              {period?.periodId || "Loading..."}
            </span>
          </div>
          <div className="k3-timer-col">
            <span className="k3-timer-label">TIME REMAINING</span>
            <div className="k3-timer-boxes">
              <div className="k3-time-box">{timer.mm[0]}</div>
              <div className="k3-time-box">{timer.mm[1]}</div>
              <span className="k3-time-sep">:</span>
              <div className="k3-time-box">{timer.ss[0]}</div>
              <div className="k3-time-box">{timer.ss[1]}</div>
            </div>
          </div>
        </div>

        {/* Dice Stage */}
        <div className="k3-dice-stage">
          <div className="k3-dice-arrow left"></div>
          {diceAnim.map((die, i) => {
            const faces = getFaces(die);
            return (
              <div key={i} className="k3-die-wrapper">
                <div className={`k3-die-iso ${isRolling ? "rolling" : ""}`}>
                  <div className="k3-die-face k3-die-face-front">{renderDiceValue(faces.front)}</div>
                  <div className="k3-die-face k3-die-face-back"></div>
                  <div className="k3-die-face k3-die-face-right">{renderDiceValue(faces.right)}</div>
                  <div className="k3-die-face k3-die-face-left"></div>
                  <div className="k3-die-face k3-die-face-top">{renderDiceValue(faces.top)}</div>
                  <div className="k3-die-face k3-die-face-bottom"></div>
                </div>
              </div>
            );
          })}
          <div className="k3-dice-arrow right"></div>
        </div>
      </div>
      
      {/* Betting Category Segments */}
      <div className="k3-segments">
        <div className={`k3-segment ${betCategory === "total" ? "active" : ""}`} onClick={() => setBetCategory("total")}>Total</div>
        <div className={`k3-segment ${betCategory === "2_same" ? "active" : ""}`} onClick={() => setBetCategory("2_same")}>2 same</div>
        <div className={`k3-segment ${betCategory === "3_same" ? "active" : ""}`} onClick={() => setBetCategory("3_same")}>3 same</div>
        <div className={`k3-segment ${betCategory === "different" ? "active" : ""}`} onClick={() => setBetCategory("different")}>Different</div>
      </div>

      {/* Number Grid */}
      {renderBetGrid()}

      {/* Bet Controls Inline */}
      <div className="k3-bet-controls">
        <div className="k3-bet-input-group">
          <button className="k3-bet-ctrl-btn" onClick={() => setBaseAmount(Math.max(10, baseAmount - 10))}>-</button>
          <input className="k3-bet-input" value={baseAmount} readOnly />
          <button className="k3-bet-ctrl-btn" onClick={() => setBaseAmount(baseAmount + 10)}>+</button>
        </div>
        <div className="k3-quick-mults">
          <button className="k3-quick-btn" onClick={() => setBaseAmount(10)}>x1</button>
          <button className="k3-quick-btn" onClick={() => setBaseAmount(50)}>x5</button>
          <button className="k3-quick-btn" onClick={() => setBaseAmount(100)}>x10</button>
        </div>
        <button className="k3-confirm-bet" onClick={handlePlaceBet} disabled={!betSheet || bettingLocked}>
          BET
        </button>
      </div>

      {/* HISTORY SECTION */}
      <div className="k3-history-section">
        <div className="k3-history-tabs">
          <button className={`k3-hist-tab ${historyTab === "game" ? "active" : ""}`} onClick={() => setHistoryTab("game")}>Game history</button>
          <button className={`k3-hist-tab ${historyTab === "chart" ? "active" : ""}`} onClick={() => setHistoryTab("chart")}>Chart</button>
          <button className={`k3-hist-tab ${historyTab === "my" ? "active" : ""}`} onClick={() => setHistoryTab("my")}>My history</button>
        </div>

        {historyTab === "game" && (
          <div className="k3-history-table">
            <div className="k3-history-th">
              <div className="k3-th-col">Period</div>
              <div className="k3-th-col">Sum</div>
              <div className="k3-th-col">Results</div>
            </div>
            <div className="k3-history-body">
              {results.length === 0 && <div style={{padding: "20px", textAlign: "center", color: "#888"}}>No data available</div>}
              {results.map((res, i) => {
                const sum = res.result.dice.reduce((a, b) => a + b, 0);
                const size = sum >= 11 ? "Big" : "Small";
                const parity = sum % 2 === 0 ? "Even" : "Odd";
                return (
                  <div key={i} className="k3-history-tr">
                    <div className="k3-td-col" style={{ fontSize: "12px" }}>{res.periodId}</div>
                    <div className="k3-td-col k3-td-sum">
                      <span className="k3-sum-val">{sum}</span>
                      <span className="k3-sum-size">{size}</span>
                      <span className="k3-sum-parity">{parity}</span>
                    </div>
                    <div className="k3-td-col k3-td-dice">
                      {res.result.dice.map((d, di) => {
                        const dots = getFaces(d).top; 
                        return (
                          <div key={di} className="k3-mini-die">
                            {renderDiceValue(dots)}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {historyTab === "chart" && (
          <div className="k3-history-table">
             <div style={{padding: "20px", textAlign: "center", color: "#888", fontSize: "14px"}}>
                Chart view is under development.
             </div>
          </div>
        )}

        {historyTab === "my" && (
          <div className="k3-history-table">
            <div className="k3-history-th">
              <div className="k3-th-col" style={{flex: 1.5}}>Period</div>
              <div className="k3-th-col">Detail</div>
              <div className="k3-th-col">Result</div>
            </div>
            <div className="k3-history-body">
              {myBets.length === 0 && <div style={{padding: "20px", textAlign: "center", color: "#888"}}>No bets yet</div>}
              {myBets.map((bet, i) => {
                const isWon = bet.status === "won";
                const color = isWon ? "#00c97b" : bet.status === "lost" ? "#ff4d4d" : "#F5C542";
                const sign = isWon ? "+" : "-";
                return (
                  <div key={i} className="k3-history-tr">
                    <div className="k3-td-col" style={{ fontSize: "12px", flex: 1.5, textAlign: "left" }}>
                      {bet.periodId}<br/>
                      <span style={{color: "#888", fontSize: "10px"}}>₹{bet.amount}</span>
                    </div>
                    <div className="k3-td-col" style={{fontSize: "12px"}}>
                       {formatBetLabel(bet.details.betType, bet.details.betValue)}
                    </div>
                    <div className="k3-td-col" style={{color, fontWeight: 600}}>
                       {bet.status === "pending" ? "Pending" : `${sign}₹${(bet.winAmount || bet.amount).toFixed(2)}`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
