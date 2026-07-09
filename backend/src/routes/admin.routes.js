const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  getActiveBetsSummary,
  getUsers,
  getUserProfile,
  getUserFullDetails,
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
  getUsdtAddresses,
  addUsdtAddress,
  deleteUsdtAddress,
  toggleUsdtAddress,
  toggleUserBan,
  getPromoBanners,
  updatePromoBanner,
  getWingoBetsStats,
  createGiftCode,
  getGiftCodes,
  toggleGiftCode,
} = require("../controllers/admin.controller");
const { protect, adminOnly } = require("../middlewares/auth");

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.env.UPLOADS_DIR || "./uploads", "qrcodes");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `qr-${Date.now()}${path.extname(file.originalname)}`);
  },
});
const upload = multer({ storage });

const bannerStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.env.UPLOADS_DIR || "./uploads", "banners");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `banner-${Date.now()}${path.extname(file.originalname)}`);
  },
});
const uploadBanner = multer({ storage: bannerStorage });

const router = express.Router();

// Apply admin locks to all subroutes
router.use(protect);
router.use(adminOnly);

router.get("/games/active-bets", getActiveBetsSummary);
router.get("/games/wingo/stats", getWingoBetsStats);

router.get("/users", getUsers);
router.get("/users/:id", getUserProfile);
router.get("/users/:id/details", getUserFullDetails);
router.patch("/users/:id", updateUserProfile);
router.patch("/users/:id/toggle-ban", toggleUserBan);
router.patch("/users/:id/kyc", updateUserKyc);
router.post("/users/:id/wallet", adjustUserBalance);

router.get("/transactions", getTransactions);

router.get("/deposits", getDeposits);
router.patch("/deposits/:id", processDepositApproval);

router.get("/withdrawals", getWithdrawals);
router.patch("/withdrawals/:id", processWithdrawalApproval);

router.get("/config/usdt", getUsdtSettings);
router.patch("/config/usdt", updateUsdtSettings);

router.get("/config/usdt/addresses", getUsdtAddresses);
router.post("/config/usdt/addresses", upload.single("qrCode"), addUsdtAddress);
router.delete("/config/usdt/addresses/:id", deleteUsdtAddress);
router.patch("/config/usdt/addresses/:id/toggle", toggleUsdtAddress);

router.get("/config/withdraw", getWithdrawSettings);
router.patch("/config/withdraw", updateWithdrawSettings);

router.get("/games", getGamesOverview);
router.patch("/games/:gameId", updateGameConfig);
router.patch("/games/:gameId/result", overrideGameResult);

router.get("/referral", getReferralConfig);
router.patch("/referral", updateReferralConfig);

router.get("/promos", getPromoBanners);
router.post("/promos", uploadBanner.single("imageFile"), managePromoBanners);
router.patch("/promos/:id", updatePromoBanner);
router.delete("/promos/:id", deletePromoBanner);

router.post("/announcements", createAnnouncement);
router.delete("/announcements/:id", deleteAnnouncement);

router.get("/support/tickets", getSupportTickets);
router.patch("/support/tickets/:id", replySupportTicket);

router.get("/analytics", getAnalytics);

router.get("/gifts", getGiftCodes);
router.post("/gifts", createGiftCode);
router.patch("/gifts/:id/toggle", toggleGiftCode);

module.exports = router;
