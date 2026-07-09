const express = require("express");
const { getGiftStatus, claimDailyGift } = require("../controllers/gift.controller");
const { protect } = require("../middlewares/auth");

const router = express.Router();

router.get("/status", protect, getGiftStatus);
router.post("/claim", protect, claimDailyGift);

module.exports = router;
