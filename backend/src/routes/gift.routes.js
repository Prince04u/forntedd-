const express = require("express");
const {
  getGiftStatus,
  claimDailyGift,
  redeemGiftCode,
  getRedemptionHistory,
} = require("../controllers/gift.controller");
const { protect } = require("../middlewares/auth");

const router = express.Router();

router.get("/status", protect, getGiftStatus);
router.post("/claim", protect, claimDailyGift);
router.post("/redeem", protect, redeemGiftCode);
router.get("/history", protect, getRedemptionHistory);

module.exports = router;
