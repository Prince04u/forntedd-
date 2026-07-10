"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import BottomNav from "@/components/home/BottomNav";
import BrandLogo from "@/components/brand/BrandLogo";
import { usePlatformStatus } from "@/components/platform/PlatformStatusProvider";
import { getToken } from "@/lib/auth";
import { getSocket } from "@/lib/socket";
import { getBalance } from "@/lib/walletApi";
import { playLimbo, getMyLimboBets } from "@/lib/limboApi";

const normalizeBet = (b) => {
  if (!b) return null;
  const details = b.details || {};
  const rolledMultiplier = details.rolledMultiplier ?? b.rolledMultiplier ?? b.result ?? 1.00;
  const targetMultiplier = details.targetMultiplier ?? b.targetMultiplier ?? b.target ?? 2.00;
  const status = b.state ?? b.status ?? (b.winAmount > 0 ? "won" : "lost");
  const amount = b.amount ?? 10;
  const winAmount = b.winAmount ?? b.payout ?? 0;
  
  return {
    id: b._id || b.id || Math.random().toString(),
    result: Number(rolledMultiplier),
    target: Number(targetMultiplier),
    status,
    amount: Number(amount),
    winAmount: Number(winAmount),
  };
};

export default function LimboGameScreen() {
  const router = useRouter();
  const { isMaintenance, isLoaded: platformLoaded } = usePlatformStatus();
  
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState(10);
  const [targetMultiplier, setTargetMultiplier] = useState(2.0);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [displayState, setDisplayState] = useState("idle"); // idle, playing, won, lost
  const [history, setHistory] = useState([]);
  
  const [error, setError] = useState(null);
  const animRef = useRef(null);

  // Initialize
  useEffect(() => {
    if (platformLoaded && isMaintenance) {
      router.replace("/");
      return;
    }

    const init = async () => {
      const token = getToken();
      if (!token) {
        router.replace("/login");
        return;
      }
      fetchBalance();
      fetchHistory();
    };
    init();

    // Setup Socket
    let socketInstance = null;
    const setupSocket = async () => {
      socketInstance = await getSocket();
      if (socketInstance) {
        socketInstance.on("wallet:balance", (data) => {
          if (data.balance !== undefined) setBalance(data.balance);
        });
      }
    };
    setupSocket();

    return () => {
      if (socketInstance) socketInstance.off("wallet:balance");
    };
  }, [platformLoaded, isMaintenance, router]);

  const fetchBalance = async () => {
    const res = await getBalance();
    if (res?.success) setBalance(res.data.balance || 0);
  };

  const fetchHistory = async () => {
    const res = await getMyLimboBets();
    if (res?.success && res.data) {
      setHistory(res.data.map(normalizeBet));
    }
  };

  const handleBetChange = (e) => {
    let val = e.target.value.replace(/[^0-9.]/g, "");
    setBetAmount(val);
  };
  
  const handleTargetChange = (e) => {
    let val = e.target.value.replace(/[^0-9.]/g, "");
    setTargetMultiplier(val);
  };

  const placeBet = async () => {
    if (isPlaying) return;
    const amount = Number(betAmount);
    const target = Number(targetMultiplier);

    if (isNaN(amount) || amount < 10) {
      setError("Minimum bet is ₹10");
      return;
    }
    if (isNaN(target) || target < 1.01) {
      setError("Minimum target is 1.01x");
      return;
    }
    if (balance < amount) {
      setError("Insufficient balance");
      return;
    }

    setError(null);
    setIsPlaying(true);
    setDisplayState("playing");
    setCurrentMultiplier(1.0);
    setBalance(prev => prev - amount); // Optimistic UI update

    const res = await playLimbo({ amount, targetMultiplier: target });
    if (!res?.success) {
      setError(res?.message || "Bet failed");
      setIsPlaying(false);
      setDisplayState("idle");
      fetchBalance(); // rollback
      return;
    }

    const { result, status, winAmount } = res.data;
    
    // Animate to result
    let startTimestamp = null;
    const duration = 1200; // ms
    
    const animateMultiplier = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = timestamp - startTimestamp;
      
      if (progress < duration) {
        // Ease out exponential or quad
        const ease = 1 - Math.pow(1 - progress / duration, 3);
        const current = 1.0 + (result - 1.0) * ease;
        setCurrentMultiplier(current);
        animRef.current = requestAnimationFrame(animateMultiplier);
      } else {
        setCurrentMultiplier(result);
        setDisplayState(status);
        setIsPlaying(false);
        setHistory(prev => [normalizeBet(res.data), ...prev].slice(0, 30));
      }
    };
    animRef.current = requestAnimationFrame(animateMultiplier);
  };

  // Cleanup animation
  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <Link href="/" style={styles.backButton}>
            ← Back
          </Link>
          <BrandLogo width={32} height={32} style={{ marginLeft: 10 }} />
          <span style={styles.headerTitle}>Limbo</span>
        </div>
        <div style={styles.headerRight}>
          <div style={styles.walletBox}>
            <span style={styles.walletLabel}>Balance</span>
            <span style={styles.walletAmount}>₹{balance.toFixed(2)}</span>
          </div>
        </div>
      </header>

      <div style={styles.content}>
        {/* History Bar */}
        <div style={styles.historyBar}>
          {history.map((bet) => {
            const isWin = bet.status === "won" || bet.result >= 2.0;
            return (
              <div 
                key={bet.id} 
                style={{
                  ...styles.historyPill,
                  borderColor: isWin ? "#22c55e" : "rgba(212,175,55,0.25)",
                  background: isWin ? "rgba(34, 197, 94, 0.15)" : "#1B1B1B",
                  color: isWin ? "#4ade80" : "#D4AF37",
                }}
              >
                {bet.result.toFixed(2)}x
              </div>
            );
          })}
        </div>

        {/* Main Game Canvas */}
        <div style={styles.gameArea}>
          <div style={styles.spaceBackground}>
            <div className="stars"></div>
          </div>
          
          <div style={styles.multiplierContainer}>
            <div 
              style={{
                ...styles.multiplierText,
                color: displayState === "won" ? "#4ade80" : displayState === "lost" ? "#f87171" : "#fff",
              }}
            >
              {currentMultiplier.toFixed(2)}x
            </div>
            {displayState === "won" && (
              <div style={styles.winText}>You Won!</div>
            )}
          </div>

          <div style={styles.rocketContainer(displayState)}>
            {/* Simple CSS Rocket */}
            <div style={styles.rocketBody}>
              <div style={styles.rocketWindow}></div>
              <div style={styles.rocketFinLeft}></div>
              <div style={styles.rocketFinRight}></div>
              {(displayState === "playing" || displayState === "idle") && (
                <div style={styles.flame}></div>
              )}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={styles.controlsArea}>
          {error && <div style={styles.errorText}>{error}</div>}
          
          <div style={styles.inputsRow}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Bet Amount</label>
              <div style={styles.inputWrapper}>
                <button 
                  style={styles.adjustBtn} 
                  onClick={() => setBetAmount(p => Math.max(10, Number(p)/2))}
                  disabled={isPlaying}
                >½</button>
                <input
                  type="text"
                  value={betAmount}
                  onChange={handleBetChange}
                  style={styles.input}
                  disabled={isPlaying}
                />
                <button 
                  style={styles.adjustBtn} 
                  onClick={() => setBetAmount(p => Number(p)*2)}
                  disabled={isPlaying}
                >2x</button>
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>Target Multiplier</label>
              <div style={styles.inputWrapper}>
                <input
                  type="text"
                  value={targetMultiplier}
                  onChange={handleTargetChange}
                  style={styles.input}
                  disabled={isPlaying}
                />
              </div>
            </div>
          </div>

          <button 
            style={{
              ...styles.betButton,
              opacity: isPlaying ? 0.7 : 1,
              background: isPlaying ? "#1B1B1B" : "#22c55e",
              color: isPlaying ? "#fff" : "#000",
            }}
            onClick={placeBet}
            disabled={isPlaying}
          >
            {isPlaying ? "PLAYING..." : "BET"}
          </button>
        </div>
      </div>

      <BottomNav />

      {/* Embedded Styles for Rocket Animation & Stars */}
      <style dangerouslySetInnerHTML={{__html: `
        .stars {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: transparent;
          background-image: 
            radial-gradient(1px 1px at 20px 30px, #fff, rgba(0,0,0,0)),
            radial-gradient(1px 1px at 40px 70px, #fff, rgba(0,0,0,0)),
            radial-gradient(1px 1px at 50px 160px, #fff, rgba(0,0,0,0)),
            radial-gradient(1px 1px at 90px 40px, #fff, rgba(0,0,0,0)),
            radial-gradient(1px 1px at 130px 80px, #fff, rgba(0,0,0,0)),
            radial-gradient(1px 1px at 160px 120px, #fff, rgba(0,0,0,0));
          background-repeat: repeat;
          background-size: 200px 200px;
          animation: moveStars 40s linear infinite;
          opacity: 0.5;
        }
        @keyframes moveStars {
          from { transform: translateY(0); }
          to { transform: translateY(200px); }
        }
        @keyframes flicker {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1) translateY(2px); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px); }
          75% { transform: translateX(2px); }
        }
      `}} />
    </div>
  );
}

