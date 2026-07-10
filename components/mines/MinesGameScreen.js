"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import BottomNav from "@/components/home/BottomNav";
import BrandLogo from "@/components/brand/BrandLogo";
import { usePlatformStatus } from "@/components/platform/PlatformStatusProvider";
import MinesRulesModal from "@/components/mines/MinesRulesModal";
import { getToken } from "@/lib/auth";
import { getMinesConfig } from "@/lib/platformApi";
import { getBalance } from "@/lib/walletApi";
import { getSocket } from "@/lib/socket";
import {
  getActiveGame,
  startGame,
  revealTile,
  cashOut,
  getMyBets,
} from "@/lib/minesApi";
import {
  BASE_AMOUNTS,
  MINE_COUNTS,
  GRID_SIZE,
  DEFAULT_BET_LIMITS,
  DEFAULT_HOUSE_EDGE,
  formatBaseLabel,
  formatMultiplier,
  formatBetPnL,
  getNextMultiplier,
  normalizeGame,
} from "@/lib/minesUtils";

const HISTORY_TABS = [
  { id: "game", label: "My rounds" },
  { id: "stats", label: "Stats" },
];

export default function MinesGameScreen() {
  const router = useRouter();
  const { maintenanceMode, message: maintenanceMessage, blocksAction } = usePlatformStatus();

  const [balance, setBalance] = useState(0);
  const [game, setGame] = useState(null);
  const [myBets, setMyBets] = useState([]);
  const [historyTab, setHistoryTab] = useState("game");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [lastHitTile, setLastHitTile] = useState(null);

  const [betAmount, setBetAmount] = useState(10);
  const [mineCount, setMineCount] = useState(5);
  const [availableMineCounts, setAvailableMineCounts] = useState(MINE_COUNTS);
  const [betLimits, setBetLimits] = useState(DEFAULT_BET_LIMITS);
  const [houseEdge, setHouseEdge] = useState(DEFAULT_HOUSE_EDGE);

  const isPlaying = game?.status === "active";
  const isEnded = game?.status === "won" || game?.status === "lost";
  const bettingLocked = loading || maintenanceMode || blocksAction("bet");
  const revealedSet = useMemo(() => new Set(game?.revealedTiles || []), [game?.revealedTiles]);
  const mineSet = useMemo(() => new Set(game?.minePositions || []), [game?.minePositions]);
  const revealedCount = game?.revealedTiles?.length ?? 0;
  const selectedMineCount = isPlaying ? game.mineCount : mineCount;
  const safeTilesTotal = Math.max(0, GRID_SIZE - selectedMineCount);
  const safeTilesLeft = Math.max(0, safeTilesTotal - revealedCount);
  const nextSafeChance = Math.max(
    0,
    Math.round((safeTilesLeft / Math.max(1, GRID_SIZE - revealedCount)) * 100)
  );
  const riskLabel =
    selectedMineCount >= 15 ? "High risk" : selectedMineCount >= 10 ? "Medium risk" : "Low risk";

  const currentMultiplier = game?.currentMultiplier ?? 1;
  const potentialWin = isPlaying ? betAmount * currentMultiplier : 0;
  const nextMultiplier = isPlaying
    ? getNextMultiplier(game.revealedTiles.length, game.mineCount, game.gridSize, houseEdge)
    : getNextMultiplier(0, mineCount, GRID_SIZE, houseEdge);

  const stats = useMemo(() => {
    const won = myBets.filter((b) => b.status === "won").length;
    const lost = myBets.filter((b) => b.status === "lost").length;
    const totalWagered = myBets.reduce((sum, b) => sum + Number(b.amount || b.betAmount || 0), 0);
    const totalWon = myBets
      .filter((b) => b.status === "won")
      .reduce((sum, b) => sum + Number(b.winAmount || b.payout || 0), 0);
    return { won, lost, totalWagered, totalWon, rounds: myBets.length };
  }, [myBets]);

  const loadData = useCallback(async () => {
    if (!getToken()) return;
    try {
      const [balanceRes, activeRes, betsRes] = await Promise.all([
        getBalance(),
        getActiveGame().catch(() => ({ data: null })),
        getMyBets({ limit: 30 }),
      ]);
      setBalance(balanceRes.data.balance);
      const activeGame = normalizeGame(activeRes?.data?.game ?? activeRes?.data);
      setGame(activeGame);
      if (activeGame?.status === "active") {
        setBetAmount(activeGame.betAmount);
        setMineCount(activeGame.mineCount);
      }
      setMyBets(betsRes.data?.bets || betsRes.data || []);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load game");
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    if (!getToken()) {
      router.replace("/login");
      return undefined;
    }

    loadData();

    getMinesConfig()
      .then((res) => {
        if (res?.data?.minBetAmount != null || res?.data?.maxBetAmount != null) {
          setBetLimits({
            minBetAmount: Number(res.data.minBetAmount) || DEFAULT_BET_LIMITS.minBetAmount,
            maxBetAmount: Number(res.data.maxBetAmount) || DEFAULT_BET_LIMITS.maxBetAmount,
          });
        }
        if (res?.data?.houseEdge != null) {
          setHouseEdge(Number(res.data.houseEdge));
        }
        if (Array.isArray(res?.data?.mineCounts) && res.data.mineCounts.length) {
          const nextMineCounts = res.data.mineCounts
            .map((count) => Number(count))
            .filter((count) => Number.isInteger(count) && count > 0 && count < GRID_SIZE);
          if (nextMineCounts.length) {
            setAvailableMineCounts(nextMineCounts);
            setMineCount((current) =>
              nextMineCounts.includes(current) ? current : nextMineCounts[0]
            );
          }
        }
      })
      .catch(() => {});

    let activeSocket = null;
    let cancelled = false;

    getSocket().then((socket) => {
      if (!socket || cancelled) return;
      activeSocket = socket;
      socket.emit("join:user");
      socket.on("wallet:updated", (data) => setBalance(data.balance));
      socket.on("mines:updated", loadData);
    });

    return () => {
      cancelled = true;
      if (activeSocket) {
        activeSocket.off("wallet:updated");
        activeSocket.off("mines:updated", loadData);
      }
    };
  }, [loadData, router]);

  const getErrorMessage = (err, fallback) => {
    const msg = err.response?.data?.message || fallback;
    if (/replica set|mongos|Transaction numbers/i.test(msg)) {
      return "Action could not be processed. Please try again.";
    }
    return msg;
  };

  const handleStart = async () => {
    if (bettingLocked || isPlaying) return;
    if (betAmount < betLimits.minBetAmount || betAmount > betLimits.maxBetAmount) {
      setError(
        `Bet amount must be between ₹${betLimits.minBetAmount} and ₹${betLimits.maxBetAmount.toLocaleString("en-IN")}`
      );
      return;
    }
    if (betAmount > balance) {
      setError("Insufficient balance");
      return;
    }

    setError("");
    setLoading(true);
    setLastHitTile(null);
    try {
      const res = await startGame({
        amount: betAmount,
        mineCount,
        gridSize: GRID_SIZE,
        idempotencyKey: `mines_${Date.now()}`,
      });
      const nextGame = normalizeGame(res?.data?.game ?? res?.data);
      setGame(nextGame);
      if (res?.data?.balance != null) setBalance(res.data.balance);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to start game"));
    } finally {
      setLoading(false);
    }
  };

  const handleReveal = async (tileIndex) => {
    if (!isPlaying || bettingLocked || revealedSet.has(tileIndex)) return;

    setError("");
    setLoading(true);
    try {
      const res = await revealTile(game.id, tileIndex);
      const nextGame = normalizeGame(res?.data?.game ?? res?.data);
      const tileResult = res?.data?.tileResult ?? res?.data?.result;

      if (tileResult === "mine" || nextGame?.status === "lost") {
        setLastHitTile(tileIndex);
      }

      setGame(nextGame);
      if (res?.data?.balance != null) setBalance(res.data.balance);

      if (nextGame?.status === "lost" || nextGame?.status === "won") {
        await loadData();
      }
    } catch (err) {
      setError(getErrorMessage(err, "Failed to reveal tile"));
    } finally {
      setLoading(false);
    }
  };

  const handleCashOut = async () => {
    if (!isPlaying || bettingLocked || game.revealedTiles.length === 0) return;

    setError("");
    setLoading(true);
    try {
      const res = await cashOut(game.id);
      const nextGame = normalizeGame(res?.data?.game ?? res?.data);
      setGame(nextGame);
      if (res?.data?.balance != null) setBalance(res.data.balance);
      await loadData();
    } catch (err) {
      setError(getErrorMessage(err, "Failed to cash out"));
    } finally {
      setLoading(false);
    }
  };

  const handleNewRound = () => {
    setGame(null);
    setLastHitTile(null);
    setError("");
  };

  const handleBetShortcut = (mode) => {
    if (bettingLocked || isPlaying) return;

    setBetAmount((current) => {
      const numericCurrent = Number(current) || betLimits.minBetAmount;
      const availableBalance = Number.isFinite(balance) ? balance : betLimits.maxBetAmount;
      const maxPlayable = Math.min(
        Math.max(availableBalance, betLimits.minBetAmount),
        betLimits.maxBetAmount
      );
      let nextValue = numericCurrent;

      if (mode === "half") nextValue = numericCurrent / 2;
      if (mode === "double") nextValue = numericCurrent * 2;
      if (mode === "max") nextValue = maxPlayable;

      if (nextValue <= 0) nextValue = betLimits.minBetAmount;
      nextValue = Math.min(nextValue, betLimits.maxBetAmount);
      nextValue = Math.max(nextValue, betLimits.minBetAmount);
      return Number(nextValue.toFixed(2));
    });
  };

  const getTileState = (index) => {
    if (!game) return "hidden";
    if (revealedSet.has(index)) {
      if (mineSet.has(index) || (game.status === "lost" && lastHitTile === index)) return "mine";
      return "gem";
    }
    if (isEnded && mineSet.has(index)) return "mine-reveal";
    if (isEnded && !revealedSet.has(index)) return "unrevealed-end";
    return "hidden";
  };

  const renderTileContent = (state) => {
    if (state === "gem") {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "24px", height: "24px", color: "#4ade80", filter: "drop-shadow(0 0 4px rgba(74, 222, 128, 0.5))" }}>
          <path d="M6 3h12l4 6-10 12L2 9z" />
          <path d="M11 3 8 9l4 12" />
          <path d="M13 3l3 6-4 12" />
          <path d="M2 9h20" />
        </svg>
      );
    }
    if (state === "mine" || state === "mine-reveal") {
      const isHit = state === "mine";
      return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: "24px", height: "24px", color: isHit ? "#ef4444" : "#fbbf24", filter: isHit ? "drop-shadow(0 0 8px rgba(239, 68, 68, 0.6))" : "none" }}>
          <circle cx="12" cy="13" r="7" />
          <path d="M12 6V3" />
          <path d="M19 6l-2 2" />
          <path d="M22 13h-3" />
          <path d="M19 20l-2-2" />
          <path d="M12 20v3" />
          <path d="M5 20l2-2" />
          <path d="M2 13h3" />
          <path d="M5 6l2 2" />
          <path d="M17 3c1-0.5 2.5 0 3 1.5" strokeWidth="1.5" strokeDasharray="2,2" />
        </svg>
      );
    }
    return "";
  };

  return (
    <main className="mines-game club-app">
      <header className="ms-header">
        <Link href="/" className="ms-back" aria-label="Back to home">
          ‹
        </Link>
        <BrandLogo href="/" size="sm" className="ms-brand-logo" />
        <div className="ms-header-icons">
          <button type="button" title="Rules" onClick={() => setRulesOpen(true)}>
            📋
          </button>
        </div>
      </header>

      <section className="ms-wallet-card">
        <div className="ms-wallet-row">
          <div className="ms-wallet-info">
            <span className="ms-wallet-label">Wallet balance</span>
            <div className="ms-wallet-amount">
              {mounted ? `₹${balance.toFixed(2)}` : "₹0.00"}
            </div>
          </div>
          <div className="ms-wallet-actions">
            <Link href="/wallet" className="ms-btn-withdraw">
              Withdraw
            </Link>
            <Link href="/wallet/deposit" className="ms-btn-deposit">
              Deposit
            </Link>
          </div>
        </div>
      </section>

      {(maintenanceMode || blocksAction("bet")) && (
        <div className="ms-maintenance-notice">
          {maintenanceMessage || "Mines is temporarily unavailable during maintenance."}
        </div>
      )}

      {error && <div className="auth-error ms-msg">{error}</div>}



      <section className="ms-game-panel">
        <div className="ms-panel-top">
          <div className="ms-multiplier-box">
            <span className="ms-multiplier-label">Multiplier</span>
            <strong className="ms-multiplier-value">{formatMultiplier(currentMultiplier)}</strong>
            {isPlaying && (
              <span className="ms-multiplier-next">
                Next: {formatMultiplier(nextMultiplier)}
              </span>
            )}
          </div>
          <div className="ms-win-box">
            <span className="ms-win-label">{isPlaying ? "Potential win" : "Last win"}</span>
            <strong className="ms-win-value">
              ₹{isPlaying ? potentialWin.toFixed(2) : isEnded && game?.payout ? game.payout.toFixed(2) : "0.00"}
            </strong>
          </div>
        </div>

        <div className={`ms-grid ${isPlaying ? "playing" : ""} ${bettingLocked ? "locked" : ""}`}>
          {Array.from({ length: GRID_SIZE }, (_, index) => {
            const state = getTileState(index);
            const isClickable = isPlaying && state === "hidden" && !bettingLocked;
            return (
              <button
                key={index}
                type="button"
                className={`ms-tile ${state}`}
                disabled={!isClickable}
                onClick={() => handleReveal(index)}
                aria-label={`Tile ${index + 1}`}
              >
                <span className="ms-tile-inner">{renderTileContent(state)}</span>
              </button>
            );
          })}
        </div>

        {isEnded && (
          <div className={`ms-result-banner ${game.status}`}>
            {game.status === "won" ? (
              <>
                <span>🎉 Cashed out!</span>
                <strong>+₹{(game.payout ?? betAmount * currentMultiplier).toFixed(2)}</strong>
              </>
            ) : (
              <>
                <span>💥 Mine hit!</span>
                <strong>-₹{game.betAmount.toFixed(2)}</strong>
              </>
            )}
          </div>
        )}
      </section>

      <section className="ms-controls">
        {!isPlaying ? (
          <>
            <div className="ms-control-group">
              <span className="ms-control-label">Bet amount</span>
              <div className="ms-chip-row">
                {BASE_AMOUNTS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`ms-chip ${betAmount === value ? "active" : ""}`}
                    disabled={bettingLocked}
                    onClick={() => setBetAmount(value)}
                  >
                    {formatBaseLabel(value)}
                  </button>
                ))}
              </div>
              <div className="ms-amount-input-row">
                <span>₹</span>
                <input
                  type="number"
                  min={betLimits.minBetAmount}
                  max={betLimits.maxBetAmount}
                  value={betAmount}
                  disabled={bettingLocked}
                  onChange={(e) => setBetAmount(Math.max(0, Number(e.target.value) || 0))}
                  className="ms-amount-input"
                />
              </div>
              <div className="ms-shortcut-row">
                <button type="button" className="ms-shortcut-btn" disabled={bettingLocked} onClick={() => handleBetShortcut("half")}>
                  ½
                </button>
                <button type="button" className="ms-shortcut-btn" disabled={bettingLocked} onClick={() => handleBetShortcut("double")}>
                  2×
                </button>
                <button type="button" className="ms-shortcut-btn" disabled={bettingLocked} onClick={() => handleBetShortcut("max")}>
                  Max
                </button>
              </div>
            </div>

            <div className="ms-control-group">
              <span className="ms-control-label">Mines</span>
              <div className="ms-chip-row">
                {availableMineCounts.map((count) => (
                  <button
                    key={count}
                    type="button"
                    className={`ms-chip ${mineCount === count ? "active" : ""}`}
                    disabled={bettingLocked}
                    onClick={() => setMineCount(count)}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              className="ms-btn-start"
              disabled={bettingLocked}
              onClick={isEnded ? handleNewRound : handleStart}
            >
              {loading ? "Processing..." : isEnded ? "Play again" : `Start · ₹${betAmount.toFixed(2)}`}
            </button>
          </>
        ) : (
          <div className="ms-action-row">
            <button
              type="button"
              className="ms-btn-cashout"
              disabled={bettingLocked || game.revealedTiles.length === 0}
              onClick={handleCashOut}
            >
              {loading ? "Processing..." : `Cash out · ₹${potentialWin.toFixed(2)}`}
            </button>
            <p className="ms-action-hint">
              {game.revealedTiles.length} safe · {game.mineCount} mines hidden
            </p>
          </div>
        )}
      </section>

      <div className="ms-history-tabs">
        {HISTORY_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={`ms-history-tab ${historyTab === tab.id ? "active" : ""}`}
            onClick={() => setHistoryTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <section className="ms-history-panel">
        {historyTab === "game" && (
          <table className="ms-table">
            <thead>
              <tr>
                <th>Round</th>
                <th>Mines</th>
                <th>Stake</th>
                <th>Result</th>
              </tr>
            </thead>
            <tbody>
              {myBets.length === 0 ? (
                <tr>
                  <td colSpan={4} className="ms-empty">
                    No rounds yet
                  </td>
                </tr>
              ) : (
                myBets.map((bet) => {
                  const pnl = formatBetPnL(bet);
                  return (
                    <tr key={bet._id || bet.id}>
                      <td className="ms-round-cell">{(bet._id || bet.id || "").slice(-6)}</td>
                      <td>{bet.mineCount ?? "—"}</td>
                      <td>₹{Number(bet.amount || bet.betAmount || 0).toFixed(2)}</td>
                      <td className={`ms-status-${pnl.className}`}>{pnl.text}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}

        {historyTab === "stats" && (
          <div className="ms-stats-grid">
            <div className="ms-stat-card">
              <span>Rounds</span>
              <strong>{stats.rounds}</strong>
            </div>
            <div className="ms-stat-card">
              <span>Won</span>
              <strong className="won">{stats.won}</strong>
            </div>
            <div className="ms-stat-card">
              <span>Lost</span>
              <strong className="lost">{stats.lost}</strong>
            </div>
            <div className="ms-stat-card">
              <span>Wagered</span>
              <strong>₹{stats.totalWagered.toFixed(0)}</strong>
            </div>
            <div className="ms-stat-card wide">
              <span>Total won</span>
              <strong className="won">₹{stats.totalWon.toFixed(2)}</strong>
            </div>
          </div>
        )}
      </section>

      <MinesRulesModal open={rulesOpen} onClose={() => setRulesOpen(false)} betLimits={betLimits} />
      <BottomNav />
    </main>
  );
}
