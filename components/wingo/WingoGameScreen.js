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

  const formatBaseLabel = (value) => String(value);

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
          <div className="wg-outcome-card-container" onClick={(e) => e.stopPropagation()}>
            <div className={`wg-outcome-card-v2 ${outcomePopup.type}`}>
              
              {/* Close Button Top Right */}
              <button 
                type="button" 
                className="wg-outcome-v2-close-top"
                onClick={() => setOutcomePopup(null)}
                aria-label="Close"
              >
                ✕
              </button>

              {/* Glowing Wings, Badge and Crown Header */}
              <div className="wg-outcome-v2-header">
                <svg viewBox="0 0 260 160" className="wg-outcome-v2-header-svg">
                  <defs>
                    {/* Badge Gradients */}
                    <radialGradient id="goldBadge" cx="50%" cy="30%" r="50%">
                      <stop offset="0%" stopColor="#2c2518" />
                      <stop offset="100%" stopColor="#080705" />
                    </radialGradient>
                    <radialGradient id="silverBadge" cx="50%" cy="30%" r="50%">
                      <stop offset="0%" stopColor="#20232a" />
                      <stop offset="100%" stopColor="#0a0b0d" />
                    </radialGradient>
                    
                    {/* Frame Gradients */}
                    <linearGradient id="goldFrame" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FFEAA0" />
                      <stop offset="50%" stopColor="#D4AF37" />
                      <stop offset="100%" stopColor="#8A6D1C" />
                    </linearGradient>
                    <linearGradient id="silverFrame" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#F1F5F9" />
                      <stop offset="50%" stopColor="#94A3B8" />
                      <stop offset="100%" stopColor="#475569" />
                    </linearGradient>
                    
                    {/* Wings Gradients */}
                    <linearGradient id="goldWings" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#E7C66A" />
                      <stop offset="50%" stopColor="#D4AF37" />
                      <stop offset="100%" stopColor="#9E7A1E" />
                    </linearGradient>
                    <linearGradient id="silverWings" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#E2E8F0" />
                      <stop offset="50%" stopColor="#94A3B8" />
                      <stop offset="100%" stopColor="#64748B" />
                    </linearGradient>

                    {/* Ribbon Gradients */}
                    <linearGradient id="goldRibbon" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#F4D77D" />
                      <stop offset="50%" stopColor="#D4AF37" />
                      <stop offset="100%" stopColor="#A37F1A" />
                    </linearGradient>
                    <linearGradient id="redRibbon" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#EF4444" />
                      <stop offset="50%" stopColor="#B91C1C" />
                      <stop offset="100%" stopColor="#7F1D1D" />
                    </linearGradient>

                    {/* Circular Logo ClipPath */}
                    <clipPath id="circleClip">
                      <circle cx="130" cy="85" r="38" />
                    </clipPath>
                  </defs>

                  {/* Confetti & Sparkles */}
                  {outcomePopup.type === "win" ? (
                    <g opacity="0.85">
                      <rect x="50" y="40" width="7" height="3.5" rx="1" fill="#FFEAA0" transform="rotate(15, 50, 40)" />
                      <rect x="205" y="45" width="4.5" height="7" rx="1" fill="#F4D77D" transform="rotate(-25, 205, 45)" />
                      <rect x="35" y="80" width="5.5" height="5.5" rx="1" fill="#C69A2B" transform="rotate(45, 35, 80)" />
                      <rect x="220" y="85" width="6.5" height="4" rx="1" fill="#E7C66A" transform="rotate(12, 220, 85)" />
                      <circle cx="55" cy="120" r="1.8" fill="#D4AF37" />
                      <circle cx="200" cy="120" r="1.8" fill="#FFEAA0" />
                      <path d="M 80 60 L 82 65 L 87 65 L 83 68 L 84 73 L 80 70 L 76 73 L 77 68 L 73 65 L 78 65 Z" fill="#FFE58F" />
                      <path d="M 180 60 L 182 65 L 187 65 L 183 68 L 184 73 L 180 70 L 176 73 L 177 68 L 173 65 L 178 65 Z" fill="#FFE58F" />
                    </g>
                  ) : (
                    <g opacity="0.85">
                      <rect x="50" y="40" width="7" height="3.5" rx="1" fill="#EF4444" transform="rotate(15, 50, 40)" />
                      <rect x="205" y="45" width="4.5" height="7" rx="1" fill="#B91C1C" transform="rotate(-25, 205, 45)" />
                      <rect x="35" y="80" width="5.5" height="5.5" rx="1" fill="#EF4444" transform="rotate(45, 35, 80)" />
                      <rect x="220" y="85" width="6.5" height="4" rx="1" fill="#FCA5A5" transform="rotate(12, 220, 85)" />
                      <circle cx="55" cy="120" r="1.8" fill="#EF4444" />
                      <circle cx="200" cy="120" r="1.8" fill="#B91C1C" />
                      <path d="M 80 60 L 82 65 L 87 65 L 83 68 L 84 73 L 80 70 L 76 73 L 77 68 L 73 65 L 78 65 Z" fill="#FCA5A5" />
                      <path d="M 180 60 L 182 65 L 187 65 L 183 68 L 184 73 L 180 70 L 176 73 L 177 68 L 173 65 L 178 65 Z" fill="#FCA5A5" />
                    </g>
                  )}

                  {/* Left Wing */}
                  <g transform="translate(130, 85) scale(-1, 1) translate(-130, -85)">
                    <path d="M 130 85 C 95 85, 70 75, 45 53 C 60 70, 82 85, 130 88 Z" fill={outcomePopup.type === "win" ? "url(#goldWings)" : "url(#silverWings)"} />
                    <path d="M 125 80 C 92 72, 68 58, 38 33 C 54 52, 78 72, 125 75 Z" fill={outcomePopup.type === "win" ? "#FFE07D" : "#E2E8F0"} opacity="0.9" stroke={outcomePopup.type === "loss" ? "#EF4444" : "none"} strokeWidth="0.5" />
                    <path d="M 120 75 C 87 60, 62 42, 32 15 C 47 38, 72 58, 120 62 Z" fill={outcomePopup.type === "win" ? "#FFF2AF" : "#F1F5F9"} />
                  </g>

                  {/* Right Wing */}
                  <g>
                    <path d="M 130 85 C 95 85, 70 75, 45 53 C 60 70, 82 85, 130 88 Z" fill={outcomePopup.type === "win" ? "url(#goldWings)" : "url(#silverWings)"} />
                    <path d="M 125 80 C 92 72, 68 58, 38 33 C 54 52, 78 72, 125 75 Z" fill={outcomePopup.type === "win" ? "#FFE07D" : "#E2E8F0"} opacity="0.9" stroke={outcomePopup.type === "loss" ? "#EF4444" : "none"} strokeWidth="0.5" />
                    <path d="M 120 75 C 87 60, 62 42, 32 15 C 47 38, 72 58, 120 62 Z" fill={outcomePopup.type === "win" ? "#FFF2AF" : "#F1F5F9"} />
                  </g>

                  {/* Badge Circle outer frame shadow */}
                  <circle cx="130" cy="85" r="39" fill="rgba(0,0,0,0.5)" />

                  {/* Circular Emblem Logo clipped */}
                  <image 
                    href="/images/logo-ln.png" 
                    x="91" 
                    y="46" 
                    width="78" 
                    height="78" 
                    clipPath="url(#circleClip)"
                    style={{
                      filter: outcomePopup.type === "win" ? "none" : "grayscale(1) brightness(1.2)"
                    }}
                  />

                  {/* Outer border ring overlay */}
                  <circle cx="130" cy="85" r="38" stroke={outcomePopup.type === "win" ? "#FFEAA0" : "#E2E8F0"} strokeWidth="1.5" fill="none" />

                  {/* Crown (Only for Win!) */}
                  {outcomePopup.type === "win" && (
                    <g transform="translate(130, 45) scale(1.2) translate(-12, -12)">
                      <path d="M 2 17 L 4 7 L 9 11 L 12 4 L 15 11 L 20 7 L 22 17 Z" fill="#FFEAA0" stroke="#8A6D1C" strokeWidth="1" />
                      <circle cx="2" cy="7" r="1" fill="#FFF" />
                      <circle cx="9" cy="11" r="0.8" fill="#FFF" />
                      <circle cx="12" cy="4" r="1.2" fill="#FFF" />
                      <circle cx="15" cy="11" r="0.8" fill="#FFF" />
                      <circle cx="22" cy="7" r="1" fill="#FFF" />
                      <circle cx="12" cy="14" r="1.5" fill="#EF4444" />
                    </g>
                  )}

                  {/* 3D Ribbon Folds */}
                  <g>
                    {/* Ribbon Back folds shadow */}
                    <path d="M 46 127 L 54 119 L 54 137 Z" fill={outcomePopup.type === "win" ? "#7A5E12" : "#5C0E0E"} />
                    <path d="M 214 127 L 206 119 L 206 137 Z" fill={outcomePopup.type === "win" ? "#7A5E12" : "#5C0E0E"} />

                    {/* Left tail */}
                    <path d="M 46 127 L 18 121 L 26 137 L 54 137 L 54 119 Z" fill={outcomePopup.type === "win" ? "#A37F1A" : "#7F1D1D"} stroke={outcomePopup.type === "win" ? "#D4AF37" : "#B91C1C"} strokeWidth="0.6" />
                    {/* Right tail */}
                    <path d="M 214 127 L 242 121 L 234 137 L 206 137 L 206 119 Z" fill={outcomePopup.type === "win" ? "#A37F1A" : "#7F1D1D"} stroke={outcomePopup.type === "win" ? "#D4AF37" : "#B91C1C"} strokeWidth="0.6" />

                    {/* Ribbon main body plate */}
                    <path d="M 45 119 Q 130 114 215 119 L 215 140 Q 130 135 45 140 Z" fill={outcomePopup.type === "win" ? "url(#goldRibbon)" : "url(#redRibbon)"} stroke={outcomePopup.type === "win" ? "#FFEAA0" : "#FCA5A5"} strokeWidth="1" />
                    
                    {/* Ribbon Text */}
                    <text x="130" y="135" textAnchor="middle" font-family="Georgia, Times New Roman, serif" font-weight="900" font-size="13.5" fill={outcomePopup.type === "win" ? "#302002" : "#FFFFFF"} letter-spacing="0.5">
                      {outcomePopup.type === "win" ? "Congratulations!" : "Better Luck Next Time!"}
                    </text>
                  </g>
                </svg>
              </div>

              {/* Sub-Title with Lines */}
              <div className="wg-outcome-v2-subtitle-container">
                <span className="wg-outcome-v2-sub-line" />
                <span className="wg-outcome-v2-subtitle-text">
                  ✦ {outcomePopup.type === "win" ? "YOU WON" : "YOU LOST"} ✦
                </span>
                <span className="wg-outcome-v2-sub-line" />
              </div>

              {/* Amount or Motivation Quote */}
              <div className="wg-outcome-v2-main-result">
                {outcomePopup.type === "win" ? (
                  <strong className="wg-outcome-v2-win-amount">
                    ₹{outcomePopup.amount.toFixed(2)}
                  </strong>
                ) : (
                  <div className="wg-outcome-v2-loss-quote">
                    <p>Keep trying,</p>
                    <p>fortune is just one step away!</p>
                  </div>
                )}
              </div>

              {/* Details Border Box (Winning Details / Game Details) */}
              <div className="wg-outcome-v2-details-container">
                <div className="wg-outcome-v2-details-title-tag">
                  {outcomePopup.type === "win" ? "Winning Details" : "Game Details"}
                </div>
                
                <div className="wg-outcome-v2-details-row">
                  <span className="wg-outcome-v2-details-label">Game</span>
                  <strong className="wg-outcome-v2-details-value">Lottery</strong>
                </div>

                <div className="wg-outcome-v2-details-row">
                  <span className="wg-outcome-v2-details-label">Result</span>
                  <div className="wg-outcome-v2-details-value">
                    <div className="wg-outcome-v2-result-color-row">
                      {outcomePopup.colors?.map((col) => (
                        <span key={col} className={`wg-outcome-v2-color-text ${col}`}>
                          {col.charAt(0).toUpperCase() + col.slice(1)}
                        </span>
                      ))}
                      <span className={`wg-outcome-v2-num-circle ${outcomePopup.colors?.[0] || 'red'}`}>
                        {outcomePopup.number}
                      </span>
                      <span className="wg-outcome-v2-size-text">
                        {outcomePopup.size.charAt(0).toUpperCase() + outcomePopup.size.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="wg-outcome-v2-details-row">
                  <span className="wg-outcome-v2-details-label">Period</span>
                  <strong className="wg-outcome-v2-details-value period-num">
                    {outcomePopup.periodId}
                  </strong>
                </div>
              </div>

              {/* Secondary Balance Box (Win) or Motivation Box (Loss) */}
              <div className="wg-outcome-v2-secondary-box">
                {outcomePopup.type === "win" ? (
                  <div className="wg-outcome-v2-balance-card">
                    <div className="wg-outcome-v2-balance-left">
                      {/* Detailed 3D Stack of Gold Coins SVG */}
                      <svg viewBox="0 0 40 32" width="34" height="28" fill="none">
                        <ellipse cx="12" cy="24" rx="8" ry="3.5" fill="#9E7A1E" />
                        <ellipse cx="12" cy="22" rx="8" ry="3.5" fill="#C69A2B" stroke="#D4AF37" strokeWidth="0.5" />
                        <ellipse cx="12" cy="18" rx="8" ry="3.5" fill="#C69A2B" />
                        <ellipse cx="12" cy="16" rx="8" ry="3.5" fill="#D4AF37" stroke="#FFEAA0" strokeWidth="0.5" />
                        
                        <ellipse cx="28" cy="25" rx="8" ry="3.5" fill="#8A6D1C" />
                        <ellipse cx="28" cy="23" rx="8" ry="3.5" fill="#9E7A1E" stroke="#D4AF37" strokeWidth="0.5" />
                        <ellipse cx="28" cy="19" rx="8" ry="3.5" fill="#C69A2B" />
                        <ellipse cx="28" cy="17" rx="8" ry="3.5" fill="#D4AF37" stroke="#FFEAA0" strokeWidth="0.5" />

                        <ellipse cx="20" cy="20" rx="9" ry="4" fill="#8A6D1C" />
                        <ellipse cx="20" cy="18" rx="9" ry="4" fill="#9E7A1E" stroke="#D4AF37" strokeWidth="0.5" />
                        <ellipse cx="20" cy="14" rx="9" ry="4" fill="#C69A2B" />
                        <ellipse cx="20" cy="12" rx="9" ry="4" fill="#D4AF37" stroke="#FFEAA0" strokeWidth="0.5" />
                        <ellipse cx="20" cy="8" rx="9" ry="4" fill="#E7C66A" stroke="#FFFFFF" strokeWidth="0.5" />
                      </svg>
                      <div className="wg-outcome-v2-balance-text">
                        <span>Your Balance</span>
                        <strong>₹{balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                      </div>
                    </div>
                    {/* Gold arrow in circle */}
                    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#D4AF37" strokeWidth="2.5" style={{ border: '1px solid rgba(212, 175, 55, 0.4)', borderRadius: '50%', padding: '3px' }}>
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </div>
                ) : (
                  <div className="wg-outcome-v2-motivation-card">
                    {/* Bullseye target with dart SVG */}
                    <svg viewBox="0 0 32 32" width="34" height="34" fill="none">
                      <circle cx="16" cy="16" r="14" fill="#FFF" stroke="#B91C1C" strokeWidth="1.5" />
                      <circle cx="16" cy="16" r="10" fill="#EF4444" />
                      <circle cx="16" cy="16" r="7" fill="#FFF" />
                      <circle cx="16" cy="16" r="4" fill="#EF4444" />
                      <circle cx="16" cy="16" r="1.5" fill="#FFF" />
                      <path d="M16 16 L28 4" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
                      <path d="M26 6 L28 4" stroke="#EF4444" strokeWidth="3.5" strokeLinecap="round" />
                      <polygon points="28 4 29 1 26 2" fill="#EF4444" />
                      <polygon points="28 4 25 5 26 8" fill="#EF4444" />
                    </svg>
                    <span className="wg-outcome-v2-motivation-text">
                      Stay consistent, win big soon!
                    </span>
                  </div>
                )}
              </div>

              {/* Action Button (Awesome! / Try Again) */}
              <div className="wg-outcome-v2-action-row">
                <button 
                  type="button"
                  className={`wg-outcome-v2-action-btn ${outcomePopup.type}`}
                  onClick={() => setOutcomePopup(null)}
                >
                  {outcomePopup.type === "win" ? "Awesome!" : "Try Again"}
                </button>
              </div>

              {/* Close Countdown */}
              <div className="wg-outcome-v2-countdown-wrap">
                <svg className="wg-countdown-circle-svg" viewBox="0 0 20 20" style={{ width: "16px", height: "16px", transform: "rotate(-90deg)" }}>
                  <circle cx="10" cy="10" r="8" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="2" />
                  <circle 
                    cx="10" 
                    cy="10" 
                    r="8" 
                    fill="none" 
                    stroke={outcomePopup.type === "win" ? "#d4af37" : "#ef4444"} 
                    strokeWidth="2"
                    strokeDasharray="50.26"
                    strokeDashoffset={(50.26 * (3 - popupCountdown)) / 3}
                    style={{
                      transition: "stroke-dashoffset 1s linear",
                      strokeLinecap: "round"
                    }}
                  />
                </svg>
                <span className="wg-outcome-v2-countdown-text">
                  {popupCountdown} seconds auto close
                </span>
              </div>

              {/* Bottom Brand Logo */}
              <div className="wg-outcome-v2-footer-logo-row">
                <img src="/images/logo-ln.png" style={{ width: "24px", height: "24px", objectFit: "contain", marginRight: "6px" }} alt="LN" />
                <span className="wg-footer-logo-text">LUCKY NOVA</span>
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

        /* V2 Premium Outcome Modal */
        .wg-popup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          animation: fade-in 0.25s ease-out forwards;
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .wg-outcome-card-container {
          perspective: 1000px;
        }

        .wg-outcome-card-v2 {
          width: 360px;
          border-radius: 28px;
          padding: 2.25rem 1.75rem 1.75rem;
          box-sizing: border-box;
          position: relative;
          color: #fff;
          font-family: var(--font-inter, sans-serif);
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          background: rgba(10, 10, 12, 0.85);
          backdrop-filter: blur(20px);
          border: 1px solid;
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
          animation: popup-scaleup 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }

        @keyframes popup-scaleup {
          from {
            transform: scale(0.85) translateY(20px);
            opacity: 0;
          }
          to {
            transform: scale(1) translateY(0);
            opacity: 1;
          }
        }

        .wg-outcome-card-v2.win {
          border-color: rgba(212, 175, 55, 0.35);
          box-shadow: 0 0 35px rgba(212, 175, 55, 0.15), inset 0 0 15px rgba(212, 175, 55, 0.05);
          background: radial-gradient(circle at top center, rgba(212, 175, 55, 0.08) 0%, rgba(10, 10, 12, 0.95) 70%);
        }

        .wg-outcome-card-v2.lose {
          border-color: rgba(185, 28, 28, 0.35);
          box-shadow: 0 0 35px rgba(185, 28, 28, 0.15), inset 0 0 15px rgba(185, 28, 28, 0.05);
          background: radial-gradient(circle at top center, rgba(185, 28, 28, 0.08) 0%, rgba(10, 10, 12, 0.95) 70%);
        }

        .wg-outcome-v2-close-top {
          position: absolute;
          top: 18px;
          right: 18px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: rgba(255, 255, 255, 0.6);
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 0.75rem;
          font-weight: bold;
          transition: all 0.2s ease;
          z-index: 10;
        }
        .wg-outcome-v2-close-top:hover {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
          transform: scale(1.05);
        }

        .wg-outcome-v2-header {
          position: relative;
          width: 100%;
          height: 140px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          margin-bottom: 1.25rem;
        }

        .wg-outcome-v2-header-svg {
          position: absolute;
          width: 280px;
          height: 160px;
          top: -20px;
          z-index: 1;
        }

        /* Subtitle with gold/red divider lines */
        .wg-outcome-v2-subtitle-container {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }

        .wg-outcome-v2-sub-line {
          flex: 1;
          height: 1px;
        }
        .win .wg-outcome-v2-sub-line {
          background: linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.5), transparent);
        }
        .lose .wg-outcome-v2-sub-line {
          background: linear-gradient(90deg, transparent, rgba(185, 28, 28, 0.5), transparent);
        }

        .wg-outcome-v2-subtitle-text {
          font-size: 0.75rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.15em;
        }
        .win .wg-outcome-v2-subtitle-text {
          color: #fcd974;
          text-shadow: 0 0 8px rgba(212, 175, 55, 0.3);
        }
        .lose .wg-outcome-v2-subtitle-text {
          color: #fca5a5;
          text-shadow: 0 0 8px rgba(185, 28, 28, 0.3);
        }

        .wg-outcome-v2-main-result {
          margin: 0.5rem 0 1.25rem;
          min-height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .wg-outcome-v2-win-amount {
          font-size: 3.15rem;
          font-weight: 900;
          background: linear-gradient(180deg, #FFFFFF 15%, #fcd974 60%, #d4af37 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 2px 8px rgba(212, 175, 55, 0.4));
          display: block;
          line-height: 1;
          letter-spacing: -0.02em;
          animation: text-pulse 2s infinite ease-in-out;
        }

        @keyframes text-pulse {
          0%, 100% { filter: drop-shadow(0 2px 8px rgba(212, 175, 55, 0.4)); }
          50% { filter: drop-shadow(0 2px 14px rgba(212, 175, 55, 0.6)); }
        }

        .wg-outcome-v2-loss-quote {
          color: #94a3b8;
          font-size: 0.875rem;
          line-height: 1.5;
          font-weight: 500;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        }
        .wg-outcome-v2-loss-quote p {
          margin: 0;
        }

        /* Glass details container */
        .wg-outcome-v2-details-container {
          width: 100%;
          border-radius: 16px;
          padding: 1.25rem 1.125rem 0.65rem;
          box-sizing: border-box;
          position: relative;
          margin-bottom: 0.875rem;
          text-align: left;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(10px);
          border: 1px solid;
        }
        .win .wg-outcome-v2-details-container {
          border-color: rgba(212, 175, 55, 0.15);
        }
        .lose .wg-outcome-v2-details-container {
          border-color: rgba(185, 28, 28, 0.18);
        }

        .wg-outcome-v2-details-title-tag {
          position: absolute;
          top: -9px;
          left: 18px;
          background: #111115;
          padding: 0 10px;
          font-size: 0.6875rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .win .wg-outcome-v2-details-title-tag { color: #d4af37; }
        .lose .wg-outcome-v2-details-title-tag { color: #fca5a5; }

        .wg-outcome-v2-details-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.55rem 0;
          border-bottom: 1.2px dashed rgba(255, 255, 255, 0.05);
        }
        .wg-outcome-v2-details-row:last-child {
          border-bottom: none;
        }

        .wg-outcome-v2-details-label {
          font-size: 0.75rem;
          color: #8892b0;
        }

        .wg-outcome-v2-details-value {
          font-size: 0.75rem;
          color: #f8fafc;
          font-weight: 700;
        }
        .wg-outcome-v2-details-value.period-num {
          font-variant-numeric: tabular-nums;
          letter-spacing: 0.02em;
          color: #e2e8f0;
        }

        .wg-outcome-v2-result-color-row {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        /* Result pills & badges */
        .wg-outcome-v2-color-text {
          font-weight: 800;
          font-size: 0.75rem;
          padding: 2px 8px;
          border-radius: 4px;
        }
        .wg-outcome-v2-color-text.green { color: #22c55e; background: rgba(34, 197, 94, 0.1); }
        .wg-outcome-v2-color-text.red { color: #ef4444; background: rgba(239, 68, 68, 0.1); }
        .wg-outcome-v2-color-text.violet { color: #c084fc; background: rgba(192, 132, 252, 0.1); }

        .wg-outcome-v2-num-circle {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 0.65rem;
          font-weight: 800;
          color: #fff;
        }
        .wg-outcome-v2-num-circle.green { background-color: #22c55e; }
        .wg-outcome-v2-num-circle.red { background-color: #ef4444; }
        .wg-outcome-v2-num-circle.violet { background-color: #a855f7; }

        .wg-outcome-v2-size-text {
          font-weight: 700;
          font-size: 0.75rem;
          color: #e2e8f0;
          padding: 2px 6px;
          border-radius: 4px;
          background: rgba(255, 255, 255, 0.05);
        }

        .wg-outcome-v2-secondary-box {
          width: 100%;
          margin-bottom: 1.125rem;
        }

        /* Wallet glass card */
        .wg-outcome-v2-balance-card {
          border-radius: 14px;
          padding: 0.65rem 0.875rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(212, 175, 55, 0.15);
        }

        .wg-outcome-v2-balance-left {
          display: flex;
          align-items: center;
          gap: 12px;
          text-align: left;
        }

        .wg-outcome-v2-balance-text span {
          display: block;
          font-size: 0.6875rem;
          color: #d4af37;
          opacity: 0.85;
          font-weight: 600;
        }
        .wg-outcome-v2-balance-text strong {
          display: block;
          font-size: 0.95rem;
          color: #fff;
          font-weight: 800;
          margin-top: 1px;
        }

        /* Loss motivation card */
        .wg-outcome-v2-motivation-card {
          border-radius: 14px;
          padding: 0.65rem 0.875rem;
          display: flex;
          align-items: center;
          gap: 12px;
          text-align: left;
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(185, 28, 28, 0.15);
        }

        .wg-outcome-v2-motivation-text {
          font-size: 0.78rem;
          color: #fca5a5;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        .wg-outcome-v2-action-row {
          width: 100%;
        }

        /* Premium Buttons */
        .wg-outcome-v2-action-btn {
          width: 100%;
          padding: 0.9rem;
          border-radius: 16px;
          font-size: 0.95rem;
          font-weight: 900;
          border: none;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .wg-outcome-v2-action-btn.win {
          background: linear-gradient(180deg, #f4d77d 0%, #d4af37 50%, #b8860b 100%);
          color: #302002;
          box-shadow: 0 4px 15px rgba(212, 175, 55, 0.25);
        }
        .wg-outcome-v2-action-btn.win:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(212, 175, 55, 0.35);
          filter: brightness(1.05);
        }
        .wg-outcome-v2-action-btn.win:active {
          transform: translateY(0);
        }

        .wg-outcome-v2-action-btn.loss {
          background: linear-gradient(180deg, #ef4444 0%, #b91c1c 50%, #7f1d1d 100%);
          color: #fff;
          box-shadow: 0 4px 15px rgba(185, 28, 28, 0.25);
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
        }
        .wg-outcome-v2-action-btn.loss:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(185, 28, 28, 0.35);
          filter: brightness(1.05);
        }
        .wg-outcome-v2-action-btn.loss:active {
          transform: translateY(0);
        }

        /* Auto-close loading indicator */
        .wg-outcome-v2-countdown-wrap {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: 0.875rem;
        }

        .wg-outcome-v2-countdown-text {
          font-size: 0.6875rem;
          color: #64748b;
          font-weight: 600;
          letter-spacing: 0.02em;
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

        .wg-popup-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .wg-outcome-card-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
          animation: popup-scaleup 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          overflow: visible;
        }
        @keyframes popup-scaleup {
          0% { transform: scale(0.7) translateY(40px); opacity: 0; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }

        .wg-outcome-card {
          width: 320px;
          border-radius: 28px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          position: relative;
          text-align: center;
          overflow: visible;
        }
        
        @keyframes card-glow {
          0% { box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7); }
          50% { box-shadow: 0 25px 60px rgba(255, 94, 54, 0.3); }
          100% { box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7); }
        }
        .wg-outcome-card.win {
          background: linear-gradient(135deg, #ff5e36 0%, #ff2d2d 100%) !important;
          animation: card-glow 3s ease-in-out infinite;
        }
        .wg-outcome-card.lose {
          background: linear-gradient(135deg, #475569 0%, #1e293b 100%) !important;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7);
        }

        .wg-outcome-close-btn {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(0, 0, 0, 0.55);
          border: 1.5px solid rgba(255, 255, 255, 0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
          outline: none;
        }
        .wg-outcome-close-btn:hover {
          background: rgba(255, 255, 255, 0.12);
          transform: scale(1.15);
          border-color: rgba(255, 255, 255, 0.6);
        }
        .wg-outcome-close-btn:active {
          transform: scale(0.92);
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
          background: transparent;
        }
        .wg-outcome-header.lose {
          background: transparent;
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
        
        @keyframes wings-pulse {
          0% { filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4)) brightness(1); }
          50% { filter: drop-shadow(0 6px 14px rgba(255,215,0,0.4)) brightness(1.15); }
          100% { filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4)) brightness(1); }
        }
        .wg-outcome-wings.win {
          animation: wings-pulse 2.5s ease-in-out infinite;
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
        
        @keyframes rocket-float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-5px) rotate(1.5deg); }
          100% { transform: translateY(0px) rotate(0deg); }
        }
        
        .wg-outcome-emblem.win {
          background: linear-gradient(135deg, #ffd861 0%, #f5af19 100%);
          animation: rocket-float 3s ease-in-out infinite;
        }
        .wg-outcome-emblem.lose {
          background: linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%);
          animation: rocket-float 3.5s ease-in-out infinite;
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
          color: rgba(255, 255, 255, 0.7);
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
        .wg-outcome-badge.number { background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.25); }
        .wg-outcome-badge.size { background: rgba(255,255,255,0.15); color: #ffffff; border: 1px solid rgba(255,255,255,0.25); }

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
          color: rgba(255, 255, 255, 0.8);
        }
        .wg-outcome-timer-circle {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          border: 2px solid #ffffff;
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
