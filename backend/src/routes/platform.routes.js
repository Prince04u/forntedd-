const express = require("express");
const {
  getPlatformStatus,
  getDepositPayment,
  nowpaymentsCallback,
  syncPendingDeposits,
  getIncomingLogs,
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
const { protect } = require("../middlewares/auth");

const router = express.Router();

router.get("/status", getPlatformStatus);
router.get("/deposit-payment", protect, getDepositPayment);
router.post("/deposit/nowpayments-callback", nowpaymentsCallback);
router.get("/deposit/sync-pending", syncPendingDeposits);
router.get("/promos", getPromoBanners);
router.get("/announcements", getAnnouncements);
router.get("/wingo-config", getWingoConfig);
router.get("/mines-config", getMinesConfig);
router.get("/aviator-config", getAviatorConfig);
router.get("/dice-config", getDiceConfig);
router.get("/deposit-options", getDepositOptions);
router.get("/wallet-rules", getWalletRules);
router.get("/vip", getVipProgram);
router.get("/deposit/debug-logs", getIncomingLogs);

module.exports = router;
