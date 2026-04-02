import { Router } from "express";
import {
  sendMatchRequest,
  reviewMatchRequest,
  getDiscoveryFeed,
} from "../controllers/match.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// All match routes are protected — must be logged in
router.use(verifyJWT);

// GET /api/v1/match/feed?page=1&limit=10
router.route("/feed").get(getDiscoveryFeed);

// POST /api/v1/match/send/:receiverId/:status
// status = "interested" or "ignored"
router.route("/send/:receiverId/:status").post(sendMatchRequest);

// PATCH /api/v1/match/review/:matchId/:status
// status = "accepted" or "rejected"
router.route("/review/:matchId/:status").patch(reviewMatchRequest);

export default router;