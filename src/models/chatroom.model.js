import mongoose, { Schema } from "mongoose";

const chatroomSchema = new Schema(
  {
    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    // last message for preview in chat list (like WhatsApp sidebar)
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
  },
  { timestamps: true }
);

const ChatRoom = mongoose.model("ChatRoom", chatroomSchema);
export default ChatRoom;