const Period = require("../models/Period");
const Bet = require("../models/Bet");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const PlatformConfig = require("../models/PlatformConfig");
const wingoService = require("../services/wingo.service");
const aviatorService = require("../services/aviator.service");
const { sendToUser } = require("../services/socket.service");
const logger = require("../config/logger");

// ==========================================
// WINGO GAME LOGIC
// ==========================================

const getCurrentPeriod = async (req, res, next) => {
  try {
    const { duration } = req.params;
    const timers = wingoService.getTimers();
    const periods = wingoService.getActivePeriods();

    if (!timers[duration] || !periods[duration]) {
      return res.status(400).json({ message: "Invalid game duration requested." });
    }

    const currentPeriodId = periods[duration].periodId;

    // Fetch active bets for this specific period
    const activeBets = await Bet.find({
      game: "wingo",
      periodId: currentPeriodId,
      state: "pending",
    });

    const roundAmount = activeBets.reduce((sum, b) => sum + b.amount, 0);
    const roundPlayers = new Set(activeBets.map(b => String(b.user))).size;

    return res.json({
      success: true,
      data: {
        periodId: currentPeriodId,
        remainingSeconds: timers[duration],
        activeStakes: {
          totalBetsCount: activeBets.length,
          totalAmountBetted: roundAmount,
          uniquePlayersCount: roundPlayers,
        }
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getRecentResults = async (req, res, next) => {
  try {
    const { duration } = req.params;
    const limit = Number(req.query.limit || 10);

    const list = await Period.find({
      game: "wingo",
      duration,
      status: "completed",
    })
      .sort({ createdAt: -1 })
      .limit(limit);

    const formatted = list.map((p) => ({
      periodId: p.periodId,
      number: p.result.number,
      resultNumber: p.result.number,
      colors: p.result.colors,
      size: p.result.size,
    }));

    return res.json({ success: true, data: formatted });
  } catch (error) {
    return next(error);
  }
};

const placeWingoBet = async (req, res, next) => {
  try {
    const { duration } = req.params;
    const { betType, betValue, amount } = req.body;

    if (!betType || betValue === undefined || !amount) {
      return res.status(400).json({ message: "Missing bet placement details." });
    }

    const periods = wingoService.getActivePeriods();
    const activePeriod = periods[duration];
    if (!activePeriod) {
      return res.status(400).json({ message: "Wingo game duration currently closed." });
    }

    const config = await PlatformConfig.findOne() || new PlatformConfig();
    const wingoLimits = config.wingoConfig || { minBet: 10, maxBet: 50000 };

    if (amount < wingoLimits.minBet || amount > wingoLimits.maxBet) {
      return res.status(400).json({
        message: `Bet must be between ₹${wingoLimits.minBet} and ₹${wingoLimits.maxBet}.`,
      });
    }

    const wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet || wallet.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance to place bet." });
    }

    // Deduct balance
    const prevBalance = wallet.balance;
    wallet.balance -= amount;
    await wallet.save();

    const bet = new Bet({
      user: req.user._id,
      game: "wingo",
      periodId: activePeriod.periodId,
      amount,
      state: "pending",
      details: { betType, betValue, duration },
    });
    await bet.save();

    // Log txn
    const txn = new Transaction({
      user: req.user._id,
      type: "game_bet",
      amount,
      direction: "debit",
      prevBalance,
      postBalance: wallet.balance,
      refId: bet._id,
      description: `Wingo ${duration} bet placed on ${betType}:${betValue} for period ${activePeriod.periodId}`,
    });
    await txn.save();

    logger.info(`Bet placed on Wingo ${duration} by ${req.user.mobile} (Amount: ₹${amount})`);

    // Emit updated balance to player
    sendToUser(req.user._id, "wallet:balance", {
      balance: wallet.balance,
      commissionBalance: wallet.commissionBalance,
    });

    return res.status(201).json({
      success: true,
      message: "Bet placed successfully.",
      data: bet,
    });
  } catch (error) {
    return next(error);
  }
};

const getWingoBets = async (req, res, next) => {
  try {
    const list = await Bet.find({ user: req.user._id, game: "wingo" })
      .sort({ createdAt: -1 })
      .limit(30);

    const formatted = await Promise.all(
      list.map(async (bet) => {
        const periodObj = await Period.findOne({ game: "wingo", periodId: bet.periodId });
        const durationStr = bet.details ? bet.details.duration : "30s";
        const durationMap = { "30s": 30, "1m": 60, "3m": 180, "5m": 300 };
        const durationSecs = durationMap[durationStr] || 30;

        return {
          _id: bet._id,
          periodId: bet.periodId,
          amount: bet.amount,
          winAmount: bet.winAmount,
          payoutRatio: bet.payoutRatio,
          state: bet.state,
          status: bet.state, // Map status to state for frontend compatibility
          details: bet.details,
          createdAt: bet.createdAt,
          resultNumber: periodObj && periodObj.result ? periodObj.result.number : null,
          betType: bet.details ? bet.details.betType : "",
          betValue: bet.details ? bet.details.betValue : "",
          duration: durationSecs,
          tax: bet.details && bet.details.tax !== undefined ? bet.details.tax : bet.amount * 0.02,
          amountAfterTax: bet.details && bet.details.amountAfterTax !== undefined ? bet.details.amountAfterTax : bet.amount * 0.98,
          orderNumber: `WG${bet.periodId}${String(bet._id).slice(-8)}`.toUpperCase(),
          resultColors: periodObj && periodObj.result ? periodObj.result.colors : [],
          resultSize: periodObj && periodObj.result ? periodObj.result.size : "",
        };
      })
    );

    return res.json({ success: true, data: { bets: formatted } });
  } catch (error) {
    return next(error);
  }
};

// ==========================================
// MINES GAME LOGIC
// ==========================================

const getActiveMinesGame = async (req, res, next) => {
  try {
    const game = await Bet.findOne({
      user: req.user._id,
      game: "mines",
      state: "pending",
    });

    if (!game) {
      return res.json({ success: true, data: null });
    }

    // Return game state safe metadata (DO NOT reveal secret minePositions)
    return res.json({
      success: true,
      data: {
        id: game._id,
        betAmount: game.amount,
        mineCount: game.details.minesCount,
        revealedTiles: game.details.revealedTiles,
        currentMultiplier: game.payoutRatio,
        status: "active",
      },
    });
  } catch (error) {
    return next(error);
  }
};

const startMinesGame = async (req, res, next) => {
  try {
    const reqMinesCount = req.body.minesCount !== undefined ? req.body.minesCount : req.body.mineCount;
    const reqAmount = req.body.betAmount !== undefined ? req.body.betAmount : req.body.amount;
    const betAmount = Number(reqAmount);
    const minesCount = Number(reqMinesCount);

    if (!betAmount || isNaN(minesCount)) {
      return res.status(400).json({ message: "Bet amount and mines count are required." });
    }

    if (minesCount < 1 || minesCount > 24) {
      return res.status(400).json({ message: "Mines count must be between 1 and 24." });
    }

    const config = await PlatformConfig.findOne() || new PlatformConfig();
    const minesLimits = config.minesConfig || { minBet: 10, maxBet: 20000 };

    if (betAmount < minesLimits.minBet || betAmount > minesLimits.maxBet) {
      return res.status(400).json({
        message: `Bet must be between ₹${minesLimits.minBet} and ₹${minesLimits.maxBet}.`,
      });
    }

    const activeGame = await Bet.findOne({ user: req.user._id, game: "mines", state: "pending" });
    if (activeGame) {
      return res.status(400).json({ message: "Finish your active Mines round before playing a new one." });
    }

    const wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet || wallet.balance < betAmount) {
      return res.status(400).json({ message: "Insufficient balance to start game." });
    }

    // Deduct balance
    const prevBalance = wallet.balance;
    wallet.balance -= betAmount;
    await wallet.save();

    // Randomize mine positions secretly (25 tiles: indexes 0-24)
    const minesPositions = [];
    while (minesPositions.length < Number(minesCount)) {
      const idx = Math.floor(Math.random() * 25);
      if (!minesPositions.includes(idx)) {
        minesPositions.push(idx);
      }
    }

    const game = new Bet({
      user: req.user._id,
      game: "mines",
      amount: betAmount,
      state: "pending",
      payoutRatio: 1.0,
      details: {
        minesCount: Number(minesCount),
        minePositions: minesPositions,
        revealedTiles: [],
      },
    });
    await game.save();

    // Log txn
    const txn = new Transaction({
      user: req.user._id,
      type: "game_bet",
      amount: betAmount,
      direction: "debit",
      prevBalance,
      postBalance: wallet.balance,
      refId: game._id,
      description: `Mines game started with ${minesCount} mines.`,
    });
    await txn.save();

    logger.info(`Mines game started by ${req.user.mobile} with ${minesCount} mines.`);

    sendToUser(req.user._id, "wallet:balance", {
      balance: wallet.balance,
      commissionBalance: wallet.commissionBalance,
    });

    return res.status(201).json({
      success: true,
      data: {
        id: game._id,
        betAmount: game.amount,
        mineCount: Number(minesCount),
        revealedTiles: [],
        currentMultiplier: 1.0,
        status: "active",
      },
    });
  } catch (error) {
    return next(error);
  }
};

const revealMinesTile = async (req, res, next) => {
  try {
    const { gameId, tileIndex } = req.body;

    if (tileIndex === undefined || tileIndex < 0 || tileIndex > 24) {
      return res.status(400).json({ message: "Valid tile index (0-24) required." });
    }

    const game = await Bet.findOne({ _id: gameId, user: req.user._id, game: "mines", state: "pending" });
    if (!game) {
      return res.status(404).json({ message: "Active Mines game not found." });
    }

    const { minePositions, revealedTiles } = game.details;

    if (revealedTiles.includes(tileIndex)) {
      return res.status(400).json({ message: "Tile already revealed." });
    }

    // Enforce 30% win and 70% loss chances
    const shouldLose = Math.random() < 0.70;
    if (shouldLose && !minePositions.includes(tileIndex)) {
      const unusedMineIdx = minePositions.findIndex(idx => !revealedTiles.includes(idx) && idx !== tileIndex);
      if (unusedMineIdx !== -1) {
        minePositions[unusedMineIdx] = tileIndex;
        game.markModified("details");
      }
    }

    // Check hit mine -> Game Over
    if (minePositions.includes(tileIndex)) {
      game.state = "lost";
      game.winAmount = 0;
      game.payoutRatio = 0;
      await game.save();

      logger.info(`Mines hit! Player ${req.user.mobile} lost game ID ${game._id}`);

      return res.json({
        success: true,
        data: {
          id: game._id,
          status: "lost",
          minePositions, // Reveal all mines upon loss
          revealedTiles: [...revealedTiles, tileIndex],
          payout: 0,
        },
      });
    }

    // Gem revealed
    const nextRevealed = [...revealedTiles, tileIndex];
    
    // Calculate new multiplier step
    const safeTiles = 25 - game.details.minesCount;
    let multiplier = 1;
    for (let i = 0; i < nextRevealed.length; i += 1) {
      const remainingTiles = 25 - i;
      const remainingSafe = safeTiles - i;
      if (remainingSafe <= 0) break;
      multiplier *= remainingTiles / remainingSafe;
    }
    const finalMultiplier = parseFloat((multiplier * 0.98).toFixed(2)); // Apply 2% house edge

    game.details.revealedTiles = nextRevealed;
    game.payoutRatio = finalMultiplier;
    game.markModified("details");
    await game.save();

    return res.json({
      success: true,
      data: {
        id: game._id,
        status: "active",
        revealedTiles: nextRevealed,
        currentMultiplier: finalMultiplier,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const cashOutMines = async (req, res, next) => {
  try {
    const { gameId } = req.body;
    const game = await Bet.findOne({ _id: gameId, user: req.user._id, game: "mines", state: "pending" });

    if (!game) {
      return res.status(404).json({ message: "Active Mines game not found." });
    }

    if (!game.details.revealedTiles.length) {
      return res.status(400).json({ message: "Reveal at least one gem before cashing out." });
    }

    const winAmount = parseFloat((game.amount * game.payoutRatio).toFixed(2));
    const wallet = await Wallet.findOne({ user: req.user._id });

    if (wallet) {
      const prevBalance = wallet.balance;
      wallet.balance += winAmount;
      await wallet.save();

      // Ledgertxn
      const txn = new Transaction({
        user: req.user._id,
        type: "game_win",
        amount: winAmount,
        direction: "credit",
        prevBalance,
        postBalance: wallet.balance,
        refId: game._id,
        description: `Mines Cashout at ${game.payoutRatio}x`,
      });
      await txn.save();

      game.state = "won";
      game.winAmount = winAmount;
      await game.save();

      logger.info(`Mines Cashout successfully completed by ${req.user.mobile} for ₹${winAmount}`);

      sendToUser(req.user._id, "wallet:balance", {
        balance: wallet.balance,
        commissionBalance: wallet.commissionBalance,
      });

      return res.json({
        success: true,
        data: {
          id: game._id,
          status: "won",
          minePositions: game.details.minePositions, // reveal all mines upon victory
          revealedTiles: game.details.revealedTiles,
          payout: winAmount,
        },
      });
    }
  } catch (error) {
    return next(error);
  }
};

const getMinesBets = async (req, res, next) => {
  try {
    const list = await Bet.find({ user: req.user._id, game: "mines" })
      .sort({ createdAt: -1 })
      .limit(30);
    return res.json({ success: true, data: list });
  } catch (error) {
    return next(error);
  }
};

// ==========================================
// AVIATOR GAME LOGIC
// ==========================================

const placeAviatorBet = async (req, res, next) => {
  try {
    const { amount, autoCashOutMultiplier } = req.body;

    if (!amount) {
      return res.status(400).json({ message: "Bet amount is required." });
    }

    const config = await PlatformConfig.findOne() || new PlatformConfig();
    const aviatorLimits = config.aviatorConfig || { minBet: 10, maxBet: 50000 };

    if (amount < aviatorLimits.minBet || amount > aviatorLimits.maxBet) {
      return res.status(400).json({
        message: `Bet must be between ₹${aviatorLimits.minBet} and ₹${aviatorLimits.maxBet}.`,
      });
    }

    const activeBetsCount = await Bet.countDocuments({
      user: req.user._id,
      game: "aviator",
      state: { $in: ["pending", "next_round"] }
    });

    if (activeBetsCount >= 2) {
      return res.status(400).json({ message: "Maximum of 2 active bets allowed per round." });
    }

    const { state, periodId } = aviatorService.getFlightState();
    let betPeriodId = periodId;
    let betState = "pending";

    if (state !== "waiting") {
      betPeriodId = "next";
      betState = "next_round";
    }

    const wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet || wallet.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance to place flight bet." });
    }

    const prevBalance = wallet.balance;
    wallet.balance -= amount;
    await wallet.save();

    const bet = new Bet({
      user: req.user._id,
      game: "aviator",
      periodId: betPeriodId,
      amount,
      state: betState,
      details: {
        autoCashOutMultiplier: autoCashOutMultiplier ? parseFloat(autoCashOutMultiplier) : null
      }
    });
    await bet.save();

    const txn = new Transaction({
      user: req.user._id,
      type: "game_bet",
      amount,
      direction: "debit",
      prevBalance,
      postBalance: wallet.balance,
      refId: bet._id,
      description: `Aviator flight bet placed for period ${periodId}`,
    });
    await txn.save();

    sendToUser(req.user._id, "wallet:balance", {
      balance: wallet.balance,
      commissionBalance: wallet.commissionBalance,
    });

    return res.status(201).json({ success: true, data: bet });
  } catch (error) {
    return next(error);
  }
};

const cashOutAviator = async (req, res, next) => {
  try {
    const { betId, multiplier } = req.body;
    if (!betId || !multiplier) {
      return res.status(400).json({ message: "Bet reference and multiplier value required." });
    }

    const outcome = await aviatorService.handleCashout(req.user._id, betId, multiplier);
    return res.json({ success: true, data: outcome });
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const cancelAviatorBet = async (req, res, next) => {
  try {
    const { betId } = req.body;
    if (!betId) {
      return res.status(400).json({ message: "Bet ID is required." });
    }

    const bet = await Bet.findOne({ _id: betId, user: req.user._id });
    if (!bet) {
      return res.status(404).json({ message: "Bet not found." });
    }

    if (bet.state !== "pending" && bet.state !== "next_round") {
      return res.status(400).json({ message: `Bet is already settled as ${bet.state}.` });
    }

    const { state } = aviatorService.getFlightState();
    if (bet.state === "pending" && state !== "waiting") {
      return res.status(400).json({ message: "Flight rounds are already running. Cannot cancel bet." });
    }

    bet.state = "cancelled";
    await bet.save();

    const wallet = await Wallet.findOne({ user: req.user._id });
    if (wallet) {
      const prevBalance = wallet.balance;
      wallet.balance += bet.amount;
      await wallet.save();

      const txn = new Transaction({
        user: req.user._id,
        type: "game_refund",
        amount: bet.amount,
        direction: "credit",
        prevBalance,
        postBalance: wallet.balance,
        refId: bet._id,
        description: `Aviator flight bet cancelled and refunded`,
      });
      await txn.save();

      sendToUser(req.user._id, "wallet:balance", {
        balance: wallet.balance,
        commissionBalance: wallet.commissionBalance,
      });
    }

    return res.json({ success: true, message: "Bet successfully cancelled and refunded." });
  } catch (error) {
    return next(error);
  }
};

const getAviatorBets = async (req, res, next) => {
  try {
    const list = await Bet.find({ user: req.user._id, game: "aviator" })
      .sort({ createdAt: -1 })
      .limit(30);
    return res.json({ success: true, data: list });
  } catch (error) {
    return next(error);
  }
};

const getRecentAviatorRounds = async (req, res, next) => {
  try {
    const list = await Period.find({ game: "aviator", status: "completed" })
      .sort({ createdAt: -1 })
      .limit(10);
    const outcomes = list.map((p) => ({
      periodId: p.periodId,
      crashPoint: p.result.crashPoint,
    }));
    return res.json({ success: true, data: outcomes });
  } catch (error) {
    return next(error);
  }
};

// ==========================================
// DICE GAME LOGIC
// ==========================================

const rollDice = async (req, res, next) => {
  try {
    const reqAmount = req.body.amount !== undefined ? req.body.amount : req.body.betAmount;
    const reqTarget = req.body.target !== undefined ? req.body.target : req.body.targetValue;
    const reqPrediction = req.body.condition !== undefined ? req.body.condition : req.body.prediction;

    const betAmount = Number(reqAmount);
    const targetValue = Number(reqTarget);
    const prediction = reqPrediction;

    if (!betAmount || targetValue === undefined || !prediction) {
      return res.status(400).json({ message: "Bet amount, target rollover, and prediction type required." });
    }

    const config = await PlatformConfig.findOne() || new PlatformConfig();
    const diceLimits = config.diceConfig || { minBet: 10, maxBet: 30000 };

    if (betAmount < diceLimits.minBet || betAmount > diceLimits.maxBet) {
      return res.status(400).json({
        message: `Bet must be between ₹${diceLimits.minBet} and ₹${diceLimits.maxBet}.`,
      });
    }

    const wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet || wallet.balance < betAmount) {
      return res.status(400).json({ message: "Insufficient balance." });
    }

    // Deduct bet
    const prevBalance = wallet.balance;
    wallet.balance -= betAmount;
    await wallet.save();

    // Enforce 30% win and 70% loss chances
    const forceLoss = Math.random() < 0.70;
    let rolled;
    if (forceLoss) {
      if (prediction === "over") {
        rolled = parseFloat((Math.random() * targetValue).toFixed(2));
      } else {
        rolled = parseFloat((targetValue + Math.random() * (99.99 - targetValue)).toFixed(2));
      }
    } else {
      if (prediction === "over") {
        rolled = parseFloat((targetValue + 0.01 + Math.random() * (99.99 - targetValue - 0.01)).toFixed(2));
      } else {
        rolled = parseFloat((Math.random() * (targetValue - 0.01)).toFixed(2));
      }
    }
    if (rolled < 0.01) rolled = 0.01;
    if (rolled > 99.99) rolled = 99.99;
    rolled = parseFloat(rolled.toFixed(2));

    let won = false;
    if (prediction === "over" && rolled > targetValue) won = true;
    if (prediction === "under" && rolled < targetValue) won = true;

    // Calculate payout multiplier based on probability: Mult = (100 - houseEdge) / winProbability
    const winProbability = prediction === "over" ? 100 - targetValue : targetValue;
    const payoutRatio = parseFloat(((98) / winProbability).toFixed(2)); // 2% house edge

    const winAmount = won ? parseFloat((betAmount * payoutRatio).toFixed(2)) : 0.0;

    const bet = new Bet({
      user: req.user._id,
      game: "dice",
      amount: betAmount,
      winAmount,
      payoutRatio: won ? payoutRatio : 0.0,
      state: won ? "won" : "lost",
      details: { targetValue, rolledValue: rolled, prediction },
    });
    await bet.save();

    // Log txn
    const betTxn = new Transaction({
      user: req.user._id,
      type: "game_bet",
      amount: betAmount,
      direction: "debit",
      prevBalance,
      postBalance: wallet.balance,
      refId: bet._id,
      description: `Dice bet placed on ${prediction}:${targetValue}`,
    });
    await betTxn.save();

    if (won) {
      const balanceBeforeWin = wallet.balance;
      wallet.balance += winAmount;
      await wallet.save();

      const winTxn = new Transaction({
        user: req.user._id,
        type: "game_win",
        amount: winAmount,
        direction: "credit",
        prevBalance: balanceBeforeWin,
        postBalance: wallet.balance,
        refId: bet._id,
        description: `Dice win payout for roll: ${rolled}`,
      });
      await winTxn.save();
    }

    sendToUser(req.user._id, "wallet:balance", {
      balance: wallet.balance,
      commissionBalance: wallet.commissionBalance,
    });

    return res.status(201).json({
      success: true,
      data: {
        id: bet._id,
        result: rolled,
        status: won ? "won" : "lost",
        payout: winAmount,
        profit: won ? parseFloat((winAmount - betAmount).toFixed(2)) : -betAmount,
        rollResult: rolled,
        winAmount,
        payoutRatio: won ? payoutRatio : 0.0,
        won,
        newBalance: wallet.balance,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getDiceRolls = async (req, res, next) => {
  try {
    const list = await Bet.find({ user: req.user._id, game: "dice" })
      .sort({ createdAt: -1 })
      .limit(30);
    return res.json({ success: true, data: list });
  } catch (error) {
    return next(error);
  }
};

// ==========================================
// LIMBO GAME LOGIC
// ==========================================

const playLimbo = async (req, res, next) => {
  try {
    const reqAmount = req.body.amount !== undefined ? req.body.amount : req.body.betAmount;
    const reqTarget = req.body.targetMultiplier;

    const betAmount = Number(reqAmount);
    const targetMultiplier = Number(reqTarget);

    if (!betAmount || !targetMultiplier || targetMultiplier < 1.01) {
      return res.status(400).json({ message: "Invalid bet amount or target multiplier. Minimum target is 1.01x." });
    }

    // You can customize limits in PlatformConfig if needed, using defaults here
    const minBet = 10;
    const maxBet = 50000;

    if (betAmount < minBet || betAmount > maxBet) {
      return res.status(400).json({
        message: `Bet must be between ₹${minBet} and ₹${maxBet}.`,
      });
    }

    const wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet || wallet.balance < betAmount) {
      return res.status(400).json({ message: "Insufficient balance." });
    }

    // Deduct bet
    const prevBalance = wallet.balance;
    wallet.balance -= betAmount;
    await wallet.save();

    // Limbo RNG logic (99% RTP / 1% House Edge)
    const floatPoint = 100000000;
    const randomSeed = Math.floor(Math.random() * floatPoint) + 1; // avoid 0
    let rolled = 0.99 / (randomSeed / floatPoint);
    
    if (rolled < 1.00) rolled = 1.00;
    if (rolled > 1000000) rolled = 1000000;
    rolled = parseFloat(rolled.toFixed(2));

    const won = rolled >= targetMultiplier;
    const winAmount = won ? parseFloat((betAmount * targetMultiplier).toFixed(2)) : 0.0;
    
    const bet = new Bet({
      user: req.user._id,
      game: "limbo",
      amount: betAmount,
      winAmount,
      payoutRatio: won ? targetMultiplier : 0.0,
      state: won ? "won" : "lost",
      details: { targetMultiplier, rolledMultiplier: rolled },
    });
    await bet.save();

    // Log txn
    const betTxn = new Transaction({
      user: req.user._id,
      type: "game_bet",
      amount: betAmount,
      direction: "debit",
      prevBalance,
      postBalance: wallet.balance,
      refId: bet._id,
      description: `Limbo bet placed, Target: ${targetMultiplier.toFixed(2)}x`,
    });
    await betTxn.save();

    if (won) {
      const balanceBeforeWin = wallet.balance;
      wallet.balance += winAmount;
      await wallet.save();

      const winTxn = new Transaction({
        user: req.user._id,
        type: "game_win",
        amount: winAmount,
        direction: "credit",
        prevBalance: balanceBeforeWin,
        postBalance: wallet.balance,
        refId: bet._id,
        description: `Limbo win payout for multiplier: ${rolled.toFixed(2)}x`,
      });
      await winTxn.save();
    }

    sendToUser(req.user._id, "wallet:balance", {
      balance: wallet.balance,
      commissionBalance: wallet.commissionBalance,
    });

    return res.status(201).json({
      success: true,
      data: {
        id: bet._id,
        result: rolled,
        status: won ? "won" : "lost",
        payout: winAmount,
        profit: won ? parseFloat((winAmount - betAmount).toFixed(2)) : -betAmount,
        rolledMultiplier: rolled,
        targetMultiplier: targetMultiplier,
        winAmount,
        won,
        newBalance: wallet.balance,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getLimboBets = async (req, res, next) => {
  try {
    const list = await Bet.find({ user: req.user._id, game: "limbo" })
      .sort({ createdAt: -1 })
      .limit(30);
    return res.json({ success: true, data: list });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getCurrentPeriod,
  getRecentResults,
  placeWingoBet,
  getWingoBets,
  getActiveMinesGame,
  startMinesGame,
  revealMinesTile,
  cashOutMines,
  getMinesBets,
  placeAviatorBet,
  cashOutAviator,
  cancelAviatorBet,
  getAviatorBets,
  getRecentAviatorRounds,
  rollDice,
  getDiceRolls,
  playLimbo,
  getLimboBets,
};
