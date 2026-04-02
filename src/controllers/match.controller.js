import mongoose from "mongoose";
import Match from "../models/match.model.js";
import User from "../models/user.model.js";
import ChatRoom from "../models/chatroom.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { setCache, getCache, deleteCache } from "../services/cache.service.js";


// ─── SEND MATCH REQUEST (Swipe Right / Swipe Left) ───────────────────────────
const sendMatchRequest = asyncHandler(async (req, res) => {
  const { receiverId, status } = req.params;
  const senderId = req.user._id;

  // ── Edge Case 1: Can't swipe on yourself ──────────────────────────────
  if (senderId.toString() === receiverId) {
    throw new ApiError(400, "You cannot send a match request to yourself");
  }

  // ── Edge Case 2: Validate status value ────────────────────────────────
  if (!["interested", "ignored"].includes(status)) {
    throw new ApiError(400, "Status must be 'interested' or 'ignored'");
  }

  // ── Edge Case 3: Receiver must actually exist ──────────────────────────
  const receiver = await User.findById(receiverId);
  if (!receiver) {
    throw new ApiError(404, "User not found");
  }

  // ── Edge Case 4: Check if match already exists ────────────────────────
  const existingMatch = await Match.findOne({
    sender: senderId,
    receiver: receiverId,
  });
  if (existingMatch) {
    throw new ApiError(409, "You have already swiped on this user");
  }

  // ── Create the match document ──────────────────────────────────────────
  const match = await Match.create({
    sender: senderId,
    receiver: receiverId,
    status,
  });

  // ── Invalidate sender's cached feed — they just swiped, feed is stale ──
  await deleteCache(`feed:${senderId}:1`);

  return res
    .status(201)
    .json(new ApiResponse(201, match, `Match request sent as '${status}'`));
});


// ─── REVIEW MATCH REQUEST ─────────────────────────────────────────────────────
const reviewMatchRequest = asyncHandler(async (req, res) => {
  const { matchId, status } = req.params;
  const loggedInUserId = req.user._id;

  // ── Validate status ────────────────────────────────────────────────────
  if (!["accepted", "rejected"].includes(status)) {
    throw new ApiError(400, "Review status must be 'accepted' or 'rejected'");
  }

  // ── Find match — ONLY if current user is the RECEIVER ─────────────────
  // Security: receiver can only review pending requests, not accept own request
  const match = await Match.findOne({
    _id: matchId,
    receiver: loggedInUserId,
    status: "interested",
  });

  if (!match) {
    throw new ApiError(
      404,
      "Match request not found or you are not authorized to review it"
    );
  }

  // ── Update status ──────────────────────────────────────────────────────
  match.status = status;
  await match.save();

  // ── If accepted → auto-create a ChatRoom ──────────────────────────────
  if (status === "accepted") {
    const existingRoom = await ChatRoom.findOne({
      participants: { $all: [match.sender, match.receiver] },
    });

    if (!existingRoom) {
      await ChatRoom.create({
        participants: [match.sender, match.receiver],
      });
    }
  }

  // ── Invalidate BOTH users' cached feeds ───────────────────────────────
  await deleteCache(`feed:${match.sender}:1`);
  await deleteCache(`feed:${match.receiver}:1`);

  return res
    .status(200)
    .json(new ApiResponse(200, match, `Match has been ${status}`));
});


// ─── GET DISCOVERY FEED (with Redis Cache-Aside) ──────────────────────────────
const getDiscoveryFeed = asyncHandler(async (req, res) => {
  const loggedInUserId = req.user._id;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // Cache key is unique per user per page → "feed:64abc123:1"
  const cacheKey = `feed:${loggedInUserId}:${page}`;

  // ── Step 1: Check Redis first ──────────────────────────────────────────
  const cachedFeed = await getCache(cacheKey);
  if (cachedFeed) {
    return res
      .status(200)
      .json(new ApiResponse(200, cachedFeed, "Feed fetched from cache ⚡"));
  }

  // ── Step 2: Cache MISS → query MongoDB ────────────────────────────────
  const existingMatches = await Match.find({
    $or: [{ sender: loggedInUserId }, { receiver: loggedInUserId }],
  }).select("sender receiver");

  const hiddenUserIds = new Set();
  existingMatches.forEach((match) => {
    hiddenUserIds.add(match.sender.toString());
    hiddenUserIds.add(match.receiver.toString());
  });
  hiddenUserIds.add(loggedInUserId.toString());

  const feedUsers = await User.find({
    _id: { $nin: Array.from(hiddenUserIds) },
  })
    .select("-password -refreshToken")
    .skip(skip)
    .limit(limit);

  const responseData = { users: feedUsers, page, limit };

  // ── Step 3: Save to Redis with 1 hour TTL ─────────────────────────────
  await setCache(cacheKey, responseData, 3600);

  return res
    .status(200)
    .json(
      new ApiResponse(200, responseData, "Discovery feed fetched successfully")
    );
});


export { sendMatchRequest, reviewMatchRequest, getDiscoveryFeed };