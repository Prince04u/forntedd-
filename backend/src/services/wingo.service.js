const Period = require("../models/Period");
const Bet = require("../models/Bet");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const { getIO, sendToUser } = require("./socket.service");
const logger = require("../config/logger");

const DURATIONS = ["30s", "1m", "3m", "5m"];
const DURATION_SEC = { "30s": 30, "1m": 60, "3m": 180, "5m": 300 };

const timers = {}; // duration -> remainingSeconds
const activePeriods = {}; // duration -> Period object

const initWingoGame = async () => {
  for (const duration of DURATIONS) {
    timers[duration] = DURATION_SEC[duration];
    activePeriods[duration] = await getOrCreateActivePeriod(duration);
  }

  // Start background tick interval
  setInterval(tickWingo, 1000);
  logger.info("WinGo game loops successfully initialized.");
};

const getOrCreateActivePeriod = async (duration) => {
  const now = new Date();
  let period = await Period.findOne({
    game: "wingo",
    duration,
    status: "active",
  });

  if (!period) {
    const periodId = generatePeriodId(duration);
    period = new Period({
      game: "wingo",
      duration,
      periodId,
      status: "active",
      startTime: now,
      endTime: new Date(now.getTime() + DURATION_SEC[duration] * 1000),
    });
    await period.save();
  }

  return period;
};

const generatePeriodId = (duration) => {
  const now = new Date();
  
  // Calculate start of today in UTC to prevent timezone offsets and day drifts
  const startOfTodayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const secondsSinceMidnight = Math.floor((now.getTime() - startOfTodayUTC.getTime()) / 1000);

  const sec = DURATION_SEC[duration] || 30;
  const roundIndex = Math.floor(secondsSinceMidnight / sec) + 1;

  const dateStr = startOfTodayUTC.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
  const durationCode = duration === "30s" ? "30" : duration === "1m" ? "01" : duration === "3m" ? "03" : "05";
  const roundStr = String(roundIndex).padStart(4, "0");

  return `${dateStr}${durationCode}${roundStr}`;

};


const tickWingo = async () => {
  const io = getIO();

  for (const duration of DURATIONS) {
    timers[duration] -= 1;

    // Broadcast countdown ticks
    io.to(`wingo:${duration}`).emit("wingo:tick", {
      duration,
      periodId: activePeriods[duration].periodId,
      remainingSeconds: Math.max(0, timers[duration]),
    });

    if (timers[duration] <= 0) {
      timers[duration] = DURATION_SEC[duration];
      const completedPeriod = activePeriods[duration];
      // Resolve completed period and then create the next one sequentially to prevent database race conditions
      (async () => {
        await resolvePeriod(duration, completedPeriod);
        activePeriods[duration] = await getOrCreateActivePeriod(duration);
      })();
    }
  }
};

const resolvePeriod = async (duration, period) => {
  try {
    const io = getIO();

    // Reload latest period document from MongoDB to pick up admin overrides
    const dbPeriod = await Period.findById(period._id);
    if (!dbPeriod) return;

    // Determine final number result
    let number = Math.floor(Math.random() * 10);
    if (dbPeriod.resultOverridden && dbPeriod.overrideResult !== null && dbPeriod.overrideResult !== undefined) {
      number = Number(dbPeriod.overrideResult);
    }

    // Set colors & sizes
    let colors = [];
    if (number === 0) colors = ["red", "violet"];
    else if (number === 5) colors = ["green", "violet"];
    else if ([1, 3, 7, 9].includes(number)) colors = ["green"];
    else colors = ["red"];

    const size = number <= 4 ? "small" : "big";

    const finalResult = { number, colors, size };

    dbPeriod.status = "completed";
    dbPeriod.result = finalResult;
    await dbPeriod.save();

    logger.info(`Wingo period ${dbPeriod.periodId} resolved: ${JSON.stringify(finalResult)}`);

    // Settle bets placed on this round
    const bets = await Bet.find({
      game: "wingo",
      periodId: period.periodId,
      state: "pending",
    });

    for (const bet of bets) {
      const { betType, betValue } = bet.details;
      let won = false;
      let multiplier = 0;

      if (betType === "number" && Number(betValue) === number) {
        won = true;
        multiplier = 9.0; // 9x payout for direct numbers
      } else if (betType === "big_small" && betValue === size) {
        won = true;
        multiplier = 1.98; // 2x payout minus house edge
      } else if (betType === "color") {
        if (colors.includes(betValue)) {
          won = true;
          if (betValue === "violet") {
            multiplier = 4.5; // 4.5x payout for violet
          } else if (colors.includes("violet")) {
            multiplier = 1.5; // half payout if violet overlaps
          } else {
            multiplier = 1.98; // standard red/green payout
          }
        }
      }

      const tax = bet.amount * 0.02;
      const amountAfterTax = bet.amount - tax;

      if (won) {
        const winAmount = amountAfterTax * multiplier;
        const wallet = await Wallet.findOne({ user: bet.user });

        if (wallet) {
          const prevBalance = wallet.balance;
          wallet.balance += winAmount;
          await wallet.save();

          // Ledger txn log
          const txn = new Transaction({
            user: bet.user,
            type: "game_win",
            amount: winAmount,
            direction: "credit",
            prevBalance,
            postBalance: wallet.balance,
            refId: bet._id,
            description: `Wingo win payout for period ${period.periodId}`,
          });
          await txn.save();

          bet.state = "won";
          bet.winAmount = winAmount;
          bet.payoutRatio = multiplier;
          bet.details = { ...bet.details, tax, amountAfterTax, won: true };
          await bet.save();

          // Push balance adjustments to player
          sendToUser(bet.user, "wallet:balance", {
            balance: wallet.balance,
            commissionBalance: wallet.commissionBalance,
          });
        }
      } else {
        bet.state = "lost";
        bet.winAmount = 0;
        bet.details = { ...bet.details, tax, amountAfterTax, won: false };
        await bet.save();
      }
    }

    // Broadcast results update
    io.to(`wingo:${duration}`).emit("wingo:result", {
      duration,
      periodId: period.periodId,
      result: finalResult,
    });
  } catch (error) {
    logger.error(`Error resolving Wingo period: ${error.message}`);
  }
};

const getTimers = () => timers;
const getActivePeriods = () => activePeriods;

module.exports = { initWingoGame, getTimers, getActivePeriods };
