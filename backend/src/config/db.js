const mongoose = require("mongoose");
const logger = require("./logger");

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/luckynova";
    await mongoose.connect(mongoUri, {
      autoIndex: true,
    });
    logger.info("MongoDB database connected successfully.");
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
