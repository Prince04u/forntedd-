const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Wallet = require("../models/Wallet");
const logger = require("../config/logger");

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "luckynova-super-secret-jwt-key-2026", {
    expiresIn: "30d",
  });
};

const register = async (req, res, next) => {
  try {
    const { name, mobile, password, referralCode } = req.body;

    if (!name || !mobile || !password) {
      return res.status(400).json({ message: "Name, phone number, and password are required." });
    }

    const existingUser = await User.findOne({ mobile });
    if (existingUser) {
      return res.status(400).json({ message: "Phone number is already registered." });
    }

    let referredBy = null;
    if (referralCode) {
      const parent = await User.findOne({ inviteCode: referralCode.trim().toUpperCase() });
      if (parent) {
        referredBy = parent._id;
      }
    }

    // Generate unique referral code
    let inviteCode = "";
    let codeExists = true;
    while (codeExists) {
      inviteCode = "LN" + Math.random().toString(36).substring(2, 8).toUpperCase();
      const checkCode = await User.findOne({ inviteCode });
      if (!checkCode) {
        codeExists = false;
      }
    }

    const user = new User({
      name,
      mobile,
      password,
      inviteCode,
      referredBy,
    });

    await user.save();

    // Create user wallet
    const wallet = new Wallet({ user: user._id });
    await wallet.save();

    logger.info(`New player registered: ${mobile} (Invite: ${inviteCode})`);

    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        token,
        role: user.role,
        profile: {
          id: user._id,
          name: user.name,
          mobile: user.mobile,
          inviteCode: user.inviteCode,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { mobile, password } = req.body;

    if (!mobile || !password) {
      return res.status(400).json({ message: "Phone number and password are required." });
    }

    const user = await User.findOne({ mobile });
    if (!user) {
      return res.status(401).json({ message: "Invalid phone number or password." });
    }

    if (user.status === "suspended") {
      return res.status(403).json({ message: "Your account is suspended. Please contact support." });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid phone number or password." });
    }

    const token = generateToken(user._id);

    logger.info(`User logged in: ${mobile}`);

    return res.json({
      success: true,
      message: "Login successful",
      data: {
        token,
        role: user.role,
        profile: {
          id: user._id,
          name: user.name,
          mobile: user.mobile,
          inviteCode: user.inviteCode,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "Old password and new password are required." });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect old password." });
    }

    user.password = newPassword;
    await user.save();

    logger.info(`User changed password: ${user.mobile}`);

    return res.json({ success: true, message: "Password updated successfully." });
  } catch (error) {
    return next(error);
  }
};

const sendOtp = async (req, res) => {
  const { mobile } = req.body;
  logger.info(`Sending mock verification OTP for ${mobile}`);
  return res.json({ success: true, message: "OTP sent successfully (Dev mockup: use code 123456)." });
};

const verifyOtp = async (req, res) => {
  const { mobile, code } = req.body;
  if (code === "123456" || code === 123456) {
    return res.json({ success: true, message: "OTP verified successfully." });
  }
  return res.status(400).json({ message: "Invalid or expired verification OTP." });
};

module.exports = { register, login, changePassword, sendOtp, verifyOtp };
