const express = require("express");
const {
  getCurrentPeriod,
  getRecentResults,
  placeWingoBet,
  getWingoBets,
  getActiveMinesGame,
  startMinesGame,
  revealMinesTile,
  cashOutMines,
  getMinesBets,
  placeAviatorBet,
  cashOutAviator,
  getAviatorBets,
  getRecentAviatorRounds,
  rollDice,
  getDiceRolls,
} = require("../controllers/game.controller");
const { protect } = require("../middlewares/auth");

const router = express.Router();

// Wingo routes
router.get("/wingo/:duration/current", protect, getCurrentPeriod);
router.get("/wingo/:duration/results", getRecentResults);
router.post("/wingo/:duration/bet", protect, placeWingoBet);
router.get("/wingo/bets/my", protect, getWingoBets);

// Mines routes
router.get("/mines/active", protect, getActiveMinesGame);
router.post("/mines/start", protect, startMinesGame);
router.post("/mines/reveal", protect, revealMinesTile);
router.post("/mines/cashout", protect, cashOutMines);
router.get("/mines/bets/my", protect, getMinesBets);

// Aviator routes
router.post("/aviator/bet", protect, placeAviatorBet);
router.post("/aviator/cashout", protect, cashOutAviator);
router.get("/aviator/bets/my", protect, getAviatorBets);
router.get("/aviator/rounds/recent", getRecentAviatorRounds);

// Dice routes
router.post("/dice/roll", protect, rollDice);
router.get("/dice/rolls/my", protect, getDiceRolls);

module.exports = router;
