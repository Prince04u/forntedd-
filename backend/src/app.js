const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const apiRouter = require("./routes");
const errorHandler = require("./middlewares/error");

const app = express();

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false, // allow images rendering in cross-origin clients
}));

app.use(cors({
  origin: "*", // allow all origins during development
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploaded files (KYCs and payment proof screenshots)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Bind API root endpoint
app.use("/api", apiRouter);

// Express Error Handler
app.use(errorHandler);

module.exports = app;
