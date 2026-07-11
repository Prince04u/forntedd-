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
    return null;
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
          {diceAnim.map((die, i) => (
            <div key={i} className="k3-die-wrapper">
              <div className={`k3-die-3d ${isRolling ? "rolling" : ""}`}>
                <div className="k3-die-value">
                  {renderDiceValue(die)}
                </div>
              </div>
            </div>
          ))}
          <div className="k3-dice-arrow right"></div>
        </div>
      </div>
      
      {/* Betting Category Segments */}
      <div className="k3-segments">
        <div className={`k3-segment ${betCategory === "total" ? "active" : ""}`} onClick={() => setBetCategory("total")}>Total</div>
        <div className={`k3-segment ${betCategory === "2_same" ? "active" : ""}`} onClick={() => setCategoryMock()}>2 same</div>
        <div className={`k3-segment ${betCategory === "3_same" ? "active" : ""}`} onClick={() => setCategoryMock()}>3 same</div>
        <div className={`k3-segment ${betCategory === "different" ? "active" : ""}`} onClick={() => setCategoryMock()}>Different</div>
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

    </div>
  );

  function setCategoryMock() {
    alert("This tab is not fully implemented in this mockup layout yet.");
  }
}
