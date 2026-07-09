const mongoose = require("mongoose");

const PeriodSchema = new mongoose.Schema(
  {
    game: {
      type: String,
      required: true,
      enum: ["wingo", "aviator"],
      index: true,
    },
    duration: {
      type: String,
      default: "", // for wingo: "30s", "1m", "3m", "5m"
      index: true,
    },
    periodId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active",
      index: true,
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
      default: null, // e.g. { number: 7, color: "green", size: "big" } or { crashPoint: 1.85 }
    },
    resultOverridden: {
      type: Boolean,
      default: false,
    },
    overrideResult: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Period", PeriodSchema);
