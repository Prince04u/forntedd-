require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const connectDB = require("./config/db");
const logger = require("./config/logger");
const { initSocket } = require("./services/socket.service");
const { initWingoGame } = require("./services/wingo.service");
const { initAviatorGame } = require("./services/aviator.service");

// Models for seed data checks
const PlatformConfig = require("./models/PlatformConfig");
const User = require("./models/User");
const Wallet = require("./models/Wallet");

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  // Connect to database
  await connectDB();

  // Seed default configuration parameters if empty
  await seedDefaultConfig();

  // Seed initial Admin Account for panel controls
  await seedDefaultAdmin();

  // Create HTTP Server
  const server = http.createServer(app);

  // Bind Socket.IO instance
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  // Initialize socket room bindings
  initSocket(io);

  // Initialize background game loops
  await initWingoGame();
  initAviatorGame();

  server.listen(PORT, () => {
    logger.info(`Lucky Nova backend server successfully started on port ${PORT}`);
  });
};

const seedDefaultConfig = async () => {
  try {
    const check = await PlatformConfig.findOne();
    if (!check) {
      const config = new PlatformConfig();
      await config.save();
      logger.info("Default platform configurations seeded successfully.");
    }
  } catch (error) {
    logger.error(`Error seeding platform configurations: ${error.message}`);
  }
};

const seedDefaultAdmin = async () => {
  try {
    const adminPhone = "9999999999";
    const checkAdmin = await User.findOne({ mobile: adminPhone });

    if (!checkAdmin) {
      const admin = new User({
        name: "Platform Manager",
        mobile: adminPhone,
        password: "adminpassword123", // Will be automatically encrypted by mongoose schema hook
        role: "admin",
        inviteCode: "ADMIN99",
      });
      await admin.save();

      const wallet = new Wallet({ user: admin._id, balance: 100000.0 });
      await wallet.save();

      logger.info(`Default Admin Account seeded. Mobile: ${adminPhone}, Password: adminpassword123`);
    }
  } catch (error) {
    logger.error(`Error seeding default admin account: ${error.message}`);
  }
};

startServer();
