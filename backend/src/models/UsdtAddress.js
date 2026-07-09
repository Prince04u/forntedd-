const mongoose = require("mongoose");

const UsdtAddressSchema = new mongoose.Schema(
  {
    address: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    label: {
      type: String,
      trim: true,
      default: "", // Description label for dashboard identification
    },
    network: {
      type: String,
      enum: ["TRC20", "BEP20", "ERC20"],
      default: "TRC20",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    useCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("UsdtAddress", UsdtAddressSchema);
