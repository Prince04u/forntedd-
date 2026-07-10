export const GRID_SIZE = 25;
export const GRID_COLS = 5;

export const MINE_COUNTS = [3, 5, 10, 15, 20];
export const BASE_AMOUNTS = [1, 10, 100, 1000];

export const DEFAULT_BET_LIMITS = { minBetAmount: 1, maxBetAmount: 100000 };
export const DEFAULT_HOUSE_EDGE = 0.01;

export const formatMultiplier = (value) => {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return "1.00x";
  return `${num.toFixed(2)}x`;
};

export const formatBaseLabel = (value) => (value >= 1000 ? `${value / 1000}K` : String(value));

/**
 * Standard mines multiplier: product of (remaining safe / remaining tiles) per reveal.
 * Used for next-multiplier preview when the server does not supply it.
 */
export const calculateMultiplier = (
  revealedCount,
  mineCount,
  gridSize = GRID_SIZE,
  houseEdge = DEFAULT_HOUSE_EDGE
) => {
  if (revealedCount <= 0) return 1;
  const safeTiles = gridSize - mineCount;
  if (safeTiles <= 0) return 1;

  let multiplier = 1;
  for (let i = 0; i < revealedCount; i += 1) {
    const remainingTiles = gridSize - i;
    const remainingSafe = safeTiles - i;
    if (remainingSafe <= 0 || remainingTiles <= 0) break;
    multiplier *= remainingTiles / remainingSafe;
  }

  return Math.max(1, multiplier * (1 - houseEdge));
};

export const getNextMultiplier = (revealedCount, mineCount, gridSize = GRID_SIZE, houseEdge = DEFAULT_HOUSE_EDGE) =>
  calculateMultiplier(revealedCount + 1, mineCount, gridSize, houseEdge);

export const formatBetPnL = (bet) => {
  const state = bet.state ?? bet.status ?? "pending";
  if (state === "won") {
    const win = bet.winAmount ?? bet.payout ?? 0;
    return { text: `+₹${Number(win).toFixed(2)}`, className: "won" };
  }
  if (state === "lost") {
    return { text: `-₹${Number(bet.amount || bet.betAmount || 0).toFixed(2)}`, className: "lost" };
  }
  if (state === "refunded") {
    return { text: "Refunded", className: "refunded" };
  }
  return { text: "—", className: "pending" };
};

export const getGameId = (game) => game?._id || game?.id || game?.gameId || null;

export const normalizeGame = (raw) => {
  if (!raw) return null;
  return {
    id: getGameId(raw),
    betAmount: Number(raw.betAmount ?? raw.amount ?? 0),
    mineCount: Number(raw.mineCount ?? raw.mines ?? 3),
    gridSize: Number(raw.gridSize ?? GRID_SIZE),
    revealedTiles: Array.isArray(raw.revealedTiles) ? raw.revealedTiles : [],
    minePositions: Array.isArray(raw.minePositions) ? raw.minePositions : [],
    currentMultiplier: Number(raw.currentMultiplier ?? raw.multiplier ?? 1),
    status: raw.status || "active",
    payout: raw.payout != null ? Number(raw.payout) : null,
  };
};
