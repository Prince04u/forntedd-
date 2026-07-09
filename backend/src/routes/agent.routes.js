const express = require("express");
const {
  getAgentStatus,
  getAgentDashboard,
  getAgentDownline,
  getAgentCommissions,
  getAgentPayoutRequests,
  createAgentPayoutRequest,
} = require("../controllers/agent.controller");
const { protect } = require("../middlewares/auth");

const router = express.Router();

router.get("/me/status", protect, getAgentStatus);
router.get("/me", protect, getAgentDashboard);
router.get("/me/downline", protect, getAgentDownline);
router.get("/me/commissions", protect, getAgentCommissions);
router.get("/me/payout-requests", protect, getAgentPayoutRequests);
router.post("/me/payout-requests", protect, createAgentPayoutRequest);

module.exports = router;
