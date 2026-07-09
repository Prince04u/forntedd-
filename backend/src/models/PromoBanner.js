const mongoose = require("mongoose");

const PromoBannerSchema = new mongoose.Schema(
  {
    image: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      default: "",
    },
    link: {
      type: String,
      default: "",
    },
    order: {
      type: Number,
      default: 0,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("PromoBanner", PromoBannerSchema);
