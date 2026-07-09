const logger = require("./logger");

// We build a robust fallback in-memory client in case Redis is not locally installed/configured
class MemoryCacheClient {
  constructor() {
    this.store = new Map();
    logger.info("Using fallback in-memory cache system.");
  }

  async get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key, value, mode, duration) {
    let expiresAt = null;
    if (mode === "EX" && typeof duration === "number") {
      expiresAt = Date.now() + duration * 1000;
    }
    this.store.set(key, { value: String(value), expiresAt });
    return "OK";
  }

  async del(key) {
    return this.store.delete(key) ? 1 : 0;
  }

  async incr(key) {
    const current = await this.get(key);
    const num = current ? parseInt(current, 10) : 0;
    const next = num + 1;
    await this.set(key, next);
    return next;
  }

  async decr(key) {
    const current = await this.get(key);
    const num = current ? parseInt(current, 10) : 0;
    const next = num - 1;
    await this.set(key, next);
    return next;
  }

  async expire(key, seconds) {
    const entry = this.store.get(key);
    if (!entry) return 0;
    entry.expiresAt = Date.now() + seconds * 1000;
    this.store.set(key, entry);
    return 1;
  }
}

let redisClient;

try {
  // If user wants to connect real Redis client
  if (process.env.REDIS_URL && process.env.REDIS_URL !== "mock") {
    const Redis = require("ioredis");
    redisClient = new Redis(process.env.REDIS_URL);
    redisClient.on("connect", () => {
      logger.info("Redis cache store connected successfully.");
    });
    redisClient.on("error", (err) => {
      logger.error(`Redis connection failed: ${err.message}`);
    });
  } else {
    redisClient = new MemoryCacheClient();
  }
} catch (error) {
  logger.warn("ioredis is not installed or configured. Falling back to in-memory store.");
  redisClient = new MemoryCacheClient();
}

module.exports = redisClient;
