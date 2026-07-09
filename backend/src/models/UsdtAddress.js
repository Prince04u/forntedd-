const mongoose = require("mongoose");

const UsdtAddressSchema = new mongoose.Schema({
  network: { type: String, required: true, enum: ["TRC20", "BEP20"] },
  address: { type: String, required: true, trim: true },
  label: { type: String, default: "" },
  qrCodeUrl: { type: String, default: "" },
  active: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("UsdtAddress", UsdtAddressSchema);
