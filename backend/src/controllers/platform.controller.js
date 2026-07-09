const PlatformConfig = require("../models/PlatformConfig");
const PromoBanner = require("../models/PromoBanner");
const Announcement = require("../models/Announcement");
const UsdtAddress = require("../models/UsdtAddress");

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
    const channelId = req.query.channel || "usdt-trc20";
    const isBep20 = channelId.includes("bep20");
    const network = isBep20 ? "BEP20" : "TRC20";
    const networkLabel = isBep20 ? "BSC (BEP20)" : "Tron (TRC20)";

    const config = await PlatformConfig.findOne() || new PlatformConfig();

    // Fetch active bulk addresses for this network
    const activeAddresses = await UsdtAddress.find({ network, active: true });
    
    let walletAddress = isBep20 ? config.usdt_bep20 : config.usdt_trc20;
    let qrCodeUrl = "";

    // Pick one randomly if bulk entries are present
    if (activeAddresses.length > 0) {
      const randomIndex = Math.floor(Math.random() * activeAddresses.length);
      walletAddress = activeAddresses[randomIndex].address;
      qrCodeUrl = activeAddresses[randomIndex].qrCodeUrl || "";
    }

    return res.json({
      success: true,
      data: {
        type: "crypto",
        walletAddress: walletAddress,
        qrCodeUrl: qrCodeUrl,
        networkLabel: networkLabel,
        usdtRate: 98,
        channelLabel: isBep20 ? "Binance-USDT (BEP20)" : "TronPay-USDT (TRC20)"
      }
    });
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
    data: {
      disabledMessage: "Not available right now. Please deposit using USDT.",
      methods: [
        { id: "upi_qr", label: "UPI-QR", icon: "upi", enabled: false, disabledMessage: "Not available right now" },
        { id: "upi_x_qr", label: "UPI x QR", icon: "upi", enabled: false, disabledMessage: "Not available right now" },
        { id: "ewallet", label: "E-Wallet", icon: "wallet", enabled: false, disabledMessage: "Not available right now" },
        { id: "paytm_qr", label: "Paytm x QR", icon: "paytm", enabled: false, disabledMessage: "Not available right now" },
        { id: "usdt_trc20", label: "USDT-TRC20", icon: "usdt", enabled: true, channelId: "usdt-trc20", badge: "Hot" },
        { id: "usdt_bep20", label: "USDT-BEP20", icon: "usdt", enabled: true, channelId: "usdt-bep20", badge: "Fast" }
      ],
      channels: [
        { id: "usdt-trc20", label: "TronPay-USDT (TRC20)", type: "crypto", enabled: true, min: 10, max: 100000, usdtRate: 98, range: "10 - 100K USDT", icon: "usdt" },
        { id: "usdt-bep20", label: "Binance-USDT (BEP20)", type: "crypto", enabled: true, min: 10, max: 100000, usdtRate: 98, range: "10 - 100K USDT", icon: "usdt" }
      ]
    }
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
