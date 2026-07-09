const mongoose = require("mongoose");

const TransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: ["deposit", "withdrawal", "game_bet", "game_win", "referral_commission", "admin_adjustment"],
    },
    amount: {
      type: Number,
      required: true,
    },
    direction: {
      type: String,
      required: true,
      enum: ["credit", "debit"],
    },
    prevBalance: {
      type: Number,
      required: true,
    },
    postBalance: {
      type: Number,
      required: true,
    },
    refId: {
      type: String,
      default: null,
    },
    description: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Transaction", TransactionSchema);
