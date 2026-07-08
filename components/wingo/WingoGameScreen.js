"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getToken } from "@/lib/auth";
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
  const totalAmount = baseAmount * quantity;
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
        getRecentResults(duration, 20),
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

    const onTimer = (data) => {
      if (String(data.duration) === String(durationSec)) {
        setPeriod((prev) => ({
          ...prev,
          periodId: data.periodId,
          status: data.status,
          remainingSeconds: data.remainingSeconds,
        }));
      }
    };

    getSocket().then((socket) => {
      if (!socket || cancelled) return;

      activeSocket = socket;
      socket.emit("join:duration", { duration: durationSec });
      socket.emit("join:user");
      socket.on("timer:update", onTimer);
      socket.on("period:created", loadData);
      socket.on("result:declared", loadData);
      socket.on("wallet:updated", (data) => setBalance(data.balance));
    });

    return () => {
      cancelled = true;
      if (activeSocket) {
        activeSocket.off("timer:update", onTimer);
        activeSocket.off("period:created", loadData);
        activeSocket.off("result:declared", loadData);
        activeSocket.off("wallet:updated");
      }
    };
  }, [duration, loadData, router]);

  useEffect(() => {
    if (showCountdownOverlay && betSheet) {
      setBetSheet(null);
    }
  }, [showCountdownOverlay, betSheet]);

  const setBetQuantity = (value) => {
    const next = Math.max(1, Number(value) || 1);
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
            <span className="wg-wallet-label">Wallet balance</span>
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
              {results.map((r) => (
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
        )}

        {historyTab === "chart" && (
          <div className="wg-chart">
            {results.slice(0, 20).map((r) => (
              <span key={r.periodId} className={`wg-chart-ball ${colorClass(r.resultNumber)}`}>
                {r.resultNumber}
              </span>
            ))}
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
                myBetsForDuration.map((bet) => (
                  <tr key={bet._id}>
                    <td className="wg-period-cell">{bet.periodId?.slice(-8)}</td>
                    <td>
                      <span className={`wg-my-bet-label wg-my-bet-${getBetTheme(bet.betType, bet.betValue)}`}>
                        {formatBetLabel(bet.betType, bet.betValue)}
                      </span>
                    </td>
                    <td>₹{bet.amount}</td>
                    <td className={`wg-status-${bet.status}`}>{bet.status}</td>
                  </tr>
                ))
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
    </main>
  );
}
