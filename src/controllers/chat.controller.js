import ChatRoom from "../models/chatroom.model.js";
import Message from "../models/message.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// ─── GET ALL CHAT ROOMS FOR LOGGED IN USER ───────────────────────────────────
const getMyChatRooms = asyncHandler(async (req, res) => {
  const chatRooms = await ChatRoom.find({
    participants: req.user._id,
  })
    .populate("participants", "name email")
    .populate("lastMessage")
    .sort({ updatedAt: -1 }); // most recently active chat first

  return res
    .status(200)
    .json(new ApiResponse(200, chatRooms, "Chat rooms fetched successfully"));
});

// ─── GET PAGINATED MESSAGE HISTORY FOR A ROOM ────────────────────────────────
const getChatHistory = asyncHandler(async (req, res) => {
  const { chatRoomId } = req.params;

  // cursor-based pagination — ?before=<messageId>&limit=20
  // this is more efficient than skip/limit for large message histories
  const limit = parseInt(req.query.limit) || 20;
  const before = req.query.before; // load messages before this message ID

  // Security: make sure this user is a participant
  const chatRoom = await ChatRoom.findOne({
    _id: chatRoomId,
    participants: req.user._id,
  });

  if (!chatRoom) {
    throw new ApiError(404, "Chat room not found or access denied");
  }

  // build query — if 'before' cursor provided, fetch older messages
  const query = { chatRoom: chatRoomId };
  if (before) {
    query._id = { $lt: before }; // MongoDB ObjectIds are time-ordered!
  }

  const messages = await Message.find(query)
    .populate("sender", "name")
    .sort({ createdAt: -1 }) // newest first
    .limit(limit);

  // reverse so frontend gets oldest → newest order
  messages.reverse();

  return res
    .status(200)
    .json(new ApiResponse(200, messages, "Chat history fetched successfully"));
});

export { getMyChatRooms, getChatHistory };