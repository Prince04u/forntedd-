const mongoose = require("mongoose");

const GiftCodeSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    rewardAmount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    maxClaims: {
      type: Number,
      required: true,
      min: 1,
    },
    claimedCount: {
      type: Number,
      default: 0,
    },
    claimedUsers: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("GiftCode", GiftCodeSchema);
