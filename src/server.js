import dotenv from "dotenv";
dotenv.config({ path: "./.env" });

import { app } from "./app.js";
import connectDB from "./config/db.js";
import { createServer } from "http";
import { initializeSocket } from "./config/socket.js";
import { startCronJobs } from "./jobs/cleanup.worker.js";
import logger from "./utils/logger.js";
import fs from "fs";

const PORT = process.env.PORT || 8000;

// Ensure logs directory exists
if (!fs.existsSync("logs")) {
  fs.mkdirSync("logs");
}

const httpServer = createServer(app);
const io = initializeSocket(httpServer);

connectDB()
  .then(() => {
    httpServer.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`);
      logger.info(`🌍 Environment: ${process.env.NODE_ENV}`);

      // Start background jobs AFTER server is ready
      startCronJobs();
    });
  })
  .catch((err) => {
    logger.error("Server failed to start:", err);
    process.exit(1);
  });

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
// When server receives SIGTERM (from hosting platform during deploy/restart)
// finish in-flight requests before shutting down — don't cut connections mid-request
process.on("SIGTERM", () => {
  logger.info("SIGTERM received. Shutting down gracefully...");
  httpServer.close(() => {
    logger.info("HTTP server closed.");
    process.exit(0);
  });
});