const styles = {
  container: {
    background: "#080808",
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    color: "#fff",
    fontFamily: "sans-serif",
    paddingBottom: 70,
  },
  header: {
    height: 60,
    background: "rgba(20,20,20,0.9)",
    backdropFilter: "blur(10px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 15px",
    borderBottom: "1px solid rgba(212,175,55,0.25)",
    position: "sticky",
    top: 0,
    zIndex: 50,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  backButton: {
    color: "#D4AF37",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: "bold",
  },
  headerTitle: {
    fontSize: "16px",
    fontWeight: "600",
    color: "#fff",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
  },
  walletBox: {
    background: "#1B1B1B",
    padding: "4px 10px",
    borderRadius: 8,
    border: "1px solid rgba(212,175,55,0.25)",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-end",
  },
  walletLabel: {
    fontSize: "10px",
    color: "#aaa",
  },
  walletAmount: {
    fontSize: "13px",
    fontWeight: "bold",
    color: "#D4AF37",
  },
  content: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    padding: "15px",
    gap: "15px",
  },
  historyBar: {
    display: "flex",
    gap: "8px",
    overflowX: "auto",
    padding: "5px 0",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
  },
  historyPill: {
    padding: "4px 12px",
    borderRadius: "15px",
    fontSize: "12px",
    fontWeight: "bold",
    whiteSpace: "nowrap",
    border: "1px solid",
    boxShadow: "0 0 10px rgba(212,175,55,0.15)",
  },
  gameArea: {
    flex: 1,
    background: "#141414",
    borderRadius: "12px",
    border: "1px solid rgba(212,175,55,0.25)",
    boxShadow: "inset 0 0 40px rgba(0,0,0,0.8)",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "350px",
  },
  spaceBackground: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    background: "linear-gradient(180deg, #0a0e17 0%, #111a28 100%)",
    zIndex: 0,
  },
  multiplierContainer: {
    position: "absolute",
    top: "30%",
    zIndex: 10,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  multiplierText: {
    fontSize: "64px",
    fontWeight: "900",
    textShadow: "0 4px 20px rgba(0,0,0,0.5)",
    transition: "color 0.3s",
  },
  winText: {
    fontSize: "18px",
    color: "#4ade80",
    fontWeight: "bold",
    marginTop: "5px",
    textShadow: "0 2px 10px rgba(34,197,94,0.5)",
  },
  rocketContainer: (state) => ({
    position: "absolute",
    bottom: "20%",
    zIndex: 5,
    animation: state === "playing" ? "shake 0.5s linear infinite" : "none",
    opacity: state === "lost" ? 0 : 1,
    transition: "opacity 0.3s",
  }),
  rocketBody: {
    width: "40px",
    height: "80px",
    background: "linear-gradient(to bottom, #f87171, #ef4444, #fff 40%)",
    borderRadius: "50% 50% 20% 20%",
    position: "relative",
    boxShadow: "inset -5px 0 10px rgba(0,0,0,0.2)",
  },
  rocketWindow: {
    position: "absolute",
    top: "30px",
    left: "10px",
    width: "20px",
    height: "20px",
    background: "#1e3a8a",
    borderRadius: "50%",
    border: "3px solid #cbd5e1",
  },
  rocketFinLeft: {
    position: "absolute",
    bottom: "10px",
    left: "-15px",
    width: "20px",
    height: "30px",
    background: "#ef4444",
    clipPath: "polygon(100% 0, 100% 100%, 0 100%)",
  },
  rocketFinRight: {
    position: "absolute",
    bottom: "10px",
    right: "-15px",
    width: "20px",
    height: "30px",
    background: "#dc2626",
    clipPath: "polygon(0 0, 0 100%, 100% 100%)",
  },
  flame: {
    position: "absolute",
    bottom: "-25px",
    left: "10px",
    width: "20px",
    height: "30px",
    background: "linear-gradient(to bottom, #fbbf24, #f97316, transparent)",
    borderRadius: "50% 50% 20% 20%",
    animation: "flicker 0.1s infinite alternate",
  },
  controlsArea: {
    background: "#1B1B1B",
    borderRadius: "12px",
    padding: "15px",
    border: "1px solid rgba(212,175,55,0.25)",
  },
  errorText: {
    color: "#f87171",
    fontSize: "12px",
    textAlign: "center",
    marginBottom: "10px",
  },
  inputsRow: {
    display: "flex",
    gap: "10px",
    marginBottom: "15px",
  },
  inputGroup: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  label: {
    fontSize: "12px",
    color: "#aaa",
  },
  inputWrapper: {
    display: "flex",
    background: "#080808",
    borderRadius: "8px",
    border: "1px solid rgba(212,175,55,0.25)",
    overflow: "hidden",
  },
  input: {
    flex: 1,
    background: "transparent",
    border: "none",
    color: "#fff",
    textAlign: "center",
    fontSize: "16px",
    fontWeight: "bold",
    outline: "none",
    width: "100%",
    padding: "10px 0",
  },
  adjustBtn: {
    background: "#141414",
    border: "none",
    color: "#D4AF37",
    padding: "0 12px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
    transition: "background 0.2s",
  },
  betButton: {
    width: "100%",
    padding: "16px",
    borderRadius: "8px",
    border: "none",
    fontSize: "18px",
    fontWeight: "900",
    cursor: "pointer",
    textTransform: "uppercase",
    transition: "all 0.2s",
    boxShadow: "0 4px 15px rgba(34,197,94,0.3)",
  }
};
