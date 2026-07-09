const mongoose = require("mongoose");

const AnnouncementSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["marquee", "popup"],
      default: "marquee",
    },
    content: {
      type: String,
      required: true,
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Announcement", AnnouncementSchema);
