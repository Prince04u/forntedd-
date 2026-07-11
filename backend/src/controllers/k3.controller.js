const Bet = require("../models/Bet");
const Period = require("../models/Period");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const PlatformConfig = require("../models/PlatformConfig");
const { getTimers, getActivePeriods } = require("../services/k3.service");

// GET /api/games/k3/:duration/current
exports.getCurrentK3Period = async (req, res, next) => {
  try {
    const { duration } = req.params;
    const activePeriods = getActivePeriods();
    const timers = getTimers();

    const currentPeriod = activePeriods[duration];
    if (!currentPeriod) {
      return res.status(404).json({ message: "Game duration not active" });
    }

    res.json({
      success: true,
      data: {
        ...currentPeriod.toObject(),
        remainingSeconds: Math.max(0, timers[duration] || 0),
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/games/k3/:duration/results
exports.getK3Results = async (req, res, next) => {
  try {
    const { duration } = req.params;
    const limit = parseInt(req.query.limit) || 20;

    const results = await Period.find({
      game: "k3",
      duration,
      status: "completed",
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("periodId result createdAt");

    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/games/k3/:duration/bet
exports.placeK3Bet = async (req, res, next) => {
  try {
    const { duration } = req.params;
    const { betType, betValue, amount } = req.body;
    const userId = req.user._id;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid bet amount" });
    }
    if (!betType || !betValue) {
      return res.status(400).json({ message: "Missing bet details" });
    }

    const config = await PlatformConfig.findOne() || {};
    const k3Config = config.k3Config || { minBet: 1, maxBet: 50000 };
    if (k3Config.minBet > 1) k3Config.minBet = 1; // Force minBet to 1 as requested

    if (amount < k3Config.minBet || amount > k3Config.maxBet) {
      return res.status(400).json({ message: `Bet amount must be between ₹${k3Config.minBet} and ₹${k3Config.maxBet}` });
    }

    const activePeriods = getActivePeriods();
    const timers = getTimers();
    const currentPeriod = activePeriods[duration];

    if (!currentPeriod) {
      return res.status(400).json({ message: "Game not active" });
    }

    const remainingSeconds = timers[duration];
    if (remainingSeconds <= 5) {
      return res.status(400).json({ message: "Betting locked for this round. Please wait for the next round." });
    }

    const wallet = await Wallet.findOne({ user: userId });
    if (!wallet || wallet.balance < amount) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    const prevBalance = wallet.balance;
    wallet.balance -= amount;
    await wallet.save();

    const bet = new Bet({
      user: userId,
      game: "k3",
      periodId: currentPeriod.periodId,
      amount,
      details: { betType, betValue, duration },
    });
    await bet.save();

    const txn = new Transaction({
      user: userId,
      type: "game_bet",
      amount,
      direction: "debit",
      prevBalance,
      postBalance: wallet.balance,
      refId: bet._id,
      description: `K3 bet on period ${currentPeriod.periodId}`,
    });
    await txn.save();

    res.json({
      success: true,
      data: {
        bet,
        balance: wallet.balance,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/games/k3/bets/my
exports.getK3Bets = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const { duration, limit = 20, page = 1 } = req.query;

    const query = { user: userId, game: "k3" };
    if (duration) query["details.duration"] = duration;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const bets = await Bet.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
      
    const total = await Bet.countDocuments(query);

    res.json({
      success: true,
      data: {
        bets,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
        }
      },
    });
  } catch (error) {
    next(error);
  }
};
