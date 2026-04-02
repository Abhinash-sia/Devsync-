import mongoose, { Schema } from "mongoose";

const gigSchema = new Schema(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Gig title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    skillsRequired: {
      type: [String],
      default: [],
    },
    type: {
      type: String,
      enum: ["hackathon", "freelance", "cofounder", "openSource"],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "expired", "filled"],
      default: "active",
    },
    likes: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    expiresAt: {
      type: Date,
      // auto-expire 14 days from creation
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
  },
  { timestamps: true }
);

// index for fast active gig queries
gigSchema.index({ status: 1, createdAt: -1 });

const Gig = mongoose.model("Gig", gigSchema);
export default Gig;