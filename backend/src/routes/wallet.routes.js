const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  getBalance,
  getTransactions,
  requestDeposit,
  uploadDepositProof,
  getDeposits,
  getWithdrawals,
  getWithdrawContext,
  getWithdrawAccounts,
  addWithdrawAccount,
  deleteWithdrawAccount,
  updateWithdrawAccountPreferences,
  requestWithdraw,
  fetchDepositProofBlob,
} = require("../controllers/wallet.controller");
const { protect } = require("../middlewares/auth");

const router = express.Router();

// Configure multer storage for deposit proofs
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.env.UPLOADS_DIR || "./uploads", "proofs");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${req.user._id}-proof-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

router.get("/balance", protect, getBalance);
router.get("/deposits", protect, getDeposits);
router.get("/deposits/:id/proof", protect, fetchDepositProofBlob);
router.get("/withdrawals", protect, getWithdrawals);
router.get("/withdraw/context", protect, getWithdrawContext);

router.get("/withdraw/accounts", protect, getWithdrawAccounts);
router.post("/withdraw/accounts", protect, addWithdrawAccount);
router.delete("/withdraw/accounts/:id", protect, deleteWithdrawAccount);
router.patch("/withdraw/accounts/preferences", protect, updateWithdrawAccountPreferences);

router.post("/deposit/request", protect, requestDeposit);
router.post("/deposit/proof", protect, upload.single("proof"), uploadDepositProof);
router.post("/withdraw/request", protect, requestWithdraw);

module.exports = router;
