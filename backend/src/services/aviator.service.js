const Period = require("../models/Period");
const Bet = require("../models/Bet");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const { getIO, sendToUser } = require("./socket.service");
const logger = require("../config/logger");

let flightState = "waiting"; // "waiting" | "flying" | "crashed"
let flightTimer = 5.0; // Wait 5 seconds between rounds
let currentMultiplier = 1.0;
let targetCrashPoint = 1.85;
let currentPeriodId = "";
let tickInterval = null;

const initAviatorGame = () => {
  startWaitingState();
  logger.info("Aviator game loops successfully initialized.");
};

const generatePeriodId = () => {
  const prefix = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `${prefix}AV${rand}`;
};

const startWaitingState = async () => {
  try {
    flightState = "waiting";
    flightTimer = 5.0;
    currentMultiplier = 1.0;
    currentPeriodId = generatePeriodId();

    const period = new Period({
      game: "aviator",
      periodId: currentPeriodId,
      status: "active",
      startTime: new Date(),
      endTime: new Date(Date.now() + 5000),
    });
    await period.save();

    logger.info(`Aviator round waiting: ${currentPeriodId}`);

    // Wait loop tick
    tickInterval = setInterval(() => {
      flightTimer -= 0.1;
      const io = getIO();
      io.to("aviator").emit("aviator:state", {
        state: "waiting",
        countdown: Math.max(0, flightTimer).toFixed(1),
        periodId: currentPeriodId,
        recent: [],
      });

      if (flightTimer <= 0) {
        clearInterval(tickInterval);
        startFlyingState();
      }
    }, 100);
  } catch (error) {
    logger.error(`Error in Aviator waiting state: ${error.message}`);
  }
};

const startFlyingState = () => {
  flightState = "flying";
  currentMultiplier = 1.0;

  // Calculate target crash point (house edge is approx 3%)
  const isInstantCrash = Math.random() < 0.05; // 5% chance of instant crash at 1.00
  if (isInstantCrash) {
    targetCrashPoint = 1.0;
  } else {
    // Standard crash multiplier distribution: M = 99 / (100 - X)
    const rand = Math.random() * 99;
    targetCrashPoint = Math.max(1.01, parseFloat((99 / (100 - rand)).toFixed(2)));
  }

  logger.info(`Aviator flight started. Crash target set at: ${targetCrashPoint}x`);

  const startTime = Date.now();

  tickInterval = setInterval(async () => {
    const elapsedSeconds = (Date.now() - startTime) / 1000;
    
    // Smooth exponential curve: e.g. M = 1.0007 ^ (ticks)
    currentMultiplier = parseFloat(Math.pow(1.08, elapsedSeconds).toFixed(2));

    const io = getIO();

    if (currentMultiplier >= targetCrashPoint) {
      clearInterval(tickInterval);
      currentMultiplier = targetCrashPoint; // Lock to exact crash value
      startCrashedState();
      return;
    }

    io.to("aviator").emit("aviator:state", {
      state: "flying",
      multiplier: currentMultiplier.toFixed(2),
      periodId: currentPeriodId,
    });
  }, 100);
};

const startCrashedState = async () => {
  try {
    flightState = "crashed";
    flightTimer = 3.0;

    logger.info(`Aviator flight crashed at: ${currentMultiplier}x`);

    // Update round outcomes
    await Period.findOneAndUpdate(
      { periodId: currentPeriodId },
      {
        status: "completed",
        result: { crashPoint: currentMultiplier },
        endTime: new Date(),
      }
    );

    // Settle all remaining bets as lost
    await Bet.updateMany(
      { game: "aviator", periodId: currentPeriodId, state: "pending" },
      { state: "lost", winAmount: 0 }
    );

    const io = getIO();

    tickInterval = setInterval(() => {
      flightTimer -= 0.1;
      io.to("aviator").emit("aviator:state", {
        state: "crashed",
        multiplier: currentMultiplier.toFixed(2),
        countdown: Math.max(0, flightTimer).toFixed(1),
        periodId: currentPeriodId,
      });

      if (flightTimer <= 0) {
        clearInterval(tickInterval);
        startWaitingState();
      }
    }, 100);
  } catch (error) {
    logger.error(`Error in Aviator crashed state: ${error.message}`);
  }
};

const handleCashout = async (userId, betId, claimedMultiplier) => {
  // Prevent duplicate cashouts or invalid status updates
  if (flightState !== "flying") {
    throw new Error("Bets can only be cashed out during active flight states.");
  }

  // Allow a small latency buffer (0.10x) for network sync
  if (claimedMultiplier > currentMultiplier + 0.1) {
    throw new Error("Client latency mismatch. Multiplier values out of bounds.");
  }

  const bet = await Bet.findOne({ _id: betId, user: userId, state: "pending" });
  if (!bet) {
    throw new Error("Active flight bet not found or already settled.");
  }

  const wallet = await Wallet.findOne({ user: userId });
  if (!wallet) {
    throw new Error("Wallet not found.");
  }

  const winAmount = bet.amount * claimedMultiplier;
  const prevBalance = wallet.balance;

  wallet.balance += winAmount;
  await wallet.save();

  // Log txn ledger
  const txn = new Transaction({
    user: userId,
    type: "game_win",
    amount: winAmount,
    direction: "credit",
    prevBalance,
    postBalance: wallet.balance,
    refId: bet._id,
    description: `Aviator Cashout at ${claimedMultiplier}x`,
  });
  await txn.save();

  bet.state = "won";
  bet.winAmount = winAmount;
  bet.payoutRatio = claimedMultiplier;
  await bet.save();

  // Push balance adjustments to player
  sendToUser(userId, "wallet:balance", {
    balance: wallet.balance,
    commissionBalance: wallet.commissionBalance,
  });

  return { winAmount, multiplier: claimedMultiplier };
};

const getFlightState = () => ({
  state: flightState,
  multiplier: currentMultiplier,
  periodId: currentPeriodId,
});

module.exports = { initAviatorGame, handleCashout, getFlightState };
