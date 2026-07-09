const express = require("express");
const authRoutes = require("./auth.routes");
const userRoutes = require("./user.routes");
const walletRoutes = require("./wallet.routes");
const agentRoutes = require("./agent.routes");
const platformRoutes = require("./platform.routes");
const giftRoutes = require("./gift.routes");
const gameRoutes = require("./game.routes");
const adminRoutes = require("./admin.routes");

const router = express.Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/wallet", walletRoutes);
router.use("/agents", agentRoutes);
router.use("/platform", platformRoutes);
router.use("/gifts", giftRoutes);
router.use("/admin", adminRoutes);

// Games and transactions have subroutes directly under root in api contracts
router.use(gameRoutes); 
router.use(walletRoutes); // Bind transactions endpoint here

module.exports = router;
