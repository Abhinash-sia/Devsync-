import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
  // if connection drops, ioredis retries automatically
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000); // wait max 2 seconds between retries
    return delay;
  },
  // if Redis is down, don't crash the whole app — just log and continue
  lazyConnect: true,
});

redis.on("connect", () => {
  console.log("✅ Redis connected");
});

redis.on("error", (err) => {
  console.error("❌ Redis error:", err.message);
  // we intentionally don't crash the app here
  // if Redis is down, the app still works — just slower (falls back to MongoDB)
});

export default redis;