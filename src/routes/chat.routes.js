import { Router } from "express";
import { getMyChatRooms, getChatHistory } from "../controllers/chat.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(verifyJWT);

// GET /api/v1/chat/rooms
router.route("/rooms").get(getMyChatRooms);

// GET /api/v1/chat/:chatRoomId/messages?limit=20&before=<messageId>
router.route("/:chatRoomId/messages").get(getChatHistory);

export default router;