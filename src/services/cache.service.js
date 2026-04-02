import redis from "../config/redis.js";

// ─── SET cache with TTL (Time To Live) ───────────────────────────────────────
const setCache = async (key, data, ttlSeconds = 3600) => {
  try {
    // setex = SET with EXpiry
    // stores as JSON string since Redis only stores strings
    await redis.setex(key, ttlSeconds, JSON.stringify(data));
  } catch (err) {
    // silently fail — caching is an optimization, not a requirement
    console.error("Cache set error:", err.message);
  }
};

// ─── GET cache ────────────────────────────────────────────────────────────────
const getCache = async (key) => {
  try {
    const data = await redis.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error("Cache get error:", err.message);
    return null; // treat cache miss same as error — fallback to DB
  }
};

// ─── DELETE cache (invalidation) ─────────────────────────────────────────────
const deleteCache = async (key) => {
  try {
    await redis.del(key);
  } catch (err) {
    console.error("Cache delete error:", err.message);
  }
};

// ─── DELETE multiple keys by pattern ─────────────────────────────────────────
// e.g., delete all feed caches: deleteByPattern("feed:*")
const deleteByPattern = async (pattern) => {
  try {
    // KEYS command finds all keys matching pattern
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys); // spread as multiple args to del
    }
  } catch (err) {
    console.error("Cache pattern delete error:", err.message);
  }
};

export { setCache, getCache, deleteCache, deleteByPattern };