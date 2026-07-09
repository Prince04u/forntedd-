"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { getToken, getUser } from "@/lib/auth";
import { getSocket } from "@/lib/socket";
import {
  getCurrentPeriod,
  getRecentResults,
  placeBet,
  getMyBets,
} from "@/lib/wingoApi";
import { getBalance } from "@/lib/walletApi";
import { getWingoConfig } from "@/lib/platformApi";
import {
  BASE_AMOUNTS,
  MULTIPLIERS,
  NUMBERS,
  DURATION_SEC,
  colorClass,
  formatTimer,
  getColorDots,
  getDurationMeta,
  getSize,
  getBetTheme,
  getBetSelectionLabel,
  formatBetLabel,
  DURATIONS,
} from "@/lib/wingoUtils";
import { usePlatformStatus } from "@/components/platform/PlatformStatusProvider";
import PreSaleRulesModal from "@/components/wingo/PreSaleRulesModal";
import BrandLogo from "@/components/brand/BrandLogo";

export default function WingoGameScreen() {
  const params = useParams();
  const router = useRouter();
  const duration = params.duration;
  const durationMeta = getDurationMeta(duration);
  const { maintenanceMode, message: maintenanceMessage, blocksAction } = usePlatformStatus();

  const [balance, setBalance] = useState(0);
  const [period, setPeriod] = useState(null);
  const [results, setResults] = useState([]);
  const [myBets, setMyBets] = useState([]);
  const [historyTab, setHistoryTab] = useState("game");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [gameHistoryPage, setGameHistoryPage] = useState(1);
  const [expandedBetId, setExpandedBetId] = useState(null);
  const [outcomePopup, setOutcomePopup] = useState(null);
  const [popupCountdown, setPopupCountdown] = useState(3);

  const [betSheet, setBetSheet] = useState(null);
  const [baseAmount, setBaseAmount] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [quickMultiplier, setQuickMultiplier] = useState(1);
  const [agreed, setAgreed] = useState(true);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [wingoPayouts, setWingoPayouts] = useState(null);
  const [betLimits, setBetLimits] = useState({ minBetAmount: 1, maxBetAmount: 100000 });

  const timer = formatTimer(period?.remainingSeconds ?? 0);
  const remainingSeconds = period?.remainingSeconds ?? 0;
  const showCountdownOverlay = remainingSeconds > 0 && remainingSeconds <= 5;
  const bettingLocked = showCountdownOverlay || loading || maintenanceMode || blocksAction("bet");
  const countdownDigits = timer.ss.split("");
  const totalAmount = baseAmount * (Number(quantity) || 0);
  const betTheme = betSheet ? getBetTheme(betSheet.betType, betSheet.betValue) : "green";
  const durationSeconds = DURATION_SEC[duration];
  const myBetsForDuration = useMemo(
    () => myBets.filter((bet) => bet.duration === durationSeconds),
    [myBets, durationSeconds]
  );

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
      setError(err.response?.data?.message || "Failed to load game");
    }
  }, [duration]);

  const handleRefreshBalance = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const balanceRes = await getBalance();
      setBalance(balanceRes.data.balance);
    } catch (err) {
      console.error("Failed to refresh balance", err);
    } finally {
      setTimeout(() => {
        setRefreshing(false);
      }, 800);
    }
  };

  // Popup auto-close countdown timer effect
  useEffect(() => {
    if (!outcomePopup) return;
    setPopupCountdown(3);
    const popTimer = setInterval(() => {
      setPopupCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(popTimer);
          setOutcomePopup(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(popTimer);
  }, [outcomePopup]);

  useEffect(() => {
    setMounted(true);
    if (!getToken()) {
      router.replace("/login");
      return undefined;
    }

    loadData();
    getWingoConfig()
      .then((res) => {
        if (res?.data?.payouts) setWingoPayouts(res.data.payouts);
        if (res?.data?.minBetAmount != null || res?.data?.maxBetAmount != null) {
          setBetLimits({
            minBetAmount: Number(res.data.minBetAmount) || 1,
            maxBetAmount: Number(res.data.maxBetAmount) || 100000,
          });
        }
      })
      .catch(() => {});

    let activeSocket = null;
    let cancelled = false;
    const durationSec = DURATION_SEC[duration];

    const onTick = (data) => {
      if (data.duration === duration) {
        setPeriod((prev) => {
          if (prev && prev.periodId !== data.periodId) {
            loadData();
          }
          return {
            ...prev,
            periodId: data.periodId,
            remainingSeconds: data.remainingSeconds,
          };
        });
      }
    };

    const onResult = (data) => {
      if (data.duration === duration) {
        setTimeout(async () => {
          await loadData();
          try {
            const betsRes = await getMyBets({ limit: 5, duration });
            const myBetsList = betsRes.data?.bets || [];
            const resolvedBet = myBetsList.find((b) => String(b.periodId) === String(data.periodId));
            if (resolvedBet) {
              setOutcomePopup({
                show: true,
                type: resolvedBet.state === "won" ? "win" : "lose",
                amount: resolvedBet.state === "won" ? resolvedBet.winAmount : resolvedBet.amount,
                periodId: resolvedBet.periodId,
                number: data.result.number,
                colors: data.result.colors,
                size: data.result.size,
              });
            }
          } catch (e) {
            console.error("Failed to check resolved bet:", e);
          }
        }, 1000);
      }
    };

    const userObj = getUser();
    getSocket().then((socket) => {
      if (!socket || cancelled) return;

      activeSocket = socket;
      socket.emit("join:wingo", duration);
      if (userObj && userObj._id) {
        socket.emit("auth:register", userObj._id);
      }
      socket.on("wingo:tick", onTick);
      socket.on("wingo:result", onResult);
      socket.on("wallet:balance", (data) => setBalance(data.balance));
    });

    return () => {
      cancelled = true;
      if (activeSocket) {
        activeSocket.off("wingo:tick", onTick);
        activeSocket.off("wingo:result", onResult);
        activeSocket.off("wallet:balance");
      }
    };
  }, [duration, loadData, router]);

  // Local timer ticker to prevent timer freezing or lag between socket events
  useEffect(() => {
    let zeroCounter = 0;
    const localTick = setInterval(() => {
      setPeriod((prev) => {
        if (prev) {
          if (prev.remainingSeconds > 0) {
            zeroCounter = 0;
            return {
              ...prev,
              remainingSeconds: prev.remainingSeconds - 1,
            };
          } else {
            zeroCounter += 1;
            // If the clock remains at 0 for 2 seconds (e.g. if socket lags), force query new period
            if (zeroCounter === 2 || zeroCounter === 5) {
              loadData();
            }
          }
        }
        return prev;
      });
    }, 1000);

    return () => clearInterval(localTick);
  }, [loadData]);

  useEffect(() => {
    if (showCountdownOverlay && betSheet) {
      setBetSheet(null);
    }
  }, [showCountdownOverlay, betSheet]);

  const setBetQuantity = (value) => {
    if (value === "") {
      setQuantity("");
      return;
    }
    const val = parseInt(value, 10);
    if (isNaN(val)) return;
    const next = Math.max(0, val);
    setQuantity(next);
    if (MULTIPLIERS.includes(next)) {
      setQuickMultiplier(next);
    }
  };

  const openBetSheet = (betType, betValue) => {
    if (showCountdownOverlay || maintenanceMode || blocksAction("bet")) return;
    setError("");
    setBetSheet({ betType, betValue });
    setBaseAmount(1);
    setQuantity(quickMultiplier);
    setAgreed(true);
  };

  const closeBetSheet = () => {
    if (loading) return;
    setBetSheet(null);
  };

  const confirmBet = async () => {
    if (!betSheet || !agreed) return;
    if ((Number(quantity) || 0) <= 0) {
      setError("Please enter a valid quantity of 1 or more.");
      return;
    }
    if (totalAmount < betLimits.minBetAmount || totalAmount > betLimits.maxBetAmount) {
      setError(
        `Bet amount must be between ₹${betLimits.minBetAmount} and ₹${betLimits.maxBetAmount.toLocaleString("en-IN")}`
      );
      return;
    }
    setError("");
    setLoading(true);
    try {
      const { betType, betValue } = betSheet;
      await placeBet(duration, {
        betType,
        betValue: String(betValue),
        amount: totalAmount,
        idempotencyKey: `${period?.periodId}_${betType}_${betValue}_${Date.now()}`,
      });
      setBetSheet(null);
      await loadData();
    } catch (err) {
      setError(getBetErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRandom = () => {
    const pick = NUMBERS[Math.floor(Math.random() * NUMBERS.length)];
    openBetSheet("number", pick);
  };

  const openRules = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    setRulesOpen(true);
  };

  const closeRules = () => setRulesOpen(false);

  const formatBaseLabel = (value) => (value >= 1000 ? `${value / 1000}K` : String(value));

  const getBetErrorMessage = (err) => {
    const msg = err.response?.data?.message || "Bet failed";
    if (/replica set|mongos|Transaction numbers/i.test(msg)) {
      return "Bet could not be processed. Please try again.";
    }
    return msg;
  };

  return (
    <main className="wingo-game">
      {/* Header */}
      <header className="wg-header">
        <Link href="/" className="wg-back">‹</Link>
        <BrandLogo href="/" size="sm" className="wg-brand-logo" />
        <div className="wg-header-icons">
          <button type="button" title="Rules" onClick={openRules}>📋</button>
        </div>
      </header>

      {/* Wallet card */}
      <section className="wg-wallet-card">
        <div className="wg-wallet-row">
          <div className="wg-wallet-info">
            <span className="wg-wallet-label" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              Wallet balance
              <button
                type="button"
                onClick={handleRefreshBalance}
                className={`wg-balance-refresh-btn ${refreshing ? "spinning" : ""}`}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--gold)",
                  cursor: "pointer",
                  padding: "0",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: "24px",
                  height: "24px",
                  transition: "all 0.5s ease",
                  outline: "none"
                }}
                title="Refresh Balance"
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    transform: refreshing ? "rotate(360deg)" : "rotate(0deg)",
                    transition: refreshing ? "transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)" : "none",
                  }}
                >
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
              </button>
            </span>
            <div className="wg-wallet-amount">
              {mounted ? `₹${balance.toFixed(2)}` : "₹0.00"}
            </div>
          </div>
          <div className="wg-wallet-actions">
            <Link href="/wallet" className="wg-btn-withdraw">Withdraw</Link>
            <Link href="/wallet/deposit" className="wg-btn-deposit">Deposit</Link>
          </div>
        </div>
      </section>

      {/* Duration tabs */}
      <div className="wg-duration-tabs">
        {DURATIONS.map((d) => (
          <Link
            key={d.slug}
            href={`/wingo/${d.slug}`}
            className={`wg-duration-tab ${duration === d.slug ? "active" : ""}`}
          >
            <span className="wg-duration-icon">⏱</span>
            <span>WinGo {d.label}</span>
          </Link>
        ))}
      </div>

      {(maintenanceMode || blocksAction("bet")) && (
        <div className="wg-maintenance-notice">
          {maintenanceMessage || "Betting is temporarily unavailable during maintenance."}
        </div>
      )}

      {error && !betSheet && <div className="auth-error wg-msg">{error}</div>}

      {/* Ticket section */}
      <section className="wg-ticket">
        <div className="wg-ticket-left">
          <button type="button" className="wg-how-play" onClick={openRules}>
            📖 How to play
          </button>
          <p className="wg-mode-label">{durationMeta.short}</p>
          <div className="wg-recent-row">
            {results.slice(0, 5).map((r) => (
              <span key={r.periodId} className={`wg-mini-ball ${colorClass(r.resultNumber)}`}>
                {r.resultNumber}
              </span>
            ))}
          </div>
        </div>
        <div className="wg-ticket-right">
          <span className="wg-time-label">Time remaining</span>
          <div className="wg-timer">
            <span>{timer.mm}</span>
            <em>:</em>
            <span>{timer.ss}</span>
          </div>
          <p className="wg-period-id">{period?.periodId || "—"}</p>
        </div>
      </section>

      <section className="wg-bet-zone">
        {showCountdownOverlay && (
          <div className="wg-countdown-overlay" aria-live="polite" aria-label={`${remainingSeconds} seconds remaining`}>
            <div className="wg-countdown-digit">{countdownDigits[0]}</div>
            <div className="wg-countdown-digit">{countdownDigits[1]}</div>
          </div>
        )}

      <div className="wg-bet-panel">
      {/* Color bets */}
      <div className={`wg-color-row ${showCountdownOverlay ? "wg-bet-locked" : ""}`}>
        <button className="wg-color-btn green" disabled={bettingLocked} onClick={() => openBetSheet("color", "green")}>Green</button>
        <button className="wg-color-btn violet" disabled={bettingLocked} onClick={() => openBetSheet("color", "violet")}>Violet</button>
        <button className="wg-color-btn red" disabled={bettingLocked} onClick={() => openBetSheet("color", "red")}>Red</button>
      </div>

      {/* Number grid */}
      <div className={`wg-number-grid ${showCountdownOverlay ? "wg-bet-locked" : ""}`}>
        {NUMBERS.map((num) => (
          <button
            key={num}
            type="button"
            className={`wg-num-btn ${colorClass(num)}`}
            disabled={bettingLocked}
            onClick={() => openBetSheet("number", num)}
          >
            {num}
          </button>
        ))}
      </div>

      {/* Random + multipliers */}
      <div className={`wg-multi-row ${showCountdownOverlay ? "wg-bet-locked" : ""}`}>
        <button type="button" className="wg-random-btn" disabled={bettingLocked} onClick={handleRandom}>
          Random
        </button>
        <div className="wg-multipliers">
          {MULTIPLIERS.map((m) => (
            <button
              key={m}
              type="button"
              className={`wg-multi-btn ${quickMultiplier === m ? "active" : ""}`}
              disabled={bettingLocked}
              onClick={() => setQuickMultiplier(m)}
            >
              X{m}
            </button>
          ))}
        </div>
      </div>

      {/* Big / Small */}
      <div className={`wg-size-row ${showCountdownOverlay ? "wg-bet-locked" : ""}`}>
        <button className="wg-size-btn big" disabled={bettingLocked} onClick={() => openBetSheet("big_small", "big")}>Big</button>
        <button className="wg-size-btn small" disabled={bettingLocked} onClick={() => openBetSheet("big_small", "small")}>Small</button>
      </div>
      </div>
      </section>

      {/* History tabs */}
      <div className="wg-history-tabs">
        {[
          { id: "game", label: "Game history" },
          { id: "chart", label: "Chart" },
          { id: "my", label: "My history" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`wg-history-tab ${historyTab === tab.id ? "active" : ""}`}
            onClick={() => setHistoryTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* History content */}
      <section className="wg-history-panel">
        {historyTab === "game" && (
          <>
            <table className="wg-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Number</th>
                  <th>Big/Small</th>
                  <th>Color</th>
                </tr>
              </thead>
              <tbody>
                {results.slice((gameHistoryPage - 1) * 10, gameHistoryPage * 10).map((r) => (
                  <tr key={r.periodId}>
                    <td className="wg-period-cell">{r.periodId?.slice(-8)}</td>
                    <td>
                      <span className={`wg-table-num ${colorClass(r.resultNumber)}`}>{r.resultNumber}</span>
                    </td>
                    <td>{getSize(r.resultNumber)}</td>
                    <td>
                      <div className="wg-color-dots">
                        {getColorDots(r.resultNumber).map((c) => (
                          <span key={c} className={`wg-dot ${c}`} />
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls (Pages 1 to 5) */}
            <div className="wg-pagination">
              <button
                type="button"
                onClick={() => setGameHistoryPage((prev) => Math.max(1, prev - 1))}
                disabled={gameHistoryPage === 1}
                className="wg-page-btn"
              >
                ‹
              </button>
              {[1, 2, 3, 4, 5].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setGameHistoryPage(p)}
                  className={`wg-page-btn ${gameHistoryPage === p ? "active" : ""}`}
                >
                  {p}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setGameHistoryPage((prev) => Math.min(5, prev + 1))}
                disabled={gameHistoryPage === 5}
                className="wg-page-btn"
              >
                ›
              </button>
            </div>
          </>
        )}

        {historyTab === "chart" && (
          <div style={{ overflowX: "auto" }}>
            <table className="wg-chart-table">
              <thead>
                <tr>
                  <th style={{ textAlign: "left", paddingLeft: "10px" }}>Period</th>
                  <th colSpan={10} style={{ padding: "10px 0" }}>Number</th>
                  <th></th>
                </tr>
                <tr style={{ background: "rgba(255,255,255,0.02)" }}>
                  <th style={{ textAlign: "left", paddingLeft: "10px" }}></th>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                    <th key={n} style={{ fontSize: "0.8rem", width: "26px", color: "var(--gold)" }}>{n}</th>
                  ))}
                  <th style={{ width: "35px" }}></th>
                </tr>
              </thead>
              <tbody>
                {results.slice(0, 15).map((r) => {
                  const winNum = r.resultNumber;
                  const size = getSize(winNum);

                  return (
                    <tr key={r.periodId}>
                      <td style={{ textAlign: "left", paddingLeft: "10px", color: "#9ca3af", fontFamily: "monospace", fontSize: "0.8rem" }}>
                        {r.periodId}
                      </td>
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => {
                        const isActive = n === winNum;
                        return (
                          <td key={n} style={{ padding: "4px 0" }}>
                            <span
                              className={`wg-chart-cell-num ${isActive ? `active ${colorClass(winNum)}` : ""}`}
                              style={{
                                width: "22px",
                                height: "22px",
                                borderRadius: "50%",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.75rem",
                                fontWeight: "700",
                                color: isActive ? "#ffffff" : "#4b5563",
                                background: isActive ? undefined : "rgba(255,255,255,0.03)"
                              }}
                            >
                              {n}
                            </span>
                          </td>
                        );
                      })}
                      <td style={{ padding: "4px 0" }}>
                        <span
                          className={`wg-chart-size-badge ${size.toLowerCase()}`}
                          style={{
                            display: "inline-flex",
                            width: "20px",
                            height: "20px",
                            borderRadius: "50%",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.7rem",
                            fontWeight: "800",
                            color: "#fff",
                            background: size === "Big" ? "#f59e0b" : "#3b82f6"
                          }}
                        >
                          {size === "Big" ? "B" : "S"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {historyTab === "my" && (
          <table className="wg-table">
            <thead>
              <tr>
                <th>Period</th>
                <th>Bet</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {myBetsForDuration.length === 0 ? (
                <tr><td colSpan={4} className="wg-empty">No bets yet for {durationMeta.short}</td></tr>
              ) : (
                myBetsForDuration.map((bet) => {
                  const isExpanded = expandedBetId === bet._id;
                  const isWin = bet.status === "won";
                  const copyOrderId = (e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(bet.orderNumber || "");
                    alert("Order number copied successfully!");
                  };

                  return (
                    <React.Fragment key={bet._id}>
                      <tr
                        onClick={() => setExpandedBetId(isExpanded ? null : bet._id)}
                        style={{ cursor: "pointer" }}
                      >
                        <td className="wg-period-cell">
                          {bet.periodId?.slice(-8)} {isExpanded ? "▲" : "▼"}
                        </td>
                        <td>
                          <span className={`wg-my-bet-label wg-my-bet-${getBetTheme(bet.betType, bet.betValue)}`}>
                            {formatBetLabel(bet.betType, bet.betValue)}
                          </span>
                        </td>
                        <td>₹{bet.amount.toFixed(2)}</td>
                        <td className={`wg-status-${bet.status}`}>
                          <span className={`badge badge-${isWin ? "success" : bet.status === "pending" ? "warning" : "danger"}`} style={{ display: "inline-block", padding: "0.2rem 0.5rem", borderRadius: "6px", fontSize: "0.75rem" }}>
                            {isWin ? "Succeed" : bet.status === "pending" ? "Pending" : "Failed"}
                          </span>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="wg-details-row">
                          <td colSpan={4}>
                            <div className="wg-details-card">
                              <div className="wg-details-title">Details</div>
                              <div className="wg-details-item">
                                <span className="wg-details-label">Order number</span>
                                <span className="wg-details-val" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  {bet.orderNumber || "—"}
                                  <button
                                    type="button"
                                    onClick={copyOrderId}
                                    style={{
                                      background: "none",
                                      border: "none",
                                      color: "var(--gold)",
                                      cursor: "pointer",
                                      padding: "0 4px",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      outline: "none"
                                    }}
                                    title="Copy Order Number"
                                  >
                                    <svg
                                      viewBox="0 0 24 24"
                                      width="14"
                                      height="14"
                                      stroke="currentColor"
                                      strokeWidth="2.5"
                                      fill="none"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    >
                                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                  </button>
                                </span>
                              </div>
                              <div className="wg-details-item">
                                <span className="wg-details-label">Period</span>
                                <span className="wg-details-val">{bet.periodId}</span>
                              </div>
                              <div className="wg-details-item">
                                <span className="wg-details-label">Purchase amount</span>
                                <span className="wg-details-val">₹{bet.amount.toFixed(2)}</span>
                              </div>
                              <div className="wg-details-item">
                                <span className="wg-details-label">Quantity</span>
                                <span className="wg-details-val">{bet.amount / baseAmount || 1}</span>
                              </div>
                              <div className="wg-details-item">
                                <span className="wg-details-label">Amount after tax</span>
                                <span className="wg-details-val" style={{ color: "#ef4444" }}>
                                  ₹{(bet.amountAfterTax || bet.amount * 0.98).toFixed(2)}
                                </span>
                              </div>
                              <div className="wg-details-item">
                                <span className="wg-details-label">Tax</span>
                                <span className="wg-details-val">₹{(bet.tax || bet.amount * 0.02).toFixed(2)}</span>
                              </div>
                              <div className="wg-details-item">
                                <span className="wg-details-label">Result</span>
                                <span className="wg-details-val">
                                  {bet.resultNumber !== null && bet.resultNumber !== undefined ? (
                                    <>
                                      <span style={{ marginRight: "6px", fontWeight: "800" }}>{bet.resultNumber}</span>
                                      <span style={{ textTransform: "capitalize", color: bet.resultColors?.includes("red") ? "#ef4444" : "#22c55e", marginRight: "6px" }}>
                                        {bet.resultColors?.join("/")}
                                      </span>
                                      <span style={{ textTransform: "capitalize", color: "var(--gold)" }}>
                                        {bet.resultSize}
                                      </span>
                                    </>
                                  ) : "Pending"}
                                </span>
                              </div>
                              <div className="wg-details-item">
                                <span className="wg-details-label">Select</span>
                                <span className="wg-details-val" style={{ textTransform: "capitalize" }}>
                                  {formatBetLabel(bet.betType, bet.betValue)}
                                </span>
                              </div>
                              <div className="wg-details-item">
                                <span className="wg-details-label">Status</span>
                                <span className="wg-details-val" style={{ color: isWin ? "#22c55e" : bet.status === "pending" ? "var(--gold)" : "#ef4444" }}>
                                  {isWin ? "Succeed" : bet.status === "pending" ? "Pending" : "Failed"}
                                </span>
                              </div>
                              <div className="wg-details-item">
                                <span className="wg-details-label">Win/lose</span>
                                <span className={`wg-details-val ${isWin ? "wg-status-won" : "wg-status-lost"}`} style={{ color: isWin ? "#22c55e" : "#ef4444", fontWeight: "800" }}>
                                  {isWin ? `+ ₹${bet.winAmount.toFixed(2)}` : `- ₹${bet.amount.toFixed(2)}`}
                                </span>
                              </div>
                              <div className="wg-details-item">
                                <span className="wg-details-label">Order time</span>
                                <span className="wg-details-val">{new Date(bet.createdAt).toLocaleString()}</span>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </section>

      {betSheet && (
        <div className="wg-bet-overlay" onClick={closeBetSheet}>
          <div
            className={`wg-bet-sheet theme-${betTheme}`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="wg-bet-sheet-banner">
              <div className="wg-bet-sheet-header">
                <p className="wg-bet-sheet-game">{durationMeta.short}</p>
              </div>
              <div className="wg-bet-sheet-select">
                {getBetSelectionLabel(betSheet.betType, betSheet.betValue)}
              </div>
            </div>

            <div className="wg-bet-sheet-body">
              <div className="wg-bet-field">
                <span className="wg-bet-field-label">Balance</span>
                <div className="wg-bet-amount-row">
                  {BASE_AMOUNTS.map((value) => (
                    <button
                      key={value}
                      type="button"
                      className={`wg-bet-chip ${baseAmount === value ? "active" : ""}`}
                      onClick={() => setBaseAmount(value)}
                    >
                      {formatBaseLabel(value)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="wg-bet-field">
                <span className="wg-bet-field-label">Quantity</span>
                <div className="wg-bet-qty">
                  <button
                    type="button"
                    className="wg-bet-qty-btn"
                    disabled={quantity <= 1}
                    onClick={() => setBetQuantity(quantity - 1)}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setBetQuantity(e.target.value)}
                    className="wg-bet-qty-input"
                  />
                  <button
                    type="button"
                    className="wg-bet-qty-btn"
                    onClick={() => setBetQuantity(quantity + 1)}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="wg-bet-field wg-bet-field-multi">
                <div className="wg-bet-multi-row">
                  {MULTIPLIERS.map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`wg-bet-multi ${quantity === m ? "active" : ""}`}
                      onClick={() => setBetQuantity(m)}
                    >
                      X{m}
                    </button>
                  ))}
                </div>
              </div>

              <label className="wg-bet-agree">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
                <span>I agree</span>
                <button type="button" className="wg-bet-rules" onClick={openRules}>
                  (Pre-sale rules)
                </button>
              </label>

              {error && betSheet && (
                <p className="wg-bet-sheet-error" role="alert">{error}</p>
              )}
            </div>

            <div className="wg-bet-sheet-footer">
              <button type="button" className="wg-bet-cancel" disabled={loading} onClick={closeBetSheet}>
                Cancel
              </button>
              <button
                type="button"
                className="wg-bet-confirm"
                disabled={loading || !agreed}
                onClick={confirmBet}
              >
                {loading ? "Processing..." : `Total amount ₹${totalAmount.toFixed(2)}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <PreSaleRulesModal open={rulesOpen} onClose={closeRules} payouts={wingoPayouts} />

      {/* Outcome announcement Win/Loss popup modal */}
      {outcomePopup && (
        <div className="wg-popup-overlay" onClick={() => setOutcomePopup(null)}>
          <div className="wg-outcome-card" onClick={(e) => e.stopPropagation()}>
            
            {/* Header section with Emblem, Wings & Ribbon */}
            <div className={`wg-outcome-header ${outcomePopup.type}`}>
              {/* SVG Wings */}
              <div className="wg-outcome-wings">
                <svg viewBox="0 0 200 80" className="wg-wings-svg" style={{ width: "240px", height: "96px" }}>
                  {outcomePopup.type === "win" ? (
                    <>
                      {/* Gold Win Wings */}
                      <path d="M 100 45 C 50 45, 20 20, 5 10 C 25 35, 45 60, 100 65 Z" fill="#aa841d" opacity="0.8" />
                      <path d="M 100 45 C 60 40, 35 15, 18 5 C 32 22, 50 48, 100 55 Z" fill="#FFE07D" />
                      <path d="M 100 45 C 150 45, 180 20, 195 10 C 175 35, 155 60, 100 65 Z" fill="#aa841d" opacity="0.8" />
                      <path d="M 100 45 C 140 40, 165 15, 182 5 C 168 22, 150 48, 100 55 Z" fill="#FFE07D" />
                    </>
                  ) : (
                    <>
                      {/* Silver Loss Wings */}
                      <path d="M 100 45 C 50 45, 20 20, 5 10 C 25 35, 45 60, 100 65 Z" fill="#4b5563" opacity="0.8" />
                      <path d="M 100 45 C 60 40, 35 15, 18 5 C 32 22, 50 48, 100 55 Z" fill="#cbd5e1" />
                      <path d="M 100 45 C 150 45, 180 20, 195 10 C 175 35, 155 60, 100 65 Z" fill="#4b5563" opacity="0.8" />
                      <path d="M 100 45 C 140 40, 165 15, 182 5 C 168 22, 150 48, 100 55 Z" fill="#cbd5e1" />
                    </>
                  )}
                </svg>
              </div>

              {/* Emblem Badge */}
              <div className={`wg-outcome-emblem ${outcomePopup.type}`}>
                <span className="wg-outcome-rocket">🚀</span>
              </div>

              {/* Ribbon Banner */}
              <div className={`wg-outcome-ribbon ${outcomePopup.type}`}>
                {outcomePopup.type === "win" ? "Congratulations" : "Sorry"}
              </div>
            </div>

            {/* Body Section */}
            <div className="wg-outcome-body">
              
              {/* Lottery results details */}
              <div className="wg-outcome-details">
                <span className="wg-outcome-details-label">Lottery results</span>
                <div className="wg-outcome-details-badges">
                  {outcomePopup.colors?.map((col) => (
                    <span key={col} className={`wg-outcome-badge ${col}`} style={{ textTransform: "capitalize" }}>
                      {col}
                    </span>
                  ))}
                  <span className="wg-outcome-badge number">{outcomePopup.number}</span>
                  <span className="wg-outcome-badge size">{outcomePopup.size}</span>
                </div>
              </div>

              {/* Envelope Paper Sheet */}
              <div className="wg-outcome-envelope">
                <div className="wg-outcome-paper">
                  <div className="wg-outcome-paper-title">
                    {outcomePopup.type === "win" ? "Bonus" : "Lose"}
                  </div>
                  <div className={`wg-outcome-paper-val ${outcomePopup.type}`}>
                    {outcomePopup.type === "win" ? `₹${outcomePopup.amount.toFixed(2)}` : "Lose"}
                  </div>
                  <div className="wg-outcome-paper-period">
                    Period: WinGo {durationMeta.short} {outcomePopup.periodId}
                  </div>
                </div>
              </div>

              {/* Footer Close timer */}
              <div className="wg-outcome-footer-timer">
                <span className="wg-outcome-timer-circle"></span>
                <span>{popupCountdown} seconds auto close</span>
              </div>
            </div>
            
          </div>
        </div>
      )}

      <style>{`
        /* Refresh Button Spinning Keyframes */
        .wg-balance-refresh-btn.spinning svg {
          animation: balance-spin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        @keyframes balance-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Details cards styling */
        .wg-details-row {
          background: rgba(255, 255, 255, 0.01) !important;
        }
        .wg-details-card {
          background: #1e1e24;
          border-radius: 12px;
          border: 1px solid rgba(212, 175, 55, 0.1);
          padding: 12px;
          font-size: 0.85rem;
          text-align: left;
        }
        .wg-details-title {
          font-weight: bold;
          color: var(--gold);
          margin-bottom: 8px;
          font-size: 0.95rem;
        }
        .wg-details-item {
          display: flex;
          justify-content: space-between;
          padding: 6px 0;
          border-bottom: 1px dashed rgba(255, 255, 255, 0.05);
        }
        .wg-details-item:last-child {
          border-bottom: none;
        }
        .wg-details-label {
          color: #9ca3af;
        }
        .wg-details-val {
          color: #ffffff;
          font-weight: 600;
        }

        /* Pagination styling */
        .wg-pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 6px;
          margin: 12px 0;
        }
        .wg-page-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.08);
          color: #d1d5db;
          font-size: 0.8rem;
          border-radius: 6px;
          width: 28px;
          height: 28px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
        }
        .wg-page-btn.active {
          background: linear-gradient(135deg, var(--gold) 0%, #a88118 100%);
          color: #111;
          font-weight: bold;
          border-color: var(--gold);
        }
        .wg-page-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        /* Outcome announcement win/loss popups overlay */
        .wg-popup-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(4px);
          z-index: 9999;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: popup-fadein 0.3s ease;
        }
        @keyframes popup-fadein {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .wg-outcome-card {
          width: 320px;
          background: linear-gradient(180deg, #2b2b36 0%, #171720 100%);
          border-radius: 28px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7);
          position: relative;
          text-align: center;
          animation: popup-scaleup 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
          overflow: visible;
        }
        @keyframes popup-scaleup {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .wg-outcome-header {
          height: 120px;
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          padding-bottom: 12px;
          border-radius: 28px 28px 0 0;
        }
        .wg-outcome-header.win {
          background: linear-gradient(180deg, #ff5e36 0%, #d32f2f 100%);
        }
        .wg-outcome-header.lose {
          background: linear-gradient(180deg, #64748b 0%, #334155 100%);
        }

        .wg-outcome-wings {
          position: absolute;
          top: -46px;
          display: flex;
          justify-content: center;
          width: 100%;
          pointer-events: none;
        }
        .wg-wings-svg {
          filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4));
        }

        .wg-outcome-emblem {
          position: absolute;
          top: -30px;
          width: 68px;
          height: 68px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid #ffffff;
          box-shadow: 0 8px 16px rgba(0,0,0,0.3);
          z-index: 10;
        }
        .wg-outcome-emblem.win {
          background: linear-gradient(135deg, #ffd861 0%, #f5af19 100%);
        }
        .wg-outcome-emblem.lose {
          background: linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%);
        }
        .wg-outcome-rocket {
          font-size: 2.2rem;
          filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25));
        }

        .wg-outcome-ribbon {
          width: 85%;
          padding: 8px 12px;
          border-radius: 12px;
          font-size: 1.25rem;
          font-weight: 900;
          color: #ffffff;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.25);
          z-index: 5;
        }
        .wg-outcome-ribbon.win {
          background: linear-gradient(90deg, #ff8c00 0%, #e65c00 100%);
          border: 1px solid rgba(255, 255, 255, 0.25);
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
        }
        .wg-outcome-ribbon.lose {
          background: linear-gradient(90deg, #475569 0%, #1e293b 100%);
          border: 1px solid rgba(255, 255, 255, 0.15);
          text-shadow: 0 2px 4px rgba(0, 0, 0, 0.4);
        }

        .wg-outcome-body {
          padding: 24px 20px;
        }

        .wg-outcome-details {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 20px;
        }
        .wg-outcome-details-label {
          font-size: 0.8rem;
          color: #94a3b8;
          font-weight: 500;
        }
        .wg-outcome-details-badges {
          display: flex;
          gap: 6px;
        }
        .wg-outcome-badge {
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 700;
          color: #ffffff;
        }
        .wg-outcome-badge.red { background: #ef4444; }
        .wg-outcome-badge.green { background: #22c55e; }
        .wg-outcome-badge.violet { background: #a855f7; }
        .wg-outcome-badge.number { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15); }
        .wg-outcome-badge.size { background: rgba(212,175,55,0.15); color: var(--gold); border: 1px solid rgba(212,175,55,0.3); }

        .wg-outcome-envelope {
          margin-bottom: 20px;
          perspective: 1000px;
        }
        .wg-outcome-paper {
          background: #ffffff;
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.3);
          border: 1px solid #e2e8f0;
          text-align: center;
          position: relative;
          overflow: hidden;
        }
        .wg-outcome-paper::before {
          content: "";
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: repeating-linear-gradient(45deg, #ef4444, #ef4444 10px, #3b82f6 10px, #3b82f6 20px);
        }
        .wg-outcome-paper-title {
          font-size: 0.9rem;
          color: #64748b;
          font-weight: bold;
          margin-top: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .wg-outcome-paper-val {
          font-size: 2.1rem;
          font-weight: 900;
          margin: 8px 0;
        }
        .wg-outcome-paper-val.win {
          color: #d32f2f;
          text-shadow: 0 1px 2px rgba(0,0,0,0.1);
        }
        .wg-outcome-paper-val.lose {
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .wg-outcome-paper-period {
          font-size: 0.75rem;
          color: #94a3b8;
        }

        .wg-outcome-footer-timer {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-size: 0.85rem;
          color: #94a3b8;
        }
        .wg-outcome-timer-circle {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 2px solid var(--gold);
          border-top-color: transparent;
          animation: rotate 1s linear infinite;
        }
        @keyframes rotate {
          to { transform: rotate(360deg); }
        }

        /* Trend Chart Table styling */
        .wg-chart-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.8rem;
          color: #9ca3af;
          margin-top: 10px;
        }
        .wg-chart-table th, .wg-chart-table td {
          text-align: center;
          padding: 6px 2px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.03);
        }
        .wg-chart-cell-num {
          transition: all 0.2s ease;
        }
        .wg-chart-cell-num.active {
          color: #ffffff !important;
          box-shadow: 0 4px 8px rgba(0,0,0,0.3);
        }
        .wg-chart-cell-num.active.green {
          background: radial-gradient(circle at 35% 25%, #86efac 0%, #22c55e 50%, #15803d 100%) !important;
        }
        .wg-chart-cell-num.active.red {
          background: radial-gradient(circle at 35% 25%, #fca5a5 0%, #ef4444 50%, #b91c1c 100%) !important;
        }
        .wg-chart-cell-num.active.v0 {
          background: linear-gradient(135deg, #7c3aed 0%, #7c3aed 50%, #ef4444 50%, #ef4444 100%) !important;
        }
        .wg-chart-cell-num.active.v5 {
          background: linear-gradient(135deg, #7c3aed 0%, #7c3aed 50%, #22c55e 50%, #22c55e 100%) !important;
        }

        /* Number grid overrides for active highlight color disappearance */
        .wg-num-btn:focus,
        .wg-num-btn:active,
        .wg-num-btn:hover {
          outline: none !important;
          color: #ffffff !important;
          -webkit-tap-highlight-color: transparent !important;
        }
        
        .wg-num-btn.green:focus,
        .wg-num-btn.green:active {
          background: radial-gradient(circle at 35% 25%, #86efac 0%, #22c55e 50%, #15803d 100%) !important;
        }
        
        .wg-num-btn.red:focus,
        .wg-num-btn.red:active {
          background: radial-gradient(circle at 35% 25%, #fca5a5 0%, #ef4444 50%, #b91c1c 100%) !important;
        }
        
        .wg-num-btn.v0:focus,
        .wg-num-btn.v0:active {
          background: linear-gradient(135deg, #7c3aed 0%, #7c3aed 50%, #ef4444 50%, #ef4444 100%) !important;
        }
        
        .wg-num-btn.v5:focus,
        .wg-num-btn.v5:active {
          background: linear-gradient(135deg, #7c3aed 0%, #7c3aed 50%, #22c55e 50%, #22c55e 100%) !important;
        }
      `}</style>
    </main>
  );
}
