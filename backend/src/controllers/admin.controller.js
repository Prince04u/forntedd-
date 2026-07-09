const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const Deposit = require("../models/Deposit");
const Withdrawal = require("../models/Withdrawal");
const KycDocument = require("../models/KycDocument");
const PlatformConfig = require("../models/PlatformConfig");
const Period = require("../models/Period");
const PromoBanner = require("../models/PromoBanner");
const Announcement = require("../models/Announcement");
const Feedback = require("../models/Feedback");
const { sendToUser } = require("../services/socket.service");
const bcrypt = require("bcryptjs");
const logger = require("../config/logger");

const getUsers = async (req, res, next) => {
  try {
    const { search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
      ];
    }

    const list = await User.find(query)
      .select("-password")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const count = await User.countDocuments(query);

    return res.json({ success: true, count, data: list });
  } catch (error) {
    return next(error);
  }
};

const getUserProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const wallet = await Wallet.findOne({ user: id });
    const kyc = await KycDocument.findOne({ user: id });

    return res.json({
      success: true,
      data: {
        profile: user,
        wallet,
        kyc,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const updateUserProfile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, role, status, password } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (name) user.name = name;
    if (role) user.role = role;
    if (status) user.status = status;
    if (password) {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
    }

    await user.save();
    logger.info(`User profile updated by admin: ${user.mobile}`);

    return res.json({ success: true, message: "User profile updated successfully." });
  } catch (error) {
    return next(error);
  }
};

const updateUserKyc = async (req, res, next) => {
  try {
    const { id } = req.params; // User ID
    const { status, comments } = req.body; // status: "approved" | "rejected"

    if (!status) {
      return res.status(400).json({ message: "KYC verification status required." });
    }

    const kyc = await KycDocument.findOneAndUpdate(
      { user: id },
      { status, comments: comments || "" },
      { new: true }
    );

    logger.info(`KYC status updated for user ID ${id}: ${status}`);

    return res.json({ success: true, message: `KYC documents marked as ${status}.`, data: kyc });
  } catch (error) {
    return next(error);
  }
};

const adjustUserBalance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, direction, description } = req.body; // direction: "credit" | "debit"

    if (!amount || amount <= 0 || !direction) {
      return res.status(400).json({ message: "Amount and direction (credit/debit) required." });
    }

    const wallet = await Wallet.findOne({ user: id });
    if (!wallet) {
      return res.status(404).json({ message: "Wallet not found." });
    }

    const prevBalance = wallet.balance;

    if (direction === "credit") {
      wallet.balance += Number(amount);
    } else {
      if (wallet.balance < amount) {
        return res.status(400).json({ message: "Insufficient balance to execute debit adjustment." });
      }
      wallet.balance -= Number(amount);
    }

    await wallet.save();

    // Log txn
    const txn = new Transaction({
      user: id,
      type: "admin_adjustment",
      amount: Number(amount),
      direction,
      prevBalance,
      postBalance: wallet.balance,
      description: description || "Administrative Balance Adjustment",
    });
    await txn.save();

    logger.info(`Manual balance adjustment for user ID ${id}: ${direction} of ₹${amount}`);

    // Emit balance update to player socket room
    sendToUser(id, "wallet:balance", {
      balance: wallet.balance,
      commissionBalance: wallet.commissionBalance,
    });

    return res.json({ success: true, message: `Balance adjustment successfully completed. New balance: ₹${wallet.balance}` });
  } catch (error) {
    return next(error);
  }
};

const getTransactions = async (req, res, next) => {
  try {
    const { type, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (type) filter.type = type;

    const list = await Transaction.find(filter)
      .populate("user", "name mobile")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const count = await Transaction.countDocuments(filter);

    return res.json({ success: true, count, data: list });
  } catch (error) {
    return next(error);
  }
};

const getDeposits = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const list = await Deposit.find(filter)
      .populate("user", "name mobile")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const count = await Deposit.countDocuments(filter);

    return res.json({ success: true, count, data: list });
  } catch (error) {
    return next(error);
  }
};

