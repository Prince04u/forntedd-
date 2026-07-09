const express = require("express");
const {
  getUsers,
  getUserProfile,
  updateUserProfile,
  updateUserKyc,
  adjustUserBalance,
  getTransactions,
  getDeposits,
  processDepositApproval,
  getWithdrawals,
  processWithdrawalApproval,
  getUsdtSettings,
  updateUsdtSettings,
  getWithdrawSettings,
  updateWithdrawSettings,
  getGamesOverview,
  updateGameConfig,
  overrideGameResult,
  getReferralConfig,
  updateReferralConfig,
  managePromoBanners,
  deletePromoBanner,
  createAnnouncement,
  deleteAnnouncement,
  getSupportTickets,
  replySupportTicket,
  getAnalytics,
} = require("../controllers/admin.controller");
const { protect, adminOnly } = require("../middlewares/auth");

const router = express.Router();

// Apply admin locks to all subroutes
router.use(protect);
router.use(adminOnly);

router.get("/users", getUsers);
router.get("/users/:id", getUserProfile);
router.patch("/users/:id", updateUserProfile);
router.patch("/users/:id/kyc", updateUserKyc);
router.post("/users/:id/wallet", adjustUserBalance);

router.get("/transactions", getTransactions);

router.get("/deposits", getDeposits);
router.patch("/deposits/:id", processDepositApproval);

router.get("/withdrawals", getWithdrawals);
router.patch("/withdrawals/:id", processWithdrawalApproval);

router.get("/config/usdt", getUsdtSettings);
router.patch("/config/usdt", updateUsdtSettings);

router.get("/config/withdraw", getWithdrawSettings);
router.patch("/config/withdraw", updateWithdrawSettings);

router.get("/games", getGamesOverview);
router.patch("/games/:gameId", updateGameConfig);
router.patch("/games/:gameId/result", overrideGameResult);

router.get("/referral", getReferralConfig);
router.patch("/referral", updateReferralConfig);

router.post("/promos", managePromoBanners);
router.delete("/promos/:id", deletePromoBanner);

router.post("/announcements", createAnnouncement);
router.delete("/announcements/:id", deleteAnnouncement);

router.get("/support/tickets", getSupportTickets);
router.patch("/support/tickets/:id", replySupportTicket);

router.get("/analytics", getAnalytics);

module.exports = router;
