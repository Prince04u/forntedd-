const mongoose = require("mongoose");

const DepositSchema = new mongoose.Schema(
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
    channel: {
      type: String,
      required: true, // e.g. "TRC20", "BEP20", "ERC20"
    },
    txHash: {
      type: String,
      trim: true,
      default: "",
    },
    proofImage: {
      type: String,
      default: "", // Path to uploaded screenshot file
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    comments: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Deposit", DepositSchema);
