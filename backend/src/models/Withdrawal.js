const mongoose = require("mongoose");

const WithdrawalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    fees: {
      type: Number,
      default: 0.0,
    },
    netAmount: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ["bank", "crypto"],
      required: true,
    },
    // For bank withdrawals
    bankName: {
      type: String,
      default: "",
    },
    bankCardNumber: {
      type: String,
      default: "",
    },
    bankCardHolder: {
      type: String,
      default: "",
    },
    // For crypto withdrawals
    cryptoAddress: {
      type: String,
      default: "",
    },
    cryptoNetwork: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "completed", "rejected"],
      default: "pending",
      index: true,
    },
    comments: {
      type: String,
      default: "",
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Withdrawal", WithdrawalSchema);
