const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    fileId: {
      // <-- ADDED: The ID from the video host (AuraHub/Streamtape)
      type: String,
      required: true,
      unique: true,
    },
    thumbnailUrl: {
      // <-- UPDATED: Now optional, only for custom ImageBB uploads
      type: String,
      required: false,
    },
    uploader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    views: {
      type: Number,
      default: 0,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

// *** ADD THIS LINE FOR SEARCH OPTIMIZATION ***
// This creates a text index on the title and description fields.
videoSchema.index({ title: 'text', description: 'text' });

const Video = mongoose.model("Video", videoSchema);
module.exports = Video;
