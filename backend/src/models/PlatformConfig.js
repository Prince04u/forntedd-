const mongoose = require("mongoose");

const PlatformConfigSchema = new mongoose.Schema(
  {
    isMaintenance: {
      type: Boolean,
      default: false,
    },
    // USDT Deposit Addresses
    usdt_trc20: {
      type: String,
      default: "T9yD14Nj9j7xAB4dbGeiX9h8unkKHxuWwb", // Example TRON address
    },
    usdt_bep20: {
      type: String,
      default: "0x0000000000000000000000000000000000000000",
    },
    usdt_erc20: {
      type: String,
      default: "0x0000000000000000000000000000000000000000",
    },
    enableTRC20: {
      type: Boolean,
      default: true,
    },
    enableBEP20: {
      type: Boolean,
      default: false,
    },
    enableERC20: {
      type: Boolean,
      default: false,
    },
    // Withdrawal Bounds
    minWithdraw: {
      type: Number,
      default: 100.0,
    },
    maxWithdraw: {
      type: Number,
      default: 50000.0,
    },
    withdrawFeePercent: {
      type: Number,
      default: 2.0, // 2% withdrawal fee
    },
    // Game House Edge, limits config
    wingoConfig: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        minBet: 10,
        maxBet: 50000,
        houseEdgePercent: 3.0,
      },
    },
    minesConfig: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        minBet: 10,
        maxBet: 20000,
        houseEdgePercent: 4.0,
      },
    },
    aviatorConfig: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        minBet: 10,
        maxBet: 50000,
        houseEdgePercent: 5.0,
      },
    },
    diceConfig: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        minBet: 10,
        maxBet: 30000,
        houseEdgePercent: 2.0,
      },
    },
    // Referral configuration rates
    referralCommissionRates: {
      type: [Number],
      default: [0.02, 0.01, 0.005], // Tier 1: 2%, Tier 2: 1%, Tier 3: 0.5%
    },
    dailyClaimReward: {
      type: Number,
      default: 10.0, // ₹10 default daily claim credit
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PlatformConfig", PlatformConfigSchema);
