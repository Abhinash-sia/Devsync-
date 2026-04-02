import Gig from "../models/gig.model.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

// ─── CREATE GIG ───────────────────────────────────────────────────────────────
const createGig = asyncHandler(async (req, res) => {
  const { title, description, skillsRequired, type } = req.body;

  if (!title || !description || !type) {
    throw new ApiError(400, "Title, description, and type are required");
  }

  const gig = await Gig.create({
    author: req.user._id,
    title,
    description,
    skillsRequired: skillsRequired || [],
    type,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, gig, "Gig posted successfully"));
});

// ─── GET ALL ACTIVE GIGS (paginated) ─────────────────────────────────────────
const getActiveGigs = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const skip = (page - 1) * limit;
  const type = req.query.type; // optional filter: ?type=hackathon

  const query = { status: "active" };
  if (type) query.type = type;

  const gigs = await Gig.find(query)
    .populate("author", "name")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);

  return res
    .status(200)
    .json(new ApiResponse(200, { gigs, page, limit }, "Active gigs fetched"));
});

// ─── LIKE / UNLIKE GIG ───────────────────────────────────────────────────────
const toggleLikeGig = asyncHandler(async (req, res) => {
  const { gigId } = req.params;
  const userId = req.user._id;

  const gig = await Gig.findById(gigId);
  if (!gig) throw new ApiError(404, "Gig not found");

  // check if already liked
  const alreadyLiked = gig.likes.includes(userId);

  if (alreadyLiked) {
    // pull = remove from array
    gig.likes.pull(userId);
  } else {
    // addToSet = add only if not already in array (no duplicates)
    gig.likes.addToSet(userId);
  }

  await gig.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      { likesCount: gig.likes.length, liked: !alreadyLiked },
      alreadyLiked ? "Gig unliked" : "Gig liked"
    )
  );
});

// ─── DELETE GIG (only author can delete) ─────────────────────────────────────
const deleteGig = asyncHandler(async (req, res) => {
  const { gigId } = req.params;

  const gig = await Gig.findOne({
    _id: gigId,
    author: req.user._id, // authorization baked into query
  });

  if (!gig) {
    throw new ApiError(404, "Gig not found or you are not the author");
  }

  await gig.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Gig deleted successfully"));
});

export { createGig, getActiveGigs, toggleLikeGig, deleteGig };