const express = require("express");
const { register, login, changePassword, sendOtp, verifyOtp } = require("../controllers/auth.controller");
const { protect } = require("../middlewares/auth");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/change-password", protect, changePassword);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);

module.exports = router;
