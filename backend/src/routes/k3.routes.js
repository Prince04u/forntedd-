const express = require("express");
const {
  getCurrentK3Period,
  getK3Results,
  placeK3Bet,
  getK3Bets,
} = require("../controllers/k3.controller");
const { protect } = require("../middlewares/auth");

const router = express.Router();

router.get("/:duration/current", protect, getCurrentK3Period);
router.get("/:duration/results", getK3Results);
router.post("/:duration/bet", protect, placeK3Bet);
router.get("/bets/my", protect, getK3Bets);

module.exports = router;
