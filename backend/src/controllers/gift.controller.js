const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const PlatformConfig = require("../models/PlatformConfig");
const logger = require("../config/logger");

const getGiftStatus = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const claimed = await Transaction.findOne({
      user: req.user._id,
      type: "admin_adjustment",
      description: { $regex: /Daily Gift Reward/i },
      createdAt: { $gte: today },
    });

    return res.json({
      success: true,
      data: {
        canClaim: !claimed,
        claimedToday: !!claimed,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const claimDailyGift = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const claimed = await Transaction.findOne({
      user: req.user._id,
      type: "admin_adjustment",
      description: { $regex: /Daily Gift Reward/i },
      createdAt: { $gte: today },
    });

    if (claimed) {
      return res.status(400).json({ message: "You have already claimed your daily gift reward today. Come back tomorrow!" });
    }

    const config = await PlatformConfig.findOne() || new PlatformConfig();
    const reward = config.dailyClaimReward || 10.0;

    const wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet) {
      return res.status(404).json({ message: "Wallet configuration not found." });
    }

    const prevBalance = wallet.balance;
    wallet.balance += reward;
    await wallet.save();

    const txn = new Transaction({
      user: req.user._id,
      type: "admin_adjustment",
      amount: reward,
      direction: "credit",
      prevBalance,
      postBalance: wallet.balance,
      description: "Daily Gift Reward Claimed",
    });
    await txn.save();

    logger.info(`Daily reward ₹${reward} claimed by user ${req.user.mobile}`);

    return res.json({
      success: true,
      message: `Daily login reward of ₹${reward} claimed successfully!`,
      data: {
        claimedAmount: reward,
        newBalance: wallet.balance,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { getGiftStatus, claimDailyGift };
