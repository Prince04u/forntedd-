require("dotenv").config();
const http = require("http");
const { Server } = require("socket.io");
const app = require("./app");
const connectDB = require("./config/db");
const logger = require("./config/logger");
const { initSocket } = require("./services/socket.service");
const { initWingoGame } = require("./services/wingo.service");
const { initAviatorGame } = require("./services/aviator.service");
const { initK3Game } = require("./services/k3.service");

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

  // Run user UIDs sequence migration
  await migrateUserUIDs();

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
  await initK3Game();
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
    let admin = await User.findOne({ mobile: adminPhone });

    if (!admin) {
      admin = new User({
        name: "Platform Manager",
        mobile: adminPhone,
        password: "adminpassword123", // Will be encrypted by pre-save schema hook
        role: "admin",
        inviteCode: "ADMIN99",
      });
      await admin.save();

      const wallet = new Wallet({ user: admin._id, balance: 100000.0 });
      await wallet.save();

      logger.info(`Default Admin Account seeded. Mobile: ${adminPhone}, Password: adminpassword123`);
    } else {
      // Force verify role and password
      admin.role = "admin";
      admin.password = "adminpassword123";
      await admin.save();
      logger.info(`Default Admin Account verified/updated in database.`);
    }
  } catch (error) {
    logger.error(`Error seeding default admin account: ${error.message}`);
  }
};

const migrateUserUIDs = async () => {
  try {
    const usersWithoutUid = await User.find({ uid: { $exists: false } });
    if (usersWithoutUid.length > 0) {
      let nextUid = 509201;
      const highestUser = await User.findOne({ uid: { $exists: true } }).sort({ uid: -1 });
      if (highestUser && highestUser.uid) {
        nextUid = highestUser.uid + 1;
      }

      for (const user of usersWithoutUid) {
        user.uid = nextUid;
        nextUid += 1;
        await user.save();
      }
      logger.info(`Successfully migrated ${usersWithoutUid.length} players with numeric UIDs starting from ${509201}.`);
    }
  } catch (err) {
    logger.error(`UID migration failed: ${err.message}`);
  }
};

startServer();
