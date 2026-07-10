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
import { playLimbo, cashOutLimbo, getMyLimboBets } from "@/lib/limboApi";

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
    createdAt: b.createdAt || new Date().toISOString(),
  };
};

export default function LimboGameScreen() {
  const router = useRouter();
  const { isMaintenance, isLoaded: platformLoaded } = usePlatformStatus();
  
  const [balance, setBalance] = useState(0);
  const [betAmount, setBetAmount] = useState(10);
  const [targetMultiplier, setTargetMultiplier] = useState(2.0);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeBetId, setActiveBetId] = useState(null);
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [displayState, setDisplayState] = useState("idle"); // idle, playing, won, crashed
  const [crashPoint, setCrashPoint] = useState(null);
  
  const [history, setHistory] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [error, setError] = useState(null);
  const [winPopupAmount, setWinPopupAmount] = useState(null);
  
  const animRef = useRef(null);
  const startTimeRef = useRef(null);
  const playingRef = useRef(false);
  const targetMultiplierRef = useRef(2.0);
  const resultRef = useRef({ result: 1.0, status: "lost", payout: 0 });

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

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
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
    playingRef.current = true;
    setDisplayState("playing");
    setCurrentMultiplier(1.0);
    setCrashPoint(null);
    setBalance(prev => prev - amount); // Optimistic

    // Set a placeholder result while we wait for the network
    resultRef.current = { result: null, status: "pending", payout: 0 };
    targetMultiplierRef.current = target;
    
    // Start local animation loop INSTANTLY
    let localCurrent = 1.0;
    let hasRebased = false;
    let animStartTime = Date.now();
    let animStartValue = 1.0;
    const durationMs = 1500;
    
    const animateMultiplier = () => {
      if (!playingRef.current) return;
      
      // When network returns, rebase the animation to target the final result smoothly
      if (!hasRebased && resultRef.current.result !== null) {
          hasRebased = true;
          animStartValue = localCurrent;
          animStartTime = Date.now();
      }
      
      const elapsed = Date.now() - animStartTime;
      const progress = Math.min(elapsed / durationMs, 1.0);
      
      // Easing out curve
      const easeOut = 1 - Math.pow(1 - progress, 3);
      
      const targetResult = hasRebased ? resultRef.current.result : 1.01;
      localCurrent = animStartValue + (targetResult - animStartValue) * easeOut;
      
      setCurrentMultiplier(localCurrent);

      if (progress < 1.0) {
        animRef.current = requestAnimationFrame(animateMultiplier);
      } else {
        // Animation duration finished
        if (!hasRebased) {
          // If network is extremely slow, reset timer to keep waiting smoothly
          animStartValue = localCurrent;
          animStartTime = Date.now();
          animRef.current = requestAnimationFrame(animateMultiplier);
        } else {
          finishGame();
        }
      }
    };
    animRef.current = requestAnimationFrame(animateMultiplier);

    // Now make the network request asynchronously without blocking the UI
    try {
      const res = await playLimbo({ amount, targetMultiplier: target });

      if (!res?.success) {
        setError(res?.message || "Bet failed");
        setIsPlaying(false);
        playingRef.current = false;
        setDisplayState("idle");
        fetchBalance();
        return;
      }

      // Store the exact result
      const finalResult = res.data.result !== undefined ? res.data.result : 1.0;
      resultRef.current = {
        result: finalResult,
        status: res.data.status || "lost",
        payout: res.data.winAmount || 0
      };
      
      // Show win popup and update balance instantly when network returns
      if (resultRef.current.status === "won") {
        setWinPopupAmount(resultRef.current.payout);
        setBalance(prev => prev + resultRef.current.payout);
        setTimeout(() => setWinPopupAmount(null), 3000);
      }
    } catch (err) {
      setError("Network error");
      setIsPlaying(false);
      playingRef.current = false;
      setDisplayState("idle");
      fetchBalance();
    }
  };

  const finishGame = () => {
    setIsPlaying(false);
    playingRef.current = false;
    
    const { result, status, payout } = resultRef.current;
    setCurrentMultiplier(result || 1.0);
    setCrashPoint(result || 1.0);
    
    if (status === "won") {
      setDisplayState("won");
    } else {
      setDisplayState("crashed");
    }
    
    fetchBalance();
    fetchHistory();
  };

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
          <button 
            style={styles.historyBtn} 
            onClick={() => setShowHistoryModal(true)}
          >
            History
          </button>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {winPopupAmount !== null && (
              <div style={styles.winPopup}>
                +{winPopupAmount.toFixed(2)} INR
              </div>
            )}
            <div style={styles.walletBox}>
              <span style={styles.walletLabel}>Balance</span>
              <span style={styles.walletAmount}>₹{(balance || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </header>

      <div style={styles.content}>
        {/* Recent History Bar */}
        <div style={styles.historyBar}>
          {history.slice(0, 15).map((bet) => {
            const isWin = bet.status === "won";
            return (
              <div 
                key={bet.id} 
                style={{
                  ...styles.historyPill,
                  borderColor: isWin ? "#22c55e" : "rgba(239, 68, 68, 0.4)",
                  background: isWin ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.1)",
                  color: isWin ? "#4ade80" : "#f87171",
                }}
              >
                {(bet.result || 1.0).toFixed(2)}x
              </div>
            );
          })}
        </div>

        {/* Main Game Canvas */}
        <div style={styles.gameArea}>
          <div style={styles.spaceBackground(displayState)}>
            <div className="stars"></div>
            <div className="stars stars2"></div>
            <div style={styles.planet1}></div>
            <div style={styles.planet2}></div>
          </div>
          
          <div style={styles.multiplierContainer}>
            <div 
              style={{
                ...styles.multiplierText,
                color: (displayState === "playing" || displayState === "won") ? "#4ade80" : displayState === "crashed" ? "#f87171" : "#fff",
              }}
            >
              {(currentMultiplier || 1.0).toFixed(2)}x
            </div>
          </div>

          <div style={styles.rocketContainer(displayState)}>
            {displayState === "crashed" ? (
              // Exploded state
              <div style={styles.planeExplosion}>💥</div>
            ) : (
              // 3D CSS Rocket matching the screenshot
              <div style={styles.rocketBody}>
                <div style={styles.rocketNose}></div>
                <div style={styles.rocketWindowContainer}>
                  <div style={styles.windowReflection}></div>
                </div>
                <div style={styles.rocketStripe}></div>
                <div style={styles.rocketFinLeft}></div>
                <div style={styles.rocketFinRight}></div>
                <div style={styles.rocketEngine}></div>
                {(displayState === "playing") && (
                  <div style={styles.flameCore}></div>
                )}
              </div>
            )}
          </div>

          {/* Moon Surface at the bottom */}
          <div style={styles.moonSurface(displayState)}>
            <div style={styles.crater1}></div>
            <div style={styles.crater2}></div>
            <div style={styles.crater3}></div>
          </div>
        </div>

        {/* Controls */}
        <div style={styles.controlsArea}>
          {error && <div style={styles.errorText}>{error}</div>}
          
          <div style={styles.targetWrapper}>
            <button 
              style={styles.adjustBtn} 
              onClick={() => setTargetMultiplier(Math.max(1.01, Number(targetMultiplier) - 0.1).toFixed(2))}
              disabled={isPlaying}
            >-</button>
            <input 
              type="number" 
              style={styles.targetInput} 
              value={targetMultiplier} 
              onChange={handleTargetChange} 
              disabled={isPlaying}
            />
            <button 
              style={styles.adjustBtn} 
              onClick={() => setTargetMultiplier((Number(targetMultiplier) + 0.1).toFixed(2))}
              disabled={isPlaying}
            >+</button>
          </div>

          <div style={styles.bottomControls}>
            <div style={styles.betWrapper}>
              <div style={styles.betLabelBox}>
                <span style={{fontSize: 12, color: "#888"}}>Bet</span>
                <span style={{fontWeight: "bold", fontSize: 14}}>{(Number(betAmount) || 0).toFixed(2)} INR</span>
              </div>
              <button style={styles.adjustBtn} onClick={() => setBetAmount(Math.max(10, Number(betAmount) - 10))} disabled={isPlaying}>-</button>
              <button style={styles.adjustBtn} onClick={() => setBetAmount(Number(betAmount) * 2)} disabled={isPlaying}>💰</button>
              <button style={styles.adjustBtn} onClick={() => setBetAmount(Number(betAmount) + 10)} disabled={isPlaying}>+</button>
            </div>
            
            <button style={styles.autoBtn} disabled={isPlaying}>
              <span style={{fontSize: 18}}>↻</span>
            </button>

            <button 
              style={{
                ...styles.playBtn,
                opacity: isPlaying ? 0.5 : 1,
                cursor: isPlaying ? "not-allowed" : "pointer"
              }}
              onClick={placeBet}
              disabled={isPlaying}
            >
              <span style={{fontSize: 20}}>▶</span> BET
            </button>
          </div>
        </div>
      </div>

      <BottomNav />

      {/* History Modal */}
      {showHistoryModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3>My Limbo History</h3>
              <button style={styles.closeBtn} onClick={() => setShowHistoryModal(false)}>✕</button>
            </div>
            <div style={styles.historyList}>
              {history.length === 0 ? (
                <div style={{textAlign: "center", padding: 20, color: "#aaa"}}>No bets found</div>
              ) : (
                history.map(bet => (
                  <div key={bet.id} style={styles.historyRow}>
                    <div style={styles.historyCol}>
                      <span style={{fontSize: 12, color: "#888"}}>Amount</span>
                      <span style={{fontWeight: "bold"}}>₹{bet.amount}</span>
                    </div>
                    <div style={styles.historyCol}>
                      <span style={{fontSize: 12, color: "#888"}}>Crash/Cashout</span>
                      <span style={{fontWeight: "bold", color: bet.status === "won" ? "#4ade80" : "#f87171"}}>
                        {(bet.result || 1.0).toFixed(2)}x
                      </span>
                    </div>
                    <div style={{...styles.historyCol, alignItems: "flex-end"}}>
                      <span style={{fontSize: 12, color: "#888"}}>Payout</span>
                      <span style={{fontWeight: "bold", color: bet.status === "won" ? "#4ade80" : "#888"}}>
                        {bet.status === "won" ? `₹${bet.winAmount.toFixed(2)}` : "₹0.00"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .stars {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: transparent;
          background-image: 
            radial-gradient(2px 2px at 20px 30px, #fff, rgba(0,0,0,0)),
            radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.8), rgba(0,0,0,0)),
            radial-gradient(2px 2px at 50px 160px, rgba(255,255,255,0.9), rgba(0,0,0,0)),
            radial-gradient(2px 2px at 90px 40px, #fff, rgba(0,0,0,0)),
            radial-gradient(2px 2px at 130px 80px, rgba(255,255,255,0.7), rgba(0,0,0,0)),
            radial-gradient(2px 2px at 160px 120px, rgba(255,255,255,0.8), rgba(0,0,0,0));
          background-repeat: repeat;
          background-size: 200px 200px;
          animation: moveStars 15s linear infinite;
        }
        .stars2 {
          background-image: 
            radial-gradient(1px 1px at 30px 50px, #fff, rgba(0,0,0,0)),
            radial-gradient(1px 1px at 70px 90px, rgba(255,255,255,0.6), rgba(0,0,0,0)),
            radial-gradient(1px 1px at 110px 20px, rgba(255,255,255,0.8), rgba(0,0,0,0));
          background-size: 150px 150px;
          animation: moveStars 25s linear infinite;
        }
        @keyframes moveStars {
          from { transform: translateY(0); }
          to { transform: translateY(200px); }
        }
        @keyframes rocketShake {
          0%, 100% { transform: translate(-50%, 0); }
          25% { transform: translate(-52%, 2px); }
          50% { transform: translate(-48%, -2px); }
          75% { transform: translate(-50%, 3px); }
        }
        @keyframes rocketLaunch {
          0% { transform: translate(-50%, 0) scale(1); opacity: 1; }
          10% { transform: translate(-50%, -20px) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -300px) scale(0.5); opacity: 0; }
        }
        @keyframes rocketCrash {
          0% { transform: translate(-50%, 0) scale(1); opacity: 1; }
          100% { transform: translate(-50%, 0) scale(1.5); opacity: 0; filter: blur(10px); }
        }
        @keyframes flameFlicker {
          0%, 100% { transform: translateX(-50%) scale(1); opacity: 1; }
          50% { transform: translateX(-50%) scale(1.1) translateY(5px); opacity: 0.8; }
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
    gap: 10,
  },
  historyBtn: {
    background: "transparent",
    border: "1px solid rgba(255,255,255,0.3)",
    color: "#fff",
    padding: "6px 12px",
    borderRadius: "15px",
    fontSize: "12px",
    cursor: "pointer",
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
    padding: "0",
    position: "relative",
  },
  historyBar: {
    display: "flex",
    gap: "8px",
    overflowX: "auto",
    padding: "10px 15px",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    background: "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)",
  },
  historyPill: {
    padding: "4px 12px",
    borderRadius: "15px",
    fontSize: "12px",
    fontWeight: "bold",
    whiteSpace: "nowrap",
    border: "1px solid",
    boxShadow: "0 0 10px rgba(0,0,0,0.5)",
  },
  gameArea: {
    flex: 1,
    background: "#141414",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  spaceBackground: (state) => ({
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    background: state === "crashed" ? "linear-gradient(180deg, #3f0000 0%, #1a0000 100%)" : "linear-gradient(180deg, #0d1b2a 0%, #1b263b 50%, #104257 100%)",
    zIndex: 0,
    transition: "background 0.5s ease",
  }),
  planet1: {
    position: "absolute",
    top: "20%", left: "15%",
    width: "40px", height: "40px",
    borderRadius: "50%",
    background: "radial-gradient(circle at 30% 30%, #5d6d7e, #2c3e50)",
    boxShadow: "inset -5px -5px 15px rgba(0,0,0,0.5)",
    opacity: 0.8,
  },
  planet2: {
    position: "absolute",
    top: "15%", right: "20%",
    width: "25px", height: "25px",
    borderRadius: "50%",
    background: "radial-gradient(circle at 30% 30%, #e67e22, #d35400)",
    boxShadow: "inset -3px -3px 10px rgba(0,0,0,0.5)",
    opacity: 0.6,
  },
  multiplierContainer: {
    position: "absolute",
    top: "25%",
    zIndex: 10,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  multiplierText: {
    fontSize: "64px",
    fontWeight: "900",
    textShadow: "0 4px 20px rgba(0,0,0,0.8)",
    transition: "color 0.3s",
  },
  winText: {
    fontSize: "20px",
    color: "#4ade80",
    fontWeight: "bold",
    marginTop: "5px",
    textShadow: "0 2px 10px rgba(34,197,94,0.5)",
  },
  crashText: {
    fontSize: "20px",
    color: "#f87171",
    fontWeight: "bold",
    marginTop: "5px",
    textShadow: "0 2px 10px rgba(248,113,113,0.5)",
  },
  rocketContainer: (state) => ({
    position: "absolute",
    bottom: "20%",
    left: "50%",
    transform: "translateX(-50%)",
    zIndex: 5,
    animation: state === "playing" ? "rocketShake 0.3s ease-in-out infinite" : state === "crashed" ? "rocketCrash 0.5s forwards" : state === "won" ? "rocketLaunch 1s forwards" : "none",
  }),
  planeExplosion: {
    fontSize: "80px",
    filter: "drop-shadow(0 0 30px red)",
    transform: "translate(-50%, -50%)",
  },
  rocketBody: {
    width: "70px",
    height: "110px",
    background: "linear-gradient(to right, #475569 0%, #cbd5e1 30%, #e2e8f0 50%, #94a3b8 80%, #334155 100%)",
    borderRadius: "50% 50% 10% 10%",
    position: "relative",
    boxShadow: "inset 0 -10px 15px rgba(0,0,0,0.3)",
    zIndex: 2,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  rocketNose: {
    width: "70px",
    height: "40px",
    background: "linear-gradient(to right, #7f1d1d 0%, #ef4444 30%, #f87171 50%, #dc2626 80%, #450a0a 100%)",
    borderRadius: "50% 50% 0 0",
    borderBottom: "4px solid #1e293b",
    boxShadow: "inset 0 -3px 5px rgba(0,0,0,0.3)",
  },
  rocketWindowContainer: {
    marginTop: "12px",
    width: "34px",
    height: "34px",
    background: "radial-gradient(circle at 30% 30%, #bae6fd 0%, #0ea5e9 50%, #0369a1 100%)",
    borderRadius: "50%",
    border: "5px solid #334155",
    boxShadow: "inset 0 0 8px rgba(0,0,0,0.8), 0 3px 5px rgba(0,0,0,0.3)",
    position: "relative",
  },
  windowReflection: {
    position: "absolute",
    top: "3px",
    left: "3px",
    width: "10px",
    height: "14px",
    background: "rgba(255,255,255,0.6)",
    borderRadius: "50%",
    transform: "rotate(40deg)",
    filter: "blur(0.5px)",
  },
  rocketStripe: {
    marginTop: "10px",
    width: "70px",
    height: "6px",
    background: "#1e293b",
    boxShadow: "0 2px 3px rgba(0,0,0,0.2)",
  },
  rocketFinLeft: {
    position: "absolute",
    bottom: "-10px",
    left: "-24px",
    width: "30px",
    height: "60px",
    background: "linear-gradient(to bottom right, #ef4444 0%, #b91c1c 50%, #450a0a 100%)",
    borderTopLeftRadius: "100%",
    borderBottomLeftRadius: "20%",
    borderBottomRightRadius: "20%",
    zIndex: -1,
    boxShadow: "inset 3px 3px 5px rgba(255,255,255,0.2), -3px 5px 10px rgba(0,0,0,0.4)",
  },
  rocketFinRight: {
    position: "absolute",
    bottom: "-10px",
    right: "-24px",
    width: "30px",
    height: "60px",
    background: "linear-gradient(to bottom left, #ef4444 0%, #b91c1c 50%, #450a0a 100%)",
    borderTopRightRadius: "100%",
    borderBottomRightRadius: "20%",
    borderBottomLeftRadius: "20%",
    zIndex: -1,
    boxShadow: "inset -3px 3px 5px rgba(255,255,255,0.2), 3px 5px 10px rgba(0,0,0,0.4)",
  },
  rocketEngine: {
    position: "absolute",
    bottom: "-12px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "34px",
    height: "12px",
    background: "linear-gradient(to right, #0f172a 0%, #475569 50%, #0f172a 100%)",
    borderBottomLeftRadius: "6px",
    borderBottomRightRadius: "6px",
    zIndex: 1,
    boxShadow: "inset 0 3px 5px rgba(0,0,0,0.5)",
  },
  flameCore: {
    position: "absolute",
    bottom: "-48px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "24px",
    height: "40px",
    background: "radial-gradient(ellipse at top, #fef08a 0%, #f59e0b 60%, transparent 100%)",
    borderRadius: "50%",
    filter: "blur(1px)",
    animation: "flameFlicker 0.1s infinite alternate",
    zIndex: 0,
    boxShadow: "0 5px 25px 15px rgba(245, 158, 11, 0.6)",
  },
  moonSurface: (state) => ({
    position: "absolute",
    bottom: "-15%",
    left: "-10%",
    width: "120%",
    height: "35%",
    background: "radial-gradient(ellipse at top, #475569 0%, #1e293b 60%, #0f172a 100%)",
    borderRadius: "50% 50% 0 0",
    boxShadow: "inset 0 15px 30px rgba(203, 213, 225, 0.15), 0 -10px 40px rgba(14, 165, 233, 0.15)",
    zIndex: 1,
    transform: state === "playing" ? "translateY(100%)" : "translateY(0)",
    transition: "transform 2.5s cubic-bezier(0.4, 0, 0.2, 1)",
  }),
  crater1: {
    position: "absolute",
    top: "25%", left: "25%",
    width: "50px", height: "18px",
    background: "rgba(15,23,42,0.4)",
    borderRadius: "50%",
    boxShadow: "inset 0 3px 6px rgba(0,0,0,0.6), 0 2px 2px rgba(255,255,255,0.1)",
  },
  crater2: {
    position: "absolute",
    top: "45%", right: "25%",
    width: "70px", height: "25px",
    background: "rgba(15,23,42,0.4)",
    borderRadius: "50%",
    boxShadow: "inset 0 3px 8px rgba(0,0,0,0.6), 0 2px 2px rgba(255,255,255,0.1)",
  },
  crater3: {
    position: "absolute",
    top: "35%", left: "55%",
    width: "35px", height: "12px",
    background: "rgba(15,23,42,0.4)",
    borderRadius: "50%",
    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.6), 0 1px 1px rgba(255,255,255,0.1)",
  },
  controlsArea: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    background: "transparent",
    padding: "10px",
    zIndex: 20,
    display: "flex",
    flexDirection: "column",
  },
  errorText: {
    color: "#f87171",
    fontSize: "12px",
    textAlign: "center",
    marginBottom: "5px",
    textShadow: "0 1px 2px rgba(0,0,0,0.8)",
  },
  targetWrapper: {
    display: "flex",
    background: "rgba(15, 30, 80, 0.8)",
    borderRadius: "20px",
    width: "160px",
    margin: "0 auto -10px auto",
    overflow: "hidden",
    border: "1px solid rgba(59,130,246,0.5)",
    zIndex: 2,
    boxShadow: "0 4px 10px rgba(0,0,0,0.5)",
  },
  targetInput: {
    flex: 1,
    background: "transparent",
    border: "none",
    color: "#fff",
    textAlign: "center",
    fontSize: "16px",
    fontWeight: "bold",
    outline: "none",
    width: "100%",
  },
  bottomControls: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
  },
  betWrapper: {
    flex: 1,
    display: "flex",
    background: "rgba(15, 30, 80, 0.8)",
    borderRadius: "20px",
    overflow: "hidden",
    border: "1px solid rgba(59,130,246,0.5)",
    backdropFilter: "blur(5px)",
  },
  betLabelBox: {
    padding: "5px 15px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    background: "rgba(30,58,138,0.8)",
    flex: 1,
  },
  autoBtn: {
    background: "#2563eb",
    border: "none",
    color: "#fff",
    width: "45px",
    height: "45px",
    borderRadius: "50%",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 8px rgba(37,99,235,0.4)",
  },
  playBtn: {
    background: "#4ade80",
    border: "none",
    color: "#000",
    padding: "0 25px",
    height: "45px",
    borderRadius: "25px",
    fontSize: "16px",
    fontWeight: "900",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: "8px",
    boxShadow: "0 4px 15px rgba(74,222,128,0.4)",
  },
  adjustBtn: {
    background: "transparent",
    border: "none",
    color: "#93c5fd",
    padding: "0 12px",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: "bold",
    transition: "background 0.2s",
  },
  modalOverlay: {
    position: "fixed",
    top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(0,0,0,0.8)",
    backdropFilter: "blur(5px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  modalContent: {
    background: "#1B1B1B",
    width: "90%",
    maxWidth: "400px",
    borderRadius: "12px",
    border: "1px solid rgba(212,175,55,0.3)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    maxHeight: "80vh",
  },
  modalHeader: {
    padding: "15px 20px",
    background: "#141414",
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#fff",
    fontSize: "18px",
    cursor: "pointer",
  },
  historyList: {
    padding: "10px",
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  historyRow: {
    display: "flex",
    justifyContent: "space-between",
    background: "#080808",
    padding: "12px",
    borderRadius: "8px",
    border: "1px solid rgba(255,255,255,0.05)",
  },
  historyCol: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
};
