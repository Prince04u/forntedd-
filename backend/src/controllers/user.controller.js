const User = require("../models/User");
const Wallet = require("../models/Wallet");
const KycDocument = require("../models/KycDocument");
const Feedback = require("../models/Feedback");

const getProfile = async (req, res, next) => {
  try {
    const user = req.user;
    const wallet = await Wallet.findOne({ user: user._id });

    return res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        mobile: user.mobile,
        inviteCode: user.inviteCode,
        role: user.role,
        kycStatus: "approved", // auto verify/mock
        wallet: {
          balance: wallet ? wallet.balance : 0,
          commissionBalance: wallet ? wallet.commissionBalance : 0,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: "Profile name is required." });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name },
      { new: true }
    );

    return res.json({
      success: true,
      message: "Profile updated successfully.",
      data: {
        id: user._id,
        name: user.name,
        mobile: user.mobile,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getKycStatus = async (req, res, next) => {
  try {
    const kyc = await KycDocument.findOne({ user: req.user._id });
    if (!kyc) {
      return res.json({ success: true, data: { status: "none" } });
    }
    return res.json({ success: true, data: kyc });
  } catch (error) {
    return next(error);
  }
};

const submitKycDocument = async (req, res, next) => {
  try {
    const { documentType, documentNumber } = req.body;
    if (!documentType || !documentNumber) {
      return res.status(400).json({ message: "Document type and document number are required." });
    }

    let kyc = await KycDocument.findOne({ user: req.user._id });
    if (kyc) {
      kyc.documentType = documentType;
      kyc.documentNumber = documentNumber;
      kyc.status = "pending";
      await kyc.save();
    } else {
      kyc = new KycDocument({
        user: req.user._id,
        documentType,
        documentNumber,
        status: "pending",
      });
      await kyc.save();
    }

    return res.json({ success: true, message: "KYC documents details saved.", data: kyc });
  } catch (error) {
    return next(error);
  }
};

const uploadKycDocument = async (req, res, next) => {
  try {
    const { documentType, documentNumber } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ message: "Please upload document file." });
    }

    let kyc = await KycDocument.findOne({ user: req.user._id });
    const filePath = `/uploads/kyc/${file.filename}`;

    if (kyc) {
      kyc.documentType = documentType || kyc.documentType;
      kyc.documentNumber = documentNumber || kyc.documentNumber;
      kyc.files.push(filePath);
      kyc.status = "pending";
      await kyc.save();
    } else {
      kyc = new KycDocument({
        user: req.user._id,
        documentType: documentType || "ID Card",
        documentNumber: documentNumber || "123456",
        files: [filePath],
        status: "pending",
      });
      await kyc.save();
    }

    return res.json({ success: true, message: "KYC document uploaded successfully.", data: kyc });
  } catch (error) {
    return next(error);
  }
};

const getNotifications = async (req, res) => {
  // Mock standard user notifications
  const mockNotifications = [
    {
      id: "welcome-alert",
      title: "Welcome to Lucky Nova!",
      content: "Start your adventure by making your first deposit. Enjoy high payout ratios on Wingo & Mines!",
      read: true,
      createdAt: new Date(),
    },
  ];
  return res.json({ success: true, data: mockNotifications });
};

const markNotificationRead = async (req, res) => {
  return res.json({ success: true, message: "Notification marked read." });
};

const markAllNotificationsRead = async (req, res) => {
  return res.json({ success: true, message: "All notifications marked read." });
};

const submitFeedback = async (req, res, next) => {
  try {
    const { contact, message } = req.body;
    if (!message) {
      return res.status(400).json({ message: "Message body is required." });
    }

    const ticket = new Feedback({
      user: req.user._id,
      contact: contact || "",
      message,
    });
    await ticket.save();

    return res.status(201).json({ success: true, message: "Support ticket registered successfully.", data: ticket });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getKycStatus,
  submitKycDocument,
  uploadKycDocument,
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  submitFeedback,
};
