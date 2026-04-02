import Profile from "../models/profile.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// ─── CREATE PROFILE ───────────────────────────────────────────────────────────
const createProfile = asyncHandler(async (req, res) => {

  // 1. Check if profile already exists for this user
  const existingProfile = await Profile.findOne({ user: req.user._id });
  if (existingProfile) {
    throw new ApiError(409, "Profile already exists. Use update instead.");
  }

  const { bio, techStack, githubUrl, linkedinUrl, lookingFor } = req.body;

  // 2. Handle avatar upload (optional)
  let avatarUrl = "";
  if (req.files?.avatar?.[0]) {
    const avatarLocalPath = req.files.avatar[0].path;
    const uploaded = await uploadOnCloudinary(avatarLocalPath);
    if (!uploaded) throw new ApiError(500, "Avatar upload failed");
    avatarUrl = uploaded.secure_url;
  }

  // 3. Handle resume upload (optional)
  let resumeUrl = "";
  if (req.files?.resume?.[0]) {
    const resumeLocalPath = req.files.resume[0].path;
    const uploaded = await uploadOnCloudinary(resumeLocalPath);
    if (!uploaded) throw new ApiError(500, "Resume upload failed");
    resumeUrl = uploaded.secure_url;
  }

  // 4. Parse techStack — FormData can only send strings, not arrays
  //    Frontend sends: JSON.stringify(["Node.js", "React"])
  //    Backend receives: '["Node.js","React"]' (a string)
  let parsedTechStack = [];
  if (techStack) {
    try {
      parsedTechStack = JSON.parse(techStack);
    } catch {
      // fallback: if sent as comma-separated string
      parsedTechStack = techStack.split(",").map((s) => s.trim());
    }
  }

  // 5. Save to MongoDB
  const profile = await Profile.create({
    user: req.user._id,    // from verifyJWT middleware
    bio,
    avatar: avatarUrl,
    resume: resumeUrl,
    techStack: parsedTechStack,
    githubUrl,
    linkedinUrl,
    lookingFor,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, profile, "Profile created successfully"));
});

// ─── GET PROFILE ──────────────────────────────────────────────────────────────
const getProfile = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const profile = await Profile.findOne({ user: userId })
    .populate("user", "name email createdAt");
  //  ↑ THE KEY MOVE
  //  Without populate: profile.user = "64abc123..." (just an ID)
  //  With populate:    profile.user = { name: "Rohan", email: "rohan@dev.com" }
  //  Mongoose runs a second query behind the scenes and merges the result
  //  One API call, all the data you need

  if (!profile) {
    throw new ApiError(404, "Profile not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, profile, "Profile fetched successfully"));
});

// ─── UPDATE PROFILE ───────────────────────────────────────────────────────────
const updateProfile = asyncHandler(async (req, res) => {
  const { bio, techStack, githubUrl, linkedinUrl, lookingFor } = req.body;

  // Build update object dynamically
  // Only include fields that were actually sent — don't overwrite with undefined
  const updateData = {};
  if (bio !== undefined) updateData.bio = bio;
  if (githubUrl !== undefined) updateData.githubUrl = githubUrl;
  if (linkedinUrl !== undefined) updateData.linkedinUrl = linkedinUrl;
  if (lookingFor !== undefined) updateData.lookingFor = lookingFor;

  if (techStack) {
    try {
      updateData.techStack = JSON.parse(techStack);
    } catch {
      updateData.techStack = techStack.split(",").map((s) => s.trim());
    }
  }

  // Handle new avatar upload
  if (req.files?.avatar?.[0]) {
    const avatarLocalPath = req.files.avatar[0].path;
    const uploaded = await uploadOnCloudinary(avatarLocalPath);
    if (!uploaded) throw new ApiError(500, "Avatar upload failed");
    updateData.avatar = uploaded.secure_url;
  }

  // Handle new resume upload
  if (req.files?.resume?.[0]) {
    const resumeLocalPath = req.files.resume[0].path;
    const uploaded = await uploadOnCloudinary(resumeLocalPath);
    if (!uploaded) throw new ApiError(500, "Resume upload failed");
    updateData.resume = uploaded.secure_url;
  }

  const updatedProfile = await Profile.findOneAndUpdate(
    { user: req.user._id },
    { $set: updateData },
    //  ↑ $set = only update specified fields, leave everything else untouched
    //  Without $set, the entire document gets REPLACED by updateData
    //  You'd lose all fields you didn't include — dangerous
    { new: true }
    //  ↑ return the document AFTER update, not before
  );

  if (!updatedProfile) {
    throw new ApiError(404, "Profile not found. Create one first.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, updatedProfile, "Profile updated successfully"));
});

export { createProfile, getProfile, updateProfile };