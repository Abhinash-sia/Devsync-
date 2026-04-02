// src/middlewares/auth.middleware.js
import jwt from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import User from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req, res, next) => {
  // 1. Extract token — from cookie (browser) OR Authorization header (mobile/Postman)
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(401, "Unauthorized request — no token provided");
  }

  // 2. Verify the token's signature and expiry
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch (err) {
    // jwt.verify throws if token is expired OR tampered with
    throw new ApiError(401, "Access token is invalid or expired");
  }

  // 3. Fetch the actual user from DB using the ID inside the token
  const user = await User.findById(decodedToken._id).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(401, "Invalid token — user no longer exists");
  }

  // 4. Attach user to request object — now all downstream controllers can use req.user
  req.user = user;

  next(); // pass control to the actual route controller
});