const processDepositApproval = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, comments } = req.body; // status: "approved" | "rejected"

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid deposit verification status action." });
    }

    const deposit = await Deposit.findById(id);
    if (!deposit) {
      return res.status(404).json({ message: "Deposit record not found." });
    }

    if (deposit.status !== "pending") {
      return res.status(400).json({ message: `Deposit request has already been settled as ${deposit.status}.` });
    }

    deposit.status = status;
    deposit.comments = comments || "";
    await deposit.save();

    if (status === "approved") {
      const wallet = await Wallet.findOne({ user: deposit.user });
      if (wallet) {
        const prevBalance = wallet.balance;
        wallet.balance += deposit.amount;
        await wallet.save();

        const txn = new Transaction({
          user: deposit.user,
          type: "deposit",
          amount: deposit.amount,
          direction: "credit",
          prevBalance,
          postBalance: wallet.balance,
          refId: deposit._id,
          description: `USDT Crypto Deposit Confirmed (Network: ${deposit.channel})`,
        });
        await txn.save();

        // Push real-time balance
        sendToUser(deposit.user, "wallet:balance", {
          balance: wallet.balance,
          commissionBalance: wallet.commissionBalance,
        });

        // Pay commission to referral parents if any
        await settleReferralCommissions(deposit.user, deposit.amount);
      }
    }

    logger.info(`Deposit request ID ${id} marked: ${status}`);

    return res.json({ success: true, message: `Deposit request marked as ${status} successfully.` });
  } catch (error) {
    return next(error);
  }
};

const settleReferralCommissions = async (userId, depositAmount) => {
  try {
    const user = await User.findById(userId);
    if (!user || !user.referredBy) return;

    const config = await PlatformConfig.findOne() || new PlatformConfig();
    const rates = config.referralCommissionRates || [0.02, 0.01, 0.005];

    let currentParentId = user.referredBy;

    // Up to 3 levels commission payout
    for (let depth = 0; depth < rates.length; depth += 1) {
      if (!currentParentId) break;

      const parent = await User.findById(currentParentId);
      if (!parent) break;

      const rate = rates[depth];
      const commission = parseFloat((depositAmount * rate).toFixed(2));

      if (commission > 0) {
        const wallet = await Wallet.findOne({ user: parent._id });
        if (wallet) {
          const prevBalance = wallet.balance;
          wallet.commissionBalance += commission;
          await wallet.save();

          // Log ledger txn
          const txn = new Transaction({
            user: parent._id,
            type: "referral_commission",
            amount: commission,
            direction: "credit",
            prevBalance,
            postBalance: wallet.balance,
            description: `Referral commission from level ${depth + 1} downline deposit (₹${depositAmount})`,
          });
          await txn.save();

          sendToUser(parent._id, "wallet:balance", {
            balance: wallet.balance,
            commissionBalance: wallet.commissionBalance,
          });
        }
      }

      currentParentId = parent.referredBy; // Traverse up tree
    }
  } catch (err) {
    logger.error(`Error settling referral commissions: ${err.message}`);
  }
};

const getWithdrawals = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;

    const list = await Withdrawal.find(filter)
      .populate("user", "name mobile")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const count = await Withdrawal.countDocuments(filter);

    return res.json({ success: true, count, data: list });
  } catch (error) {
    return next(error);
  }
};

const processWithdrawalApproval = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, comments } = req.body; // status: "completed" | "rejected"

    if (!["completed", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid withdrawal payout action status." });
    }

    const withdrawal = await Withdrawal.findById(id);
    if (!withdrawal) {
      return res.status(404).json({ message: "Withdrawal request not found." });
    }

    if (withdrawal.status !== "pending") {
      return res.status(400).json({ message: `Withdrawal request already processed as ${withdrawal.status}.` });
    }

    withdrawal.status = status;
    withdrawal.comments = comments || "";
    withdrawal.processedBy = req.user._id;
    await withdrawal.save();

    // If rejected, refund the wallet balance
    if (status === "rejected") {
      const wallet = await Wallet.findOne({ user: withdrawal.user });
      if (wallet) {
        const prevBalance = wallet.balance;
        wallet.balance += withdrawal.amount;
        await wallet.save();

        const txn = new Transaction({
          user: withdrawal.user,
          type: "admin_adjustment",
          amount: withdrawal.amount,
          direction: "credit",
          prevBalance,
          postBalance: wallet.balance,
          refId: withdrawal._id,
          description: `Withdrawal request ID ${withdrawal._id} rejected. Refunded to wallet.`,
        });
        await txn.save();

        sendToUser(withdrawal.user, "wallet:balance", {
          balance: wallet.balance,
          commissionBalance: wallet.commissionBalance,
        });
      }
    }

    logger.info(`Withdrawal request ID ${id} processed: ${status}`);

    return res.json({ success: true, message: `Withdrawal request successfully processed as ${status}.` });
  } catch (error) {
    return next(error);
  }
};

