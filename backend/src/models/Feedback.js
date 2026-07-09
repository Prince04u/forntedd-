const mongoose = require("mongoose");

const FeedbackSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    contact: {
      type: String,
      default: "",
    },
    message: {
      type: String,
      required: true,
    },
    reply: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "resolved"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Feedback", FeedbackSchema);
