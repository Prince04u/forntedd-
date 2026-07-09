const User = require("../models/User");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");
const logger = require("../config/logger");

const getAgentStatus = async (req, res, next) => {
  try {
    const directReferralsCount = await User.countDocuments({ referredBy: req.user._id });
    // Tiered agent structure mockup based on referral volume
    let rate = 2.0; // default 2%
    let tier = "Silver Agent";

    if (directReferralsCount >= 50) {
      rate = 4.0;
      tier = "Diamond Agent";
    } else if (directReferralsCount >= 15) {
      rate = 3.0;
      tier = "Gold Agent";
    }

    return res.json({
      success: true,
      data: {
        tier,
        commissionRatePercent: rate,
        totalReferrals: directReferralsCount,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getAgentDashboard = async (req, res, next) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user._id });
    const directUsers = await User.find({ referredBy: req.user._id }).select("_id");
    const userIds = directUsers.map((u) => u._id);

    // Downline bet counts and deposit volumes
    const totalReferrals = userIds.length;
    const stats = await Transaction.aggregate([
      { $match: { user: { $in: userIds }, type: "deposit", status: { $ne: "rejected" } } },
      { $group: { _id: null, totalDeposits: { $sum: "$amount" } } },
    ]);

    const totalDepositsVolume = stats.length ? stats[0].totalDeposits : 0;

    return res.json({
      success: true,
      data: {
        commissionBalance: wallet ? wallet.commissionBalance : 0,
        totalReferrals,
        downlineDepositsVolume: totalDepositsVolume,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getAgentDownline = async (req, res, next) => {
  try {
    const list = await User.find({ referredBy: req.user._id })
      .select("name mobile status createdAt")
      .sort({ createdAt: -1 });

    const downlineList = await Promise.all(
      list.map(async (member) => {
        const wallet = await Wallet.findOne({ user: member._id });
        return {
          id: member._id,
          name: member.name,
          mobile: member.mobile.slice(0, 3) + "****" + member.mobile.slice(-3),
          status: member.status,
          registeredAt: member.createdAt,
          balance: wallet ? wallet.balance : 0,
        };
      })
    );

    return res.json({ success: true, data: downlineList });
  } catch (error) {
    return next(error);
  }
};

const getAgentCommissions = async (req, res, next) => {
  try {
    const list = await Transaction.find({
      user: req.user._id,
      type: "referral_commission",
    }).sort({ createdAt: -1 });

    return res.json({ success: true, data: list });
  } catch (error) {
    return next(error);
  }
};

const getAgentPayoutRequests = async (req, res, next) => {
  try {
    const list = await Transaction.find({
      user: req.user._id,
      type: "admin_adjustment",
      description: { $regex: /Commission Claim/i },
    }).sort({ createdAt: -1 });

    return res.json({ success: true, data: list });
  } catch (error) {
    return next(error);
  }
};

const createAgentPayoutRequest = async (req, res, next) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user._id });
    if (!wallet || wallet.commissionBalance <= 0) {
      return res.status(400).json({ message: "No commission earnings available to claim." });
    }

    const claimAmount = wallet.commissionBalance;
    const prevBalance = wallet.balance;

    wallet.balance += claimAmount;
    wallet.commissionBalance = 0;
    await wallet.save();

    // Log ledger txn
    const txn = new Transaction({
      user: req.user._id,
      type: "admin_adjustment",
      amount: claimAmount,
      direction: "credit",
      prevBalance,
      postBalance: wallet.balance,
      description: `Commission Claim: Transferred ₹${claimAmount} from commission balance to wallet.`,
    });
    await txn.save();

    logger.info(`Commission claim of ₹${claimAmount} converted to main wallet balance by ${req.user.mobile}`);

    return res.status(201).json({
      success: true,
      message: `Successfully claimed ₹${claimAmount} to your main wallet balance.`,
      data: {
        claimedAmount: claimAmount,
        newBalance: wallet.balance,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAgentStatus,
  getAgentDashboard,
  getAgentDownline,
  getAgentCommissions,
  getAgentPayoutRequests,
  createAgentPayoutRequest,
};
