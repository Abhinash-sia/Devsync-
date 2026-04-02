import { createRequire } from "module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

import fs from "fs";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { parseResumeWithAI } from "../services/ai.service.js";
import Profile from "../models/profile.model.js";


// ─── PARSE RESUME + AUTO-FILL PROFILE ────────────────────────────────────────
const parseResume = asyncHandler(async (req, res) => {
  const resumeLocalPath = req.file?.path;

  if (!resumeLocalPath) {
    throw new ApiError(400, "Resume PDF is required");
  }

  try {
    // ── Step 1: Extract raw text from PDF ─────────────────────────────────
    const pdfBuffer = fs.readFileSync(resumeLocalPath);
    const pdfData = await pdfParse(pdfBuffer);
    const rawText = pdfData.text;

    if (!rawText || rawText.trim().length < 50) {
      throw new ApiError(
        400,
        "Could not extract text from PDF. Try a text-based PDF."
      );
    }

    // ── Step 2: Send to Gemini for structured extraction ──────────────────
    const parsedData = await parseResumeWithAI(rawText);

    // ── Step 3: Auto-fill the user's profile ──────────────────────────────
    const updatedProfile = await Profile.findOneAndUpdate(
      { user: req.user._id },
      {
        $set: {
          techStack: parsedData.techStack || [],
          bio: parsedData.bio || "",
          lookingFor: parsedData.lookingFor || "",
        },
      },
      { new: true, upsert: true }
    );

    return res.status(200).json(
      new ApiResponse(
        200,
        { profile: updatedProfile, aiExtracted: parsedData },
        "Resume parsed and profile auto-filled successfully 🤖"
      )
    );
  } finally {
    // ALWAYS clean up temp file — even if parsing failed
    if (fs.existsSync(resumeLocalPath)) {
      fs.unlinkSync(resumeLocalPath);
    }
  }
});


export { parseResume };

