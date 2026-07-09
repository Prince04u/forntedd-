const PlatformConfig = require("../models/PlatformConfig");
const PromoBanner = require("../models/PromoBanner");
const Announcement = require("../models/Announcement");

const getPlatformStatus = async (req, res, next) => {
  try {
    const config = await PlatformConfig.findOne() || new PlatformConfig();
    return res.json({
      success: true,
      data: {
        isMaintenance: config.isMaintenance,
        maintenanceMessage: "Lucky Nova is undergoing system maintenance. We will be back shortly.",
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getDepositPayment = async (req, res, next) => {
  try {
    const config = await PlatformConfig.findOne() || new PlatformConfig();
    const channels = [];

    if (config.enableTRC20) {
      channels.push({ network: "TRC20", address: config.usdt_trc20, minDeposit: 10 });
    }
    if (config.enableBEP20) {
      channels.push({ network: "BEP20", address: config.usdt_bep20, minDeposit: 10 });
    }
    if (config.enableERC20) {
      channels.push({ network: "ERC20", address: config.usdt_erc20, minDeposit: 50 });
    }

    return res.json({ success: true, data: channels });
  } catch (error) {
    return next(error);
  }
};

const getPromoBanners = async (req, res, next) => {
  try {
    // If no banners, return default carousel banners
    let list = await PromoBanner.find({ active: true }).sort({ order: 1 });
    if (!list.length) {
      list = [
        { id: "slide-1", title: "Join Lucky Nova", image: "/design/banners/wingo-payout.png", link: "/wingo/30s" },
        { id: "slide-2", title: "First Deposit Bonus", image: "/design/banners/first-deposit-bonus.png", link: "/wallet/deposit" },
        { id: "slide-3", title: "Login Reward Tier", image: "/design/banners/login-bonus.png", link: "/account/vip" },
      ];
    }
    return res.json({ success: true, data: { carousel: list } });
  } catch (error) {
    return next(error);
  }
};

const getAnnouncements = async (req, res, next) => {
  try {
    let list = await Announcement.find({ active: true }).sort({ createdAt: -1 });
    if (!list.length) {
      list = [
        { id: "notice-1", content: "Welcome to Lucky Nova! Deposits via USDT TRC20 are fully automated. Happy gaming!" },
        { id: "notice-2", content: "Mines multiplier values upgraded. Daily claims credited instantly." },
      ];
    }
    return res.json({ success: true, data: list });
  } catch (error) {
    return next(error);
  }
};

const getWingoConfig = async (req, res, next) => {
  try {
    const config = await PlatformConfig.findOne() || new PlatformConfig();
    return res.json({ success: true, data: config.wingoConfig });
  } catch (error) {
    return next(error);
  }
};

const getMinesConfig = async (req, res, next) => {
  try {
    const config = await PlatformConfig.findOne() || new PlatformConfig();
    return res.json({ success: true, data: config.minesConfig });
  } catch (error) {
    return next(error);
  }
};

const getAviatorConfig = async (req, res, next) => {
  try {
    const config = await PlatformConfig.findOne() || new PlatformConfig();
    return res.json({ success: true, data: config.aviatorConfig });
  } catch (error) {
    return next(error);
  }
};

const getDiceConfig = async (req, res, next) => {
  try {
    const config = await PlatformConfig.findOne() || new PlatformConfig();
    return res.json({ success: true, data: config.diceConfig });
  } catch (error) {
    return next(error);
  }
};

const getDepositOptions = async (req, res) => {
  return res.json({
    success: true,
    data: [
      { id: "usdt", name: "USDT Crypto Wallet", image: "/design/promo-cards/deposit.png" },
    ],
  });
};

const getWalletRules = async (req, res, next) => {
  try {
    const config = await PlatformConfig.findOne() || new PlatformConfig();
    return res.json({
      success: true,
      data: {
        minWithdraw: config.minWithdraw,
        maxWithdraw: config.maxWithdraw,
        rules: [
          "Withdrawals are open 24/7.",
          `Minimum withdrawal amount is ₹${config.minWithdraw}.`,
          `Withdrawals are subject to a processing fee of ${config.withdrawFeePercent}%.`,
          "Funds are credited to your destination wallet address or card in 2-4 hours.",
        ],
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getVipProgram = async (req, res) => {
  // Returns VIP levels definitions
  return res.json({
    success: true,
    data: [
      { level: 1, name: "Bronze Star", points: 0, cashbackPercent: 0.5 },
      { level: 2, name: "Silver Star", points: 1000, cashbackPercent: 0.8 },
      { level: 3, name: "Gold Star", points: 5000, cashbackPercent: 1.2 },
      { level: 4, name: "Diamond Star", points: 20000, cashbackPercent: 1.8 },
    ],
  });
};

module.exports = {
  getPlatformStatus,
  getDepositPayment,
  getPromoBanners,
  getAnnouncements,
  getWingoConfig,
  getMinesConfig,
  getAviatorConfig,
  getDiceConfig,
  getDepositOptions,
  getWalletRules,
  getVipProgram,
};
