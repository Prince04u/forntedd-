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
  
  const animRef = useRef(null);
  const startTimeRef = useRef(null);
  const playingRef = useRef(false);
  const activeBetRef = useRef(null);

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

    let socketInstance = null;
    const setupSocket = async () => {
      socketInstance = await getSocket();
      if (socketInstance) {
        socketInstance.on("wallet:balance", (data) => {
          if (data.balance !== undefined) setBalance(data.balance);
        });

        socketInstance.on("limbo:crash", (data) => {
          if (activeBetRef.current === data.betId) {
            handleCrash(data.crashPoint);
          }
        });

        socketInstance.on("limbo:win", (data) => {
          if (activeBetRef.current === data.betId) {
            handleWin(data.multiplier, data.payout);
          }
        });
      }
    };
    setupSocket();

    return () => {
      if (socketInstance) {
        socketInstance.off("wallet:balance");
        socketInstance.off("limbo:crash");
        socketInstance.off("limbo:win");
      }
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
      setError("Minimum auto-cashout is 1.01x");
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

    const res = await playLimbo({ amount, targetMultiplier: target });
    if (!res?.success) {
      setError(res?.message || "Bet failed");
      setIsPlaying(false);
      playingRef.current = false;
      setDisplayState("idle");
      fetchBalance();
      return;
    }

    setActiveBetId(res.data.id);
    activeBetRef.current = res.data.id;
    
    // Start local animation loop based on elapsed time
    startTimeRef.current = Date.now();
    const animateMultiplier = () => {
      if (!playingRef.current) return;
      const elapsed = Date.now() - startTimeRef.current;
      // Formula matches backend: Math.exp(elapsedMs / 4000)
      const current = Math.exp(elapsed / 4000);
      setCurrentMultiplier(current);
      animRef.current = requestAnimationFrame(animateMultiplier);
    };
    animRef.current = requestAnimationFrame(animateMultiplier);
  };

  const handleManualCashout = async () => {
    if (!isPlaying || !activeBetId) return;
    
    // Optimistically stop animation
    setIsPlaying(false);
    playingRef.current = false;
    if (animRef.current) cancelAnimationFrame(animRef.current);

    const res = await cashOutLimbo(activeBetId);
    if (res?.success) {
      handleWin(res.data.multiplier, res.data.payout);
    } else {
      // If it failed, it probably crashed right before we clicked
      if (res?.message?.includes("Crashed at")) {
        // Backend handles sending the crash socket, but we can fallback here
        const crashMatch = res.message.match(/([\d.]+)x/);
        const pt = crashMatch ? Number(crashMatch[1]) : currentMultiplier;
        handleCrash(pt);
      } else {
        setError(res?.message || "Cash out failed");
        setDisplayState("crashed");
      }
    }
  };

  const handleCrash = (point) => {
    setIsPlaying(false);
    playingRef.current = false;
    activeBetRef.current = null;
    setActiveBetId(null);
    if (animRef.current) cancelAnimationFrame(animRef.current);
    
    setCurrentMultiplier(point);
    setCrashPoint(point);
    setDisplayState("crashed");
    fetchHistory();
  };

  const handleWin = (multiplier, payout) => {
    setIsPlaying(false);
    playingRef.current = false;
    activeBetRef.current = null;
    setActiveBetId(null);
    if (animRef.current) cancelAnimationFrame(animRef.current);
    
    setCurrentMultiplier(multiplier);
    setDisplayState("won");
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
          <div style={styles.walletBox}>
            <span style={styles.walletLabel}>Balance</span>
            <span style={styles.walletAmount}>₹{balance.toFixed(2)}</span>
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
                {bet.result.toFixed(2)}x
              </div>
            );
          })}
        </div>

        {/* Main Game Canvas */}
        <div style={styles.gameArea}>
          <div style={styles.skyBackground(displayState)}>
            <div className="clouds"></div>
            <div className="clouds cloud2"></div>
          </div>
          
          <div style={styles.multiplierContainer}>
            <div 
              style={{
                ...styles.multiplierText,
                color: displayState === "won" ? "#4ade80" : displayState === "crashed" ? "#f87171" : "#fff",
              }}
            >
              {currentMultiplier.toFixed(2)}x
            </div>
            {displayState === "won" && (
              <div style={styles.winText}>Cashed Out!</div>
            )}
            {displayState === "crashed" && (
              <div style={styles.crashText}>Flew Away!</div>
            )}
          </div>

          <div style={styles.planeContainer(displayState)}>
            {displayState === "crashed" ? (
              // Exploded or flew away state
              <div style={styles.planeExplosion}>💥</div>
            ) : (
              // CSS Plane
              <div style={styles.planeBody}>
                <div style={styles.planeWing}></div>
                <div style={styles.planeTail}></div>
                {(displayState === "playing" || displayState === "idle") && (
                  <div style={styles.planeEngine}></div>
                )}
              </div>
            )}
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
              <label style={styles.label}>Auto Cash Out</label>
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

          {!isPlaying ? (
            <button 
              style={{...styles.actionButton, background: "#22c55e", color: "#000"}}
              onClick={placeBet}
            >
              BET
            </button>
          ) : (
            <button 
              style={{...styles.actionButton, background: "#eab308", color: "#000"}}
              onClick={handleManualCashout}
            >
              CASH OUT ₹{(Number(betAmount) * currentMultiplier).toFixed(2)}
            </button>
          )}
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
                        {bet.result.toFixed(2)}x
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
        .clouds {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: transparent;
          background-image: 
            radial-gradient(40px 40px at 20% 30%, rgba(255,255,255,0.1) 50%, transparent 100%),
            radial-gradient(60px 50px at 70% 60%, rgba(255,255,255,0.08) 50%, transparent 100%),
            radial-gradient(80px 40px at 40% 80%, rgba(255,255,255,0.05) 50%, transparent 100%);
          background-size: 200% 200%;
          animation: flyClouds 8s linear infinite;
        }
        .cloud2 {
          background-image: 
            radial-gradient(50px 30px at 10% 80%, rgba(255,255,255,0.06) 50%, transparent 100%),
            radial-gradient(90px 60px at 80% 20%, rgba(255,255,255,0.07) 50%, transparent 100%);
          animation: flyClouds 12s linear infinite reverse;
        }
        @keyframes flyClouds {
          0% { background-position: 0% 0%; }
          100% { background-position: -200% 100%; }
        }
        @keyframes planeFly {
          0%, 100% { transform: translateY(0) rotate(-5deg); }
          50% { transform: translateY(-15px) rotate(2deg); }
        }
        @keyframes planeCrash {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(0.5) translateY(-50px) translateX(100px); opacity: 0; }
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
    boxShadow: "0 0 10px rgba(0,0,0,0.5)",
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
  skyBackground: (state) => ({
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    background: state === "crashed" ? "linear-gradient(180deg, #2a0808 0%, #110000 100%)" : "linear-gradient(180deg, #0f172a 0%, #1e1b4b 100%)",
    zIndex: 0,
    transition: "background 0.5s ease",
  }),
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
  planeContainer: (state) => ({
    position: "absolute",
    bottom: "20%",
    left: "30%",
    zIndex: 5,
    animation: state === "playing" ? "planeFly 2s ease-in-out infinite" : state === "crashed" ? "planeCrash 0.5s forwards" : "none",
  }),
  planeExplosion: {
    fontSize: "60px",
    filter: "drop-shadow(0 0 20px red)",
  },
  planeBody: {
    width: "80px",
    height: "25px",
    background: "linear-gradient(to right, #e2e8f0, #94a3b8)",
    borderRadius: "50% 20% 20% 50%",
    position: "relative",
    boxShadow: "inset -2px -2px 10px rgba(0,0,0,0.3)",
    transform: "rotate(-10deg)",
  },
  planeWing: {
    position: "absolute",
    top: "-5px",
    left: "25px",
    width: "30px",
    height: "15px",
    background: "#64748b",
    transform: "skewX(-30deg)",
    borderRadius: "2px",
    zIndex: -1,
  },
  planeTail: {
    position: "absolute",
    top: "-15px",
    left: "5px",
    width: "15px",
    height: "20px",
    background: "#ef4444",
    transform: "skewX(-20deg)",
    borderRadius: "2px",
  },
  planeEngine: {
    position: "absolute",
    top: "10px",
    left: "-15px",
    width: "20px",
    height: "10px",
    background: "linear-gradient(to right, transparent, #ef4444, #fbbf24)",
    borderRadius: "50%",
    filter: "blur(2px)",
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
  actionButton: {
    width: "100%",
    padding: "16px",
    borderRadius: "8px",
    border: "none",
    fontSize: "18px",
    fontWeight: "900",
    cursor: "pointer",
    textTransform: "uppercase",
    transition: "all 0.2s",
    boxShadow: "0 4px 15px rgba(0,0,0,0.3)",
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
