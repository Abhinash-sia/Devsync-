
import User from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// ─── Helper: generate both tokens and save refresh token to DB ───────────────
const generateTokens = async (userId) => {
  const user = await User.findById(userId);
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  // save refresh token in DB so we can verify + invalidate on logout
  user.refreshToken = refreshToken;
  await user.save({ validateBeforeSave: false }); // skip validation — we're only updating one field

  return { accessToken, refreshToken };
};


//  Register. 
const registerUser = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  // 1. Validate — check all fields exist
  if ([name, email, password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  // 2. Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, "User with this email already exists");
  }

  // 3. Create user — pre("save") hook auto-hashes the password
  const user = await User.create({ name, email, password });

  // 4. Fetch the created user but REMOVE sensitive fields
  const createdUser = await User.findById(user._id).select("-password -refreshToken");

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  // 5. Send response
  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully"));
});

// ─── Login 

const cookieOptions = {
  httpOnly: true,   // JS on the browser CANNOT access this cookie — XSS protection
  secure: true,     // only sent over HTTPS
  sameSite: "strict" // not sent with cross-site requests — CSRF protection
};

const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // 1. Check if email exists
  if (!email || !password) {
    throw new ApiError(400, "Email and password are required");
  }

  // 2. Find user by email
  const user = await User.findOne({ email });
  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  // 3. Verify password using our custom model method
  const isPasswordValid = await user.isPasswordCorrect(password);
  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  // 4. Generate both tokens
  const { accessToken, refreshToken } = await generateTokens(user._id);

  // 5. Get user without sensitive fields for the response body
  const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

  // 6. Send tokens as HTTP-only cookies AND in the response body
  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(200, { user: loggedInUser, accessToken, refreshToken },
        "User logged in successfully"
      )
    );
});


// Logout

const logoutUser = asyncHandler(async (req, res) => {
  // Remove refresh token from DB — invalidates the session server-side
  await User.findByIdAndUpdate(
    req.user._id,  // req.user is set by auth middleware
    { $unset: { refreshToken: 1 } },  // removes the field from document
    { new: true }
  );

  // Clear cookies from the browser
  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "User logged out successfully"));
});

export { registerUser, loginUser, logoutUser };