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

    const amount = Number(req.query.amount); // USDT amount from frontend, e.g. 10

    if (amount > 0 && req.user) {
      const Deposit = require("../models/Deposit");
      const { httpsGet, httpsPost } = require("../utils/http");
      const { sendTelegramNotification } = require("../utils/telegram");
      const logger = require("../config/logger");

      const apiKey = "0C95QTK-86K4WRF-PXH4VNN-4BBWACM";
      const payCurrency = isBep20 ? "usdtbsc" : "usdttrc20";

      // Fetch dynamic min limit from NOWPayments
      let minLimit = 19; // Safe default fallback
      try {
        const minData = await httpsGet(
          `https://api.nowpayments.io/v1/min-amount?currency_from=usd&currency_to=${payCurrency}`,
          { "x-api-key": apiKey }
        );
        if (minData && minData.min_amount) {
          minLimit = Number(minData.min_amount) + 0.1; // Add slight buffer
        }
      } catch (err) {
        logger.warn(`Failed to fetch NOWPayments minimal limit: ${err.message}`);
      }

      // If the deposit amount meets the NOWPayments minimal limit, use automated checkout!
      if (amount >= minLimit) {
        // Find an existing pending deposit created in the last 15 minutes for this user, network, and amount
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        let deposit = await Deposit.findOne({
          user: req.user._id,
          channel: network,
          payAmount: { $gt: 0 },
          status: "pending",
          createdAt: { $gte: fifteenMinutesAgo }
        });

        if (!deposit) {
          // Create new local deposit document first to get the unique Mongo ObjectId for order_id
          deposit = new Deposit({
            user: req.user._id,
            amount: Math.round(amount * 98), // Convert to INR
            channel: network,
            status: "pending",
            address: "generating..."
          });
          await deposit.save();

          try {
            const callbackUrl = `${req.secure ? 'https' : 'http'}://${req.headers.host}/api/platform/deposit/nowpayments-callback`;

            const npResponse = await httpsPost(
              "https://api.nowpayments.io/v1/payment",
              { "x-api-key": apiKey },
              {
                price_amount: amount,
                price_currency: "usd",
                pay_amount: amount,
                pay_currency: payCurrency,
                ipn_callback_url: callbackUrl,
                order_id: deposit._id.toString(),
                is_fee_paid_by_user: true
              }
            );

            if (npResponse && npResponse.payment_id) {
              deposit.paymentId = npResponse.payment_id;
              deposit.address = npResponse.pay_address;
              deposit.payAmount = npResponse.pay_amount || npResponse.price_amount || amount;
              await deposit.save();

              // Send Telegram "Created👀" notification
              await sendTelegramNotification(deposit, req.user, "created");
            } else {
              throw new Error(npResponse?.message || "Failed to create payment session on NOWPayments.");
            }
          } catch (err) {
            // Rollback the local deposit if NOWPayments initiation failed
            await Deposit.findByIdAndDelete(deposit._id);
            logger.error("Failed to initialize NOWPayments transaction:", err);
            return res.status(400).json({
              success: false,
              message: err.message || "Failed to initialize payment gateway. Please ensure your deposit amount meets the minimum required limit."
            });
          }
        }

        return res.json({
          success: true,
          data: {
            type: "crypto",
            walletAddress: deposit.address,
            qrCodeUrl: "", // Canvas renders QR code in frontend
            networkLabel: networkLabel,
            usdtRate: 98,
            channelLabel: isBep20 ? "Binance-USDT (BEP20)" : "TronPay-USDT (TRC20)",
            payAmount: deposit.payAmount,
            depositId: deposit._id.toString()
          }
        });
      }
    }

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

const nowpaymentsCallback = async (req, res, next) => {
  try {
    const { payment_id, payment_status, order_id } = req.body;
    const logger = require("../config/logger");
    
    logger.info(`Received NOWPayments callback for payment_id: ${payment_id}, status: ${payment_status}, order_id: ${order_id}`);

    if (!payment_id || !order_id) {
      return res.status(400).json({ message: "Missing required fields." });
    }

    // Call NOWPayments GET endpoint to verify status securely using our API key
    const apiKey = "0C95QTK-86K4WRF-PXH4VNN-4BBWACM";
    const { httpsGet } = require("../utils/http");
    
    const verifyData = await httpsGet(
      `https://api.nowpayments.io/v1/payment/${payment_id}`,
      { "x-api-key": apiKey }
    );

    if (!verifyData || !verifyData.payment_status) {
      return res.status(400).json({ message: "Failed to verify payment status on NOWPayments API." });
    }

    const realStatus = verifyData.payment_status; // "finished", "confirmed", "failed", "expired"
    
    const Deposit = require("../models/Deposit");
    const User = require("../models/User");
    const Wallet = require("../models/Wallet");
    const Transaction = require("../models/Transaction");
    const { sendTelegramNotification } = require("../utils/telegram");

    const deposit = await Deposit.findById(order_id);
    if (!deposit) {
      return res.status(404).json({ message: "Deposit not found." });
    }

    const user = await User.findById(deposit.user);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (deposit.status !== "pending") {
      return res.json({ success: true, message: "Payment already processed." });
    }

    if (realStatus === "finished" || realStatus === "confirmed") {
      deposit.status = "approved";
      await deposit.save();

      let wallet = await Wallet.findOne({ user: user._id });
      if (!wallet) {
        wallet = new Wallet({ user: user._id, balance: 0 });
      }
      wallet.balance += deposit.amount;
      await wallet.save();

      const transaction = new Transaction({
        user: user._id,
        type: "deposit",
        amount: deposit.amount,
        status: "completed",
        description: `USDT Auto Deposit via NOWPayments`,
      });
      await transaction.save();

      await sendTelegramNotification(deposit, user, "success");
      logger.info(`Deposit ${deposit._id} auto-approved and credited: ₹${deposit.amount}`);
    } else if (realStatus === "failed" || realStatus === "expired") {
      deposit.status = "rejected";
      await deposit.save();

      await sendTelegramNotification(deposit, user, "failed");
      logger.info(`Deposit ${deposit._id} automatically rejected (NOWPayments: ${realStatus})`);
    }

    return res.json({ success: true });
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
        { id: "usdt-trc20", label: "TronPay-USDT (TRC20)", type: "crypto", enabled: true, min: 12, max: 100000, usdtRate: 98, range: "12 - 100K USDT", icon: "usdt" },
        { id: "usdt-bep20", label: "Binance-USDT (BEP20)", type: "crypto", enabled: true, min: 1, max: 100000, usdtRate: 98, range: "1 - 100K USDT", icon: "usdt" }
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
  nowpaymentsCallback,
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
