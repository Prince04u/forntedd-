const mongoose = require("mongoose");

const WithdrawalAccountSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["bank", "crypto"],
      required: true,
    },
    label: {
      type: String,
      default: "",
    },
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
    cryptoAddress: {
      type: String,
      default: "",
    },
    cryptoNetwork: {
      type: String,
      default: "",
    },
    isPreferred: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("WithdrawalAccount", WithdrawalAccountSchema);
