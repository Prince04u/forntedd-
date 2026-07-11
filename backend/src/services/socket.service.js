const logger = require("../config/logger");

let io;
const activeUsers = new Map(); // socketId -> userId

const jwt = require("jsonwebtoken");

const initSocket = (socketIoInstance) => {
  io = socketIoInstance;

  // Middleware to decode token from handshake
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || "luckynova-super-secret-jwt-key-2026");
        socket.userId = decoded.id;
      } catch (err) {
        logger.warn(`Socket auth token validation failed: ${err.message}`);
      }
    }
    next();
  });

  io.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // If verified by handshake middleware, automatically join room
    if (socket.userId) {
      socket.join(`user:${socket.userId}`);
      activeUsers.set(socket.id, socket.userId);
      logger.info(`Socket ${socket.id} automatically authenticated for user ID ${socket.userId}`);
      io.emit("status:online", activeUsers.size);
    }

    // Join room for Wingo duration updates
    socket.on("join:wingo", (duration) => {
      socket.join(`wingo:${duration}`);
      logger.info(`Socket ${socket.id} joined Wingo room: wingo:${duration}`);
    });

    socket.on("join:aviator", () => {
      socket.join("aviator");
      logger.info(`Socket ${socket.id} joined Aviator flight room`);
    });

    socket.on("k3:join", (duration) => {
      socket.join(`k3:${duration}`);
      logger.info(`Socket ${socket.id} joined K3 room: k3:${duration}`);
    });

    socket.on("k3:leave", (duration) => {
      socket.leave(`k3:${duration}`);
      logger.info(`Socket ${socket.id} left K3 room: k3:${duration}`);
    });

    // Support client manual room join
    socket.on("join:user", () => {
      if (socket.userId) {
        socket.join(`user:${socket.userId}`);
        logger.info(`Socket ${socket.id} manually joined user room: user:${socket.userId}`);
      }
    });

    // Authenticated connection mapping (legacy event)
    socket.on("auth:register", (userId) => {
      if (userId) {
        socket.join(`user:${userId}`);
        activeUsers.set(socket.id, userId);
        logger.info(`Socket ${socket.id} authenticated for user ID ${userId} via auth:register`);
        io.emit("status:online", activeUsers.size);
      }
    });

    socket.on("disconnect", () => {
      logger.info(`Socket disconnected: ${socket.id}`);
      if (activeUsers.has(socket.id)) {
        activeUsers.delete(socket.id);
        io.emit("status:online", activeUsers.size);
      }
    });
  });
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO has not been initialized yet!");
  }
  return io;
};

// Send instant updates to specific users (e.g. balance adjustment pushes)
const sendToUser = (userId, event, payload) => {
  try {
    const socketIo = getIO();
    socketIo.to(`user:${userId}`).emit(event, payload);
  } catch (error) {
    logger.warn(`Could not emit event ${event} to user ${userId}: ${error.message}`);
  }
};

module.exports = { initSocket, getIO, sendToUser };
