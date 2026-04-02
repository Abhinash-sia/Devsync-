import cron from "node-cron";
import Match from "../models/match.model.js";
import Gig from "../models/gig.model.js";
import logger from "../utils/logger.js";

// ─── JOB 1: Delete old rejected matches ──────────────────────────────────────
// Runs every night at 3:00 AM
// Cron syntax: "minute hour day month weekday"
// "0 3 * * *" = at minute 0, hour 3, every day, every month, every weekday

const cleanRejectedMatches = cron.schedule("0 3 * * *", async () => {
  logger.info("🧹 CRON: Starting rejected matches cleanup...");

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const result = await Match.deleteMany({
      status: "rejected",
      createdAt: { $lt: thirtyDaysAgo },
    });

    logger.info(
      `🧹 CRON: Deleted ${result.deletedCount} old rejected matches`
    );
  } catch (err) {
    logger.error("CRON cleanup error (matches):", err);
  }
}, {
  scheduled: false, // don't start automatically — we start it manually
  timezone: "Asia/Kolkata",
});

// ─── JOB 2: Expire old gig posts ─────────────────────────────────────────────
// Runs every day at 3:30 AM
const expireOldGigs = cron.schedule("30 3 * * *", async () => {
  logger.info("🧹 CRON: Starting gig expiration job...");

  try {
    const result = await Gig.updateMany(
      {
        status: "active",
        expiresAt: { $lt: new Date() }, // expiresAt is in the past
      },
      { $set: { status: "expired" } }
    );

    logger.info(`🧹 CRON: Expired ${result.modifiedCount} old gigs`);
  } catch (err) {
    logger.error("CRON cleanup error (gigs):", err);
  }
}, {
  scheduled: false,
  timezone: "Asia/Kolkata",
});

// ─── Start all jobs ───────────────────────────────────────────────────────────
const startCronJobs = () => {
  cleanRejectedMatches.start();
  expireOldGigs.start();
  logger.info("⏰ Cron jobs scheduled and running");
};

export { startCronJobs };