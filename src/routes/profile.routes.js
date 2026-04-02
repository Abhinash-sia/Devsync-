import { Router } from "express";
import {
  createProfile,
  getProfile,
  updateProfile,
} from "../controllers/profile.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/upload.middleware.js";

const router = Router();

// upload.fields() = handle multiple different file fields in one request
const fileUpload = upload.fields([
  { name: "avatar", maxCount: 1 },
  { name: "resume", maxCount: 1 },
]);

// Middleware chain runs left → right:
// verifyJWT → confirms identity, sets req.user
// fileUpload → parses multipart form, saves files, sets req.files
// controller → runs with req.user and req.files both available

router.route("/create").post(verifyJWT, fileUpload, createProfile);
router.route("/update").patch(verifyJWT, fileUpload, updateProfile);
router.route("/:userId").get(getProfile);   // public — no login needed to view a profile

export default router;