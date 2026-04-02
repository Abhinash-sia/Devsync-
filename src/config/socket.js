import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";
import ChatRoom from "../models/chatroom.model.js";
import Message from "../models/message.model.js";

const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN || "http://localhost:5173",
      credentials: true,
    },
  });

  // ── SOCKET AUTH MIDDLEWARE ─────────────────────────────────────────────────
  // WebSockets bypass Express routes — so Express's verifyJWT doesn't run here
  // We must verify the JWT ourselves during the connection "handshake"
  io.use(async (socket, next) => {
    try {
      // token comes from the frontend during connection:
      // socket = io("http://localhost:8000", { auth: { token: "Bearer xyz" } })
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization;

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      const cleanToken = token.replace("Bearer ", "");
      const decoded = jwt.verify(cleanToken, process.env.ACCESS_TOKEN_SECRET);

      const user = await User.findById(decoded._id).select(
        "-password -refreshToken"
      );
      if (!user) {
        return next(new Error("Authentication error: User not found"));
      }

      // attach user to socket — accessible in all event handlers as socket.user
      socket.user = user;
      next(); // allow the connection
    } catch (err) {
      next(new Error("Authentication error: Invalid token"));
    }
  });

  // ── CONNECTION EVENT — runs once when a client successfully connects ───────
  io.on("connection", (socket) => {
    console.log(`⚡ User connected: ${socket.user.name} [${socket.id}]`);

    // ── EVENT 1: JOIN A CHAT ROOM ──────────────────────────────────────────
    // Frontend emits this when user opens a specific chat window
    socket.on("join_chat", async (chatRoomId) => {
      try {
        // Security: verify this user is actually a participant of this room
        const chatRoom = await ChatRoom.findOne({
          _id: chatRoomId,
          participants: socket.user._id,
        });

        if (!chatRoom) {
          socket.emit("error", { message: "Chat room not found or access denied" });
          return;
        }

        // join the Socket.io "room" — this is like entering a private channel
        socket.join(chatRoomId);
        console.log(`${socket.user.name} joined room: ${chatRoomId}`);

        socket.emit("joined_chat", { chatRoomId });
      } catch (err) {
        socket.emit("error", { message: "Failed to join chat room" });
      }
    });

    // ── EVENT 2: SEND A MESSAGE ───────────────────────────────────────────
    socket.on("send_message", async ({ chatRoomId, content }) => {
      try {
        if (!content?.trim()) {
          socket.emit("error", { message: "Message content cannot be empty" });
          return;
        }

        // 1. Save message permanently to MongoDB first
        const newMessage = await Message.create({
          chatRoom: chatRoomId,
          sender: socket.user._id,
          content: content.trim(),
          status: "sent",
        });

        // 2. Update the ChatRoom's lastMessage for the sidebar preview
        await ChatRoom.findByIdAndUpdate(chatRoomId, {
          lastMessage: newMessage._id,
        });

        // 3. Populate sender info so frontend can display name/avatar
        const populatedMessage = await Message.findById(newMessage._id).populate(
          "sender",
          "name"
        );

        // 4. Emit to EVERYONE in this specific room (both sender and receiver)
        // io.to(room) = send to all sockets in that room
        io.to(chatRoomId).emit("receive_message", populatedMessage);

      } catch (err) {
        socket.emit("error", { message: "Failed to send message" });
      }
    });

    // ── EVENT 3: TYPING INDICATORS ────────────────────────────────────────
    socket.on("typing_start", ({ chatRoomId }) => {
      // broadcast to everyone in the room EXCEPT the sender
      // socket.to() = everyone in room except this socket
      socket.to(chatRoomId).emit("display_typing", {
        userId: socket.user._id,
        name: socket.user.name,
      });
    });

    socket.on("typing_stop", ({ chatRoomId }) => {
      socket.to(chatRoomId).emit("hide_typing", {
        userId: socket.user._id,
      });
    });

    // ── EVENT 4: MARK MESSAGES AS READ ────────────────────────────────────
    socket.on("messages_read", async ({ chatRoomId }) => {
      try {
        // update all unread messages in this room NOT sent by this user → "read"
        await Message.updateMany(
          {
            chatRoom: chatRoomId,
            sender: { $ne: socket.user._id }, // not sent by me
            status: { $ne: "read" },
          },
          { $set: { status: "read" } }
        );

        // notify the other person their messages were read
        socket.to(chatRoomId).emit("messages_seen", {
          chatRoomId,
          readBy: socket.user._id,
        });
      } catch (err) {
        socket.emit("error", { message: "Failed to update read status" });
      }
    });

    // ── DISCONNECT ────────────────────────────────────────────────────────
    socket.on("disconnect", () => {
      console.log(`❌ User disconnected: ${socket.user.name} [${socket.id}]`);
    });
  });

  return io;
};

export { initializeSocket };