const getUsdtSettings = async (req, res, next) => {
  try {
    const config = await PlatformConfig.findOne() || new PlatformConfig();
    return res.json({
      success: true,
      data: {
        usdt_trc20: config.usdt_trc20,
        usdt_bep20: config.usdt_bep20,
        usdt_erc20: config.usdt_erc20,
        enableTRC20: config.enableTRC20,
        enableBEP20: config.enableBEP20,
        enableERC20: config.enableERC20,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const updateUsdtSettings = async (req, res, next) => {
  try {
    const { usdt_trc20, usdt_bep20, usdt_erc20, enableTRC20, enableBEP20, enableERC20 } = req.body;
    let config = await PlatformConfig.findOne();
    if (!config) config = new PlatformConfig();

    if (usdt_trc20 !== undefined) config.usdt_trc20 = usdt_trc20;
    if (usdt_bep20 !== undefined) config.usdt_bep20 = usdt_bep20;
    if (usdt_erc20 !== undefined) config.usdt_erc20 = usdt_erc20;
    if (enableTRC20 !== undefined) config.enableTRC20 = enableTRC20;
    if (enableBEP20 !== undefined) config.enableBEP20 = enableBEP20;
    if (enableERC20 !== undefined) config.enableERC20 = enableERC20;

    await config.save();
    return res.json({ success: true, message: "USDT deposit addresses configuration updated." });
  } catch (error) {
    return next(error);
  }
};

const getWithdrawSettings = async (req, res, next) => {
  try {
    const config = await PlatformConfig.findOne() || new PlatformConfig();
    return res.json({
      success: true,
      data: {
        minWithdraw: config.minWithdraw,
        maxWithdraw: config.maxWithdraw,
        withdrawFeePercent: config.withdrawFeePercent,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const updateWithdrawSettings = async (req, res, next) => {
  try {
    const { minWithdraw, maxWithdraw, withdrawFeePercent } = req.body;
    let config = await PlatformConfig.findOne();
    if (!config) config = new PlatformConfig();

    if (minWithdraw !== undefined) config.minWithdraw = Number(minWithdraw);
    if (maxWithdraw !== undefined) config.maxWithdraw = Number(maxWithdraw);
    if (withdrawFeePercent !== undefined) config.withdrawFeePercent = Number(withdrawFeePercent);

    await config.save();
    return res.json({ success: true, message: "Withdrawal limits configuration updated." });
  } catch (error) {
    return next(error);
  }
};

const getGamesOverview = async (req, res, next) => {
  try {
    const config = await PlatformConfig.findOne() || new PlatformConfig();
    return res.json({
      success: true,
      data: {
        wingo: config.wingoConfig,
        mines: config.minesConfig,
        aviator: config.aviatorConfig,
        dice: config.diceConfig,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const updateGameConfig = async (req, res, next) => {
  try {
    const { gameId } = req.params; // "wingo" | "mines" | "aviator" | "dice"
    const { minBet, maxBet, houseEdgePercent } = req.body;

    let config = await PlatformConfig.findOne();
    if (!config) config = new PlatformConfig();

    const targetKey = `${gameId}Config`;
    if (config[targetKey]) {
      if (minBet !== undefined) config[targetKey].minBet = Number(minBet);
      if (maxBet !== undefined) config[targetKey].maxBet = Number(maxBet);
      if (houseEdgePercent !== undefined) config[targetKey].houseEdgePercent = Number(houseEdgePercent);

      config.markModified(targetKey);
      await config.save();
      return res.json({ success: true, message: `${gameId} game rules limits configured.` });
    }

    return res.status(400).json({ message: `Config for game ${gameId} not found.` });
  } catch (error) {
    return next(error);
  }
};

const overrideGameResult = async (req, res, next) => {
  try {
    const { gameId } = req.params; // "wingo"
    const { periodId, result } = req.body; // e.g. Wingo: { overrideResult: 7 }

    if (!periodId || result === undefined) {
      return res.status(400).json({ message: "Period ID and target result are required." });
    }

    const period = await Period.findOneAndUpdate(
      { game: gameId, periodId, status: "active" },
      { resultOverridden: true, overrideResult: result },
      { new: true }
    );

    if (!period) {
      return res.status(404).json({ message: "No active target round period found." });
    }

    logger.warn(`Admin overridden game result for period ${periodId} set to: ${result}`);

    return res.json({ success: true, message: `Result override for period ${periodId} successfully active.`, data: period });
  } catch (error) {
    return next(error);
  }
};

const getReferralConfig = async (req, res, next) => {
  try {
    const config = await PlatformConfig.findOne() || new PlatformConfig();
    return res.json({ success: true, data: config.referralCommissionRates });
  } catch (error) {
    return next(error);
  }
};

const updateReferralConfig = async (req, res, next) => {
  try {
    const { rates } = req.body; // rates array: e.g. [0.03, 0.015, 0.008]
    if (!Array.isArray(rates)) {
      return res.status(400).json({ message: "Commission rates must be configured as an array." });
    }

    let config = await PlatformConfig.findOne();
    if (!config) config = new PlatformConfig();

    config.referralCommissionRates = rates;
    await config.save();

    return res.json({ success: true, message: "Referral percentages updated." });
  } catch (error) {
    return next(error);
  }
};

const managePromoBanners = async (req, res, next) => {
  try {
    const { image, title, link, order } = req.body;
    if (!image) return res.status(400).json({ message: "Image path is required." });

    const banner = new PromoBanner({ image, title, link, order: order || 0 });
    await banner.save();

    return res.status(201).json({ success: true, data: banner });
  } catch (error) {
    return next(error);
  }
};

const deletePromoBanner = async (req, res, next) => {
  try {
    const { id } = req.params;
    await PromoBanner.findByIdAndDelete(id);
    return res.json({ success: true, message: "Lobby slider banner removed." });
  } catch (error) {
    return next(error);
  }
};

const createAnnouncement = async (req, res, next) => {
  try {
    const { type, content } = req.body;
    if (!content) return res.status(400).json({ message: "Announcement content required." });

    const announce = new Announcement({ type: type || "marquee", content });
    await announce.save();

    return res.status(201).json({ success: true, data: announce });
  } catch (error) {
    return next(error);
  }
};

const deleteAnnouncement = async (req, res, next) => {
  try {
    const { id } = req.params;
    await Announcement.findByIdAndDelete(id);
    return res.json({ success: true, message: "Announcement deleted." });
  } catch (error) {
    return next(error);
  }
};

const getSupportTickets = async (req, res, next) => {
  try {
    const list = await Feedback.find()
      .populate("user", "name mobile")
      .sort({ createdAt: -1 });
    return res.json({ success: true, data: list });
  } catch (error) {
    return next(error);
  }
};

const replySupportTicket = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;

    if (!reply) return res.status(400).json({ message: "Reply text is required." });

    const ticket = await Feedback.findByIdAndUpdate(
      id,
      { reply, status: "resolved" },
      { new: true }
    );

    return res.json({ success: true, message: "Support ticket marked resolved.", data: ticket });
  } catch (error) {
    return next(error);
  }
};

const getAnalytics = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const pendingDeposits = await Deposit.countDocuments({ status: "pending" });
    const pendingWithdrawals = await Withdrawal.countDocuments({ status: "pending" });

    // Gross Gaming Revenue (GGR) = Total Bets - Total Wins
    const stats = await Transaction.aggregate([
      { $match: { type: { $in: ["game_bet", "game_win"] } } },
      {
        $group: {
          _id: "$type",
          total: { $sum: "$amount" },
        },
      },
    ]);

    const totalBets = stats.find((s) => s._id === "game_bet")?.total || 0;
    const totalWins = stats.find((s) => s._id === "game_win")?.total || 0;
    const ggr = totalBets - totalWins;

    return res.json({
      success: true,
      data: {
        KPI: {
          totalUsers,
          pendingDeposits,
          pendingWithdrawals,
          ggr,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getUsers,
  getUserProfile,
  updateUserProfile,
  updateUserKyc,
  adjustUserBalance,
  getTransactions,
  getDeposits,
  processDepositApproval,
  getWithdrawals,
  processWithdrawalApproval,
  getUsdtSettings,
  updateUsdtSettings,
  getWithdrawSettings,
  updateWithdrawSettings,
  getGamesOverview,
  updateGameConfig,
  overrideGameResult,
  getReferralConfig,
  updateReferralConfig,
  managePromoBanners,
  deletePromoBanner,
  createAnnouncement,
  deleteAnnouncement,
  getSupportTickets,
  replySupportTicket,
  getAnalytics,
};
