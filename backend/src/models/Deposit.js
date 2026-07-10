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
    address: {
      type: String,
      trim: true,
      default: "", // The assigned rotating address for this deposit
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
    paymentId: {
      type: String,
      default: "",
      index: true,
    },
    payAmount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Deposit", DepositSchema);
