const Period = require("../models/Period");
const Bet = require("../models/Bet");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const { getIO, sendToUser } = require("./socket.service");
const logger = require("../config/logger");

const DURATIONS = ["1m", "3m", "5m", "10m"];
const DURATION_SEC = { "1m": 60, "3m": 180, "5m": 300, "10m": 600 };

const timers = {};
const activePeriods = {};

const initK3Game = async () => {
  for (const duration of DURATIONS) {
    timers[duration] = DURATION_SEC[duration];
    activePeriods[duration] = await getOrCreateActivePeriod(duration);
  }
  setInterval(tickK3, 1000);
  logger.info("K3 game loops successfully initialized.");
};

const getOrCreateActivePeriod = async (duration) => {
  const now = new Date();
  let period = await Period.findOne({
    game: "k3",
    duration,
    status: "active",
  });

  if (!period) {
    const periodId = generatePeriodId(duration);
    period = new Period({
      game: "k3",
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
  const startOfTodayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const secondsSinceMidnight = Math.floor((now.getTime() - startOfTodayUTC.getTime()) / 1000);

  const sec = DURATION_SEC[duration] || 60;
  const roundIndex = Math.floor(secondsSinceMidnight / sec) + 1;

  const dateStr = startOfTodayUTC.toISOString().slice(0, 10).replace(/-/g, ""); // YYYYMMDD
  // Use different duration codes (81, 83, 85, 90) for K3 to prevent E11000 duplicate key with Wingo (01, 03, 05, 10)
  const durationCode = duration === "1m" ? "81" : duration === "3m" ? "83" : duration === "5m" ? "85" : "90";
  const roundStr = String(roundIndex).padStart(4, "0");

  return `${dateStr}${durationCode}${roundStr}`;
};

const getRemainingSeconds = (duration) => {
  const now = new Date();
  const startOfTodayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const secondsSinceMidnight = Math.floor((now.getTime() - startOfTodayUTC.getTime()) / 1000);
  const sec = DURATION_SEC[duration] || 60;
  const rem = sec - (secondsSinceMidnight % sec);
  return rem === sec ? 0 : rem; // If exactly on boundary, it's 0. But wait, Wingo uses `sec - (secondsSinceMidnight % sec)`. If it's sec, it's the start. Let's just return sec - (secondsSinceMidnight % sec).
};

const tickK3 = async () => {
  const io = getIO();
  for (const duration of DURATIONS) {
    const now = new Date();
    const startOfTodayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const secondsSinceMidnight = Math.floor((now.getTime() - startOfTodayUTC.getTime()) / 1000);
    const sec = DURATION_SEC[duration] || 60;
    const rem = sec - (secondsSinceMidnight % sec);
    
    timers[duration] = rem;
    const currentAbsolutePeriodId = generatePeriodId(duration);

    if (activePeriods[duration] && activePeriods[duration].periodId !== currentAbsolutePeriodId) {
      const completedPeriod = activePeriods[duration];
      activePeriods[duration] = { periodId: currentAbsolutePeriodId }; // Temp lock
      (async () => {
        if (completedPeriod._id) {
           await resolvePeriod(duration, completedPeriod);
        }
        activePeriods[duration] = await getOrCreateActivePeriod(duration);
      })();
    }

    if (activePeriods[duration] && activePeriods[duration]._id) {
      io.to(`k3:${duration}`).emit("k3:tick", {
        duration,
        periodId: activePeriods[duration].periodId,
        remainingSeconds: rem,
      });
    }
  }
};

const K3_MULTIPLIERS = {
  total_3: 207, total_18: 207,
  total_4: 60, total_17: 60,
  total_5: 30, total_16: 30,
  total_6: 18, total_15: 18,
  total_7: 12, total_14: 12,
  total_8: 8, total_13: 8,
  total_9: 6, total_10: 6, total_11: 6, total_12: 6,
  size: 1.96, // Big/Small
  parity: 1.96, // Odd/Even
  "3_same_any": 34,
  "3_same_specific": 207,
  "2_same_specific": 13.8,
  "3_seq_any": 10
};

const generateRandomDice = () => [
  Math.floor(Math.random() * 6) + 1,
  Math.floor(Math.random() * 6) + 1,
  Math.floor(Math.random() * 6) + 1
];

const resolvePeriod = async (duration, period) => {
  try {
    const io = getIO();
    const dbPeriod = await Period.findById(period._id);
    if (!dbPeriod) return;

    const bets = await Bet.find({
      game: "k3",
      periodId: period.periodId,
      state: "pending",
    });

    let dice = generateRandomDice();

    if (dbPeriod.resultOverridden && dbPeriod.overrideResult) {
      // Expecting array e.g. [1, 2, 3] or string "1,2,3"
      if (Array.isArray(dbPeriod.overrideResult) && dbPeriod.overrideResult.length === 3) {
        dice = dbPeriod.overrideResult.map(Number);
      } else if (typeof dbPeriod.overrideResult === "string") {
        dice = dbPeriod.overrideResult.split(",").map(n => Number(n.trim()));
      }
    } else if (bets.length > 0) {
      // 70% House win-rate logic (simple implementation)
      const roll = Math.random();
      if (roll > 0.3) {
        // Try multiple dice rolls to find one that minimizes player payouts
        let bestDice = dice;
        let minPayout = Infinity;
        for (let i = 0; i < 5; i++) {
          const testDice = generateRandomDice();
          let currentPayout = 0;
          for (const b of bets) {
             currentPayout += calculateBetWin(b, testDice).winAmount;
          }
          if (currentPayout < minPayout) {
             minPayout = currentPayout;
             bestDice = testDice;
          }
        }
        dice = bestDice;
      }
    }

    const sum = dice[0] + dice[1] + dice[2];
    const size = (sum >= 11 && sum <= 18) ? "big" : "small";
    const parity = (sum % 2 === 0) ? "even" : "odd";
    const finalResult = { dice, sum, size, parity };

    dbPeriod.status = "completed";
    dbPeriod.result = finalResult;
    await dbPeriod.save();

    logger.info(`K3 period ${dbPeriod.periodId} resolved: ${JSON.stringify(finalResult)}`);

    for (const bet of bets) {
      const { won, winAmount, multiplier } = calculateBetWin(bet, dice);
      
      const tax = bet.amount * 0.02;
      const amountAfterTax = bet.amount - tax;
      const finalWinAmount = won ? (amountAfterTax * multiplier) : 0;

      if (won) {
        const wallet = await Wallet.findOne({ user: bet.user });
        if (wallet) {
          const prevBalance = wallet.balance;
          wallet.balance += finalWinAmount;
          await wallet.save();

          const txn = new Transaction({
            user: bet.user,
            type: "game_win",
            amount: finalWinAmount,
            direction: "credit",
            prevBalance,
            postBalance: wallet.balance,
            refId: bet._id,
            description: `K3 win payout for period ${period.periodId}`,
          });
          await txn.save();

          bet.state = "won";
          bet.winAmount = finalWinAmount;
          bet.payoutRatio = multiplier;
          bet.details = { ...bet.details, tax, amountAfterTax, won: true };
          await bet.save();

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

    io.to(`k3:${duration}`).emit("k3:result", {
      duration,
      periodId: period.periodId,
      result: finalResult,
    });
  } catch (error) {
    logger.error(`Error resolving K3 period: ${error.message}`);
  }
};

const calculateBetWin = (bet, dice) => {
  const { betType, betValue } = bet.details;
  const sum = dice[0] + dice[1] + dice[2];
  
  // Note: Big/Small/Odd/Even usually LOSE if the dice are all the same (e.g. 111, 222)
  const isTriple = dice[0] === dice[1] && dice[1] === dice[2];

  let won = false;
  let multiplier = 0;

  if (betType === "total" && Number(betValue) === sum) {
    won = true;
    multiplier = K3_MULTIPLIERS[`total_${sum}`];
  } else if (betType === "size" && !isTriple) {
    const size = (sum >= 11) ? "big" : "small";
    if (betValue === size) {
      won = true;
      multiplier = K3_MULTIPLIERS.size;
    }
  } else if (betType === "parity" && !isTriple) {
    const parity = (sum % 2 === 0) ? "even" : "odd";
    if (betValue === parity) {
      won = true;
      multiplier = K3_MULTIPLIERS.parity;
    }
  } else if (betType === "3_same_any") {
    if (isTriple) { won = true; multiplier = K3_MULTIPLIERS["3_same_any"]; }
  } else if (betType === "3_same_specific") { // e.g. "111"
    if (isTriple && String(dice[0]).repeat(3) === String(betValue)) {
      won = true;
      multiplier = K3_MULTIPLIERS["3_same_specific"];
    }
  } else if (betType === "2_same_specific") { // e.g. "11"
    const hasPair = (dice[0] === dice[1] && dice[0] === Number(betValue[0])) ||
                    (dice[1] === dice[2] && dice[1] === Number(betValue[0])) ||
                    (dice[0] === dice[2] && dice[0] === Number(betValue[0]));
    if (hasPair) {
      won = true;
      multiplier = K3_MULTIPLIERS["2_same_specific"];
    }
  } else if (betType === "3_seq_any") { // 123, 234, 345, 456
    const sorted = [...dice].sort();
    if (sorted[0] + 1 === sorted[1] && sorted[1] + 1 === sorted[2]) {
      won = true;
      multiplier = K3_MULTIPLIERS["3_seq_any"];
    }
  }

  return { won, multiplier, winAmount: won ? bet.amount * multiplier : 0 };
};

const getTimers = () => timers;
const getActivePeriods = () => activePeriods;

module.exports = { initK3Game, getTimers, getActivePeriods };
