const mongoose = require("mongoose");

const BetSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    game: {
      type: String,
      required: true,
      enum: ["wingo", "mines", "aviator", "dice"],
      index: true,
    },
    periodId: {
      type: String,
      default: "",
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    winAmount: {
      type: Number,
      default: 0.0,
    },
    payoutRatio: {
      type: Number,
      default: 0.0,
    },
    state: {
      type: String,
      enum: ["pending", "won", "lost", "refunded"],
      default: "pending",
      index: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    seed: {
      type: String,
      default: "",
    },
    hash: {
      type: String,
      default: "",
    },
    nonce: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Bet", BetSchema);
