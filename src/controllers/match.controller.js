import mongoose from "mongoose";
import Match from "../models/match.model.js";
import User from "../models/user.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

import ChatRoom from "../models/chatroom.model.js";

// ─── SEND MATCH REQUEST (Swipe Right / Swipe Left) ───────────────────────────
const sendMatchRequest = asyncHandler(async (req, res) => {
  const { receiverId, status } = req.params;
  // status in URL = "interested" (swipe right) or "ignored" (swipe left)

  const senderId = req.user._id;

  // ── Edge Case 1: Can't swipe on yourself ────────────────────────────────
  if (senderId.toString() === receiverId) {
    throw new ApiError(400, "You cannot send a match request to yourself");
  }

  // ── Edge Case 2: Validate status value ──────────────────────────────────
  if (!["interested", "ignored"].includes(status)) {
    throw new ApiError(400, "Status must be 'interested' or 'ignored'");
  }

  // ── Edge Case 3: Receiver must actually exist ────────────────────────────
  const receiver = await User.findById(receiverId);
  if (!receiver) {
    throw new ApiError(404, "User not found");
  }

  // ── Edge Case 4: Check if match already exists ───────────────────────────
  const existingMatch = await Match.findOne({
    sender: senderId,
    receiver: receiverId,
  });
  if (existingMatch) {
    throw new ApiError(409, "You have already swiped on this user");
  }

  // ── Create the match document ────────────────────────────────────────────
  const match = await Match.create({
    sender: senderId,
    receiver: receiverId,
    status,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, match, `Match request sent as '${status}'`));
});


// ─── REVIEW MATCH REQUEST ────────────────────────────────────────────────────
const reviewMatchRequest = asyncHandler(async (req, res) => {
  const { matchId, status } = req.params;
  const loggedInUserId = req.user._id;

  // ── Validate status ──────────────────────────────────────────────────────
  if (!["accepted", "rejected"].includes(status)) {
    throw new ApiError(400, "Review status must be 'accepted' or 'rejected'");
  }

  // ── Find the match — but ONLY if current user is the RECEIVER ────────────
  // This is critical security: User A cannot accept their own request
  const match = await Match.findOne({
    _id: matchId,
    receiver: loggedInUserId,   // only receiver can review
    status: "interested",        // can only review pending requests
  });

  if (!match) {
    throw new ApiError(
      404,
      "Match request not found or you are not authorized to review it"
    );
  }

  // ── Update status ────────────────────────────────────────────────────────
  match.status = status;
  await match.save();

  if (status === "accepted") {
  // check if chatroom already exists (safety check)
  const existingRoom = await ChatRoom.findOne({
    participants: { $all: [match.sender, match.receiver] },
  });

  if (!existingRoom) {
    await ChatRoom.create({
      participants: [match.sender, match.receiver],
    });
  }
}

  return res
    .status(200)
    .json(new ApiResponse(200, match, `Match has been ${status}`));
});


// ─── GET DISCOVERY FEED ──────────────────────────────────────────────────────
const getDiscoveryFeed = asyncHandler(async (req, res) => {
  const loggedInUserId = req.user._id;

  // ── Pagination params from query string: ?page=1&limit=10 ────────────────
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;

  // ── Step 1: Find ALL users this person has already swiped on ─────────────
  //    (where they are the sender OR the receiver)
  const existingMatches = await Match.find({
    $or: [{ sender: loggedInUserId }, { receiver: loggedInUserId }],
  }).select("sender receiver");

  // ── Step 2: Extract just the IDs into a flat array ───────────────────────
  //    If I swiped on User B → hide B
  //    If User C swiped on me → hide C
  const hiddenUserIds = new Set();

  existingMatches.forEach((match) => {
    hiddenUserIds.add(match.sender.toString());
    hiddenUserIds.add(match.receiver.toString());
  });

  // ── Step 3: Also hide yourself ───────────────────────────────────────────
  hiddenUserIds.add(loggedInUserId.toString());

  // ── Step 4: Query users NOT in the hidden set ─────────────────────────────
  //    $nin = "Not In" — the DSA Set Difference operator in MongoDB
  const feedUsers = await User.find({
    _id: { $nin: Array.from(hiddenUserIds) },
  })
    .select("-password -refreshToken")  // never expose sensitive fields
    .skip(skip)
    .limit(limit);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { users: feedUsers, page, limit },
        "Discovery feed fetched successfully"
      )
    );
});

export { sendMatchRequest, reviewMatchRequest, getDiscoveryFeed };