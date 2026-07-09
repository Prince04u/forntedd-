const express = require("express");
const {
  getPlatformStatus,
  getDepositPayment,
  getPromoBanners,
  getAnnouncements,
  getWingoConfig,
  getMinesConfig,
  getAviatorConfig,
  getDiceConfig,
  getDepositOptions,
  getWalletRules,
  getVipProgram,
} = require("../controllers/platform.controller");

const router = express.Router();

router.get("/status", getPlatformStatus);
router.get("/deposit-payment", getDepositPayment);
router.get("/promos", getPromoBanners);
router.get("/announcements", getAnnouncements);
router.get("/wingo-config", getWingoConfig);
router.get("/mines-config", getMinesConfig);
router.get("/aviator-config", getAviatorConfig);
router.get("/dice-config", getDiceConfig);
router.get("/deposit-options", getDepositOptions);
router.get("/wallet-rules", getWalletRules);
router.get("/vip", getVipProgram);

module.exports = router;
