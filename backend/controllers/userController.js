const User = require("../models/User");
const Video = require("../models/Video");

// Get a user's profile and their uploaded videos
exports.getUserProfile = async (req, res) => {
  try {
    // Find the user by their username
    const user = await User.findOne({ username: req.params.username });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Find all videos uploaded by that user
    const videos = await Video.find({ uploader: user._id })
      .sort({ createdAt: -1 })
      .populate("uploader", "username"); // Still good practice to populate

    res.json({
      user: {
        id: user._id,
        username: user.username,
        joined: user.createdAt,
      },
      videos: videos,
    });
  } catch (error) {
    console.error("Error getting user profile:", error);
    res.status(500).json({ message: "Server error" });
  }
};
