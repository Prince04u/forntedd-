const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  getProfile,
  updateProfile,
  getKycStatus,
  submitKycDocument,
  uploadKycDocument,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  submitFeedback,
} = require("../controllers/user.controller");
const { protect } = require("../middlewares/auth");

const router = express.Router();

// Configure multer storage for KYC uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.env.UPLOADS_DIR || "./uploads", "kyc");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${req.user._id}-kyc-${Date.now()}${path.extname(file.originalname)}`);
  },
});

const upload = multer({ storage });

router.get("/me", protect, getProfile);
router.patch("/me", protect, updateProfile);

router.get("/me/kyc", protect, getKycStatus);
router.post("/me/kyc/documents", protect, submitKycDocument);
router.post("/me/kyc/documents/upload", protect, upload.single("document"), uploadKycDocument);

router.get("/me/notifications", protect, getNotifications);
router.patch("/me/notifications/:id/read", protect, markNotificationRead);
router.patch("/me/notifications/read-all", protect, markAllNotificationsRead);

router.post("/me/feedback", protect, submitFeedback);

module.exports = router;
