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
  contentSecurityPolicy: false,     // allow inline scripts to execute in browser
}));

app.use(cors({
  origin: "*", // allow all origins during development
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Catch-all request logger to discover external gaming callback endpoints
app.use((req, res, next) => {
  if (!req.url.startsWith("/uploads") && !req.url.startsWith("/admin") && !req.url.includes("socket.io")) {
    try {
      const logData = {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
        headers: req.headers,
        query: req.query,
        body: req.body
      };
      const fs = require("fs");
      const logFilePath = path.join(__dirname, "../logs/incoming_requests.log");
      fs.appendFileSync(logFilePath, JSON.stringify(logData) + "\n");
      console.log(`[CATCH-ALL LOGGER] ${req.method} ${req.url}`);
    } catch (e) {
      // ignore
    }
  }
  next();
});

// Serve static uploaded files (KYCs and payment proof screenshots)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Serve static admin dashboard panel
const fs = require("fs");
const adminPath = path.join(__dirname, "../public/admin");
if (!fs.existsSync(adminPath)) {
  fs.mkdirSync(adminPath, { recursive: true });
}
app.use("/admin", express.static(adminPath));

// Bind API root endpoint
app.use("/api", apiRouter);

// Express Error Handler
app.use(errorHandler);

module.exports = app;
