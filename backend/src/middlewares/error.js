const logger = require("../config/logger");

const errorHandler = (err, req, res, next) => {
  logger.error(`Error encountered: ${err.message}`, { stack: err.stack });

  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message || "Internal server error.",
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
};

module.exports = errorHandler;
