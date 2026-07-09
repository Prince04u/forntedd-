const mongoose = require("mongoose");

const WalletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    balance: {
      type: Number,
      default: 0.0,
      min: 0.0,
    },
    commissionBalance: {
      type: Number,
      default: 0.0,
      min: 0.0,
    },
    isLocked: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Wallet", WalletSchema);
