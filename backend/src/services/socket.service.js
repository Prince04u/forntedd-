const logger = require("../config/logger");

let io;
const activeUsers = new Map(); // socketId -> userId

const initSocket = (socketIoInstance) => {
  io = socketIoInstance;

  io.on("connection", (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Join room for Wingo duration updates
    socket.on("join:wingo", (duration) => {
      socket.join(`wingo:${duration}`);
      logger.info(`Socket ${socket.id} joined Wingo room: wingo:${duration}`);
    });

    socket.on("join:aviator", () => {
      socket.join("aviator");
      logger.info(`Socket ${socket.id} joined Aviator flight room`);
    });

    // Authenticated connection mapping
    socket.on("auth:register", (userId) => {
      if (userId) {
        socket.join(`user:${userId}`);
        activeUsers.set(socket.id, userId);
        logger.info(`Socket ${socket.id} authenticated for user ID ${userId}`);
        // Broadcast active users count
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
