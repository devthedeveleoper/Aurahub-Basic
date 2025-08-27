const axios = require("axios");
const FormData = require("form-data");
const mongoose = require("mongoose");
const Video = require("../models/Video");
const Comment = require("../models/Comment");

const AURA_API_BASE_URL = "https://api.aurahub.fun";
const FREEIMAGE_API_URL = "https://freeimage.host/api/1/upload";
const UPLOAD_FOLDER_ID = process.env.UPLOAD_FOLDER_ID;

// 1. Controller for Simple/Direct Upload Flow
exports.getDirectUploadUrl = async (req, res) => {
  try {
    const response = await axios.get(`${AURA_API_BASE_URL}/upload/url`, {
      params: { folder: UPLOAD_FOLDER_ID },
    });
    res.json(response.data);
  } catch (error) {
    console.error("Error getting direct upload URL:", error);
    res.status(500).json({ message: "Failed to get upload URL" });
  }
};

// 2. Controller for Remote Upload Flow
exports.startRemoteUpload = async (req, res) => {
  const { videoUrl } = req.body;
  if (!videoUrl) {
    return res.status(400).json({ message: "Video URL is required" });
  }
  try {
    const response = await axios.get(`${AURA_API_BASE_URL}/remote/add`, {
      params: { url: videoUrl },
    });
    res.status(202).json(response.data);
  } catch (error) {
    console.error("Error starting remote upload:", error);
    res.status(500).json({ message: "Failed to start remote upload" });
  }
};

// 3. Controller to Check Remote Upload Status
exports.checkRemoteUploadStatus = async (req, res) => {
  const { remoteId } = req.params;
  try {
    const response = await axios.get(`${AURA_API_BASE_URL}/remote/status`, {
      params: { id: remoteId },
    });
    res.json(response.data);
  } catch (error) {
    console.error("Error checking remote upload status:", error);
    res.status(500).json({ message: "Failed to check status" });
  }
};

// 4. Controller to Create the Video Record in our DB
exports.createVideoRecord = async (req, res) => {
  const { title, description, videoId } = req.body;
  if (!title || !description || !videoId) {
    return res
      .status(400)
      .json({ message: "Title, description, and videoId are required." });
  }

  try {
    const videoData = {
      title,
      description,
      fileId: videoId,
      uploader: req.user.id,
    };

    if (req.file) {
      console.log("Custom thumbnail found. Uploading to Freeimage.host...");
      try {
        const imageAsBase64 = req.file.buffer.toString("base64");
        const formData = new FormData();
        formData.append("key", process.env.FREEIMAGE_API_KEY);
        formData.append("source", imageAsBase64);
        formData.append("action", "upload");
        formData.append("format", "json");

        const freeimageRes = await axios.post(FREEIMAGE_API_URL, formData, {
          headers: formData.getHeaders(),
        });

        if (freeimageRes.data.status_code === 200) {
          videoData.thumbnailUrl = freeimageRes.data.image.url;
          console.log("Freeimage.host upload successful.");
        }
      } catch (uploadError) {
        console.error("Freeimage.host upload failed:", uploadError.message);
      }
    }

    const newVideo = new Video(videoData);
    await newVideo.save();

    res
      .status(201)
      .json({ message: "Video published successfully!", video: newVideo });
  } catch (error) {
    console.error("Error creating video record:", error);
    res.status(500).json({ message: "Failed to create video record" });
  }
};

// Helper function to build the main aggregation pipeline
const buildVideoAggregation = (
  filter = {},
  sortCriteria = { createdAt: -1 }
) => {
  return [
    { $match: filter },
    {
      $addFields: {
        likesCount: { $size: { $ifNull: ["$likes", []] } },
      },
    },
    {
      $lookup: {
        from: "comments",
        localField: "_id",
        foreignField: "video",
        as: "comments",
      },
    },
    {
      $addFields: {
        commentCount: { $size: "$comments" },
      },
    },
    { $sort: sortCriteria },
    {
      $lookup: {
        from: "users",
        localField: "uploader",
        foreignField: "_id",
        as: "uploaderInfo",
      },
    },
    { $unwind: { path: "$uploaderInfo", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        title: 1,
        description: 1,
        fileId: 1,
        thumbnailUrl: 1,
        views: 1,
        createdAt: 1,
        likesCount: 1,
        commentCount: 1,
        likes: 1, // <-- ADD THIS LINE
        "uploader.username": "$uploaderInfo.username",
        "uploader._id": "$uploaderInfo._id",
      },
    },
  ];
};

// Controller to get all videos
exports.getAllVideos = async (req, res) => {
  try {
    const sortOption = req.query.sort || "date_desc";
    // Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 12; // Let's load 12 videos per page
    const skip = (page - 1) * limit;

    const sortCriteria = {
      date_desc: { createdAt: -1 },
      views_desc: { views: -1 },
      likes_desc: { likesCount: -1 },
      comments_desc: { commentCount: -1 },
    }[sortOption] || { createdAt: -1 };

    // We need the total count to know if there are more pages
    const totalVideos = await Video.countDocuments();

    const aggregation = buildVideoAggregation({}, sortCriteria);
    // Add skip and limit stages to the pipeline for pagination
    aggregation.push({ $skip: skip });
    aggregation.push({ $limit: limit });

    const videos = await Video.aggregate(aggregation);

    res.json({
      videos,
      currentPage: page,
      totalPages: Math.ceil(totalVideos / limit),
    });
  } catch (error) {
    console.error("Error fetching videos:", error);
    res.status(500).json({ message: "Failed to fetch videos" });
  }
};

// Controller to get a single video by its ID (Corrected Version)
exports.getVideoById = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Validate the ID format to prevent crashes
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid video ID format." });
    }

    // 2. Use the aggregation pipeline to get all data in one call
    const videoId = new mongoose.Types.ObjectId(id);
    const aggregation = buildVideoAggregation({ _id: videoId });
    const results = await Video.aggregate(aggregation);

    if (!results || results.length === 0) {
      return res.status(404).json({ message: "Video not found" });
    }

    const videoObject = results[0];

    // 3. Calculate 'isLiked' directly from the aggregation result
    const userId = req.user ? req.user.id : null;
    if (userId && videoObject.likes) {
      videoObject.isLiked = videoObject.likes
        .map((likeId) => likeId.toString())
        .includes(userId);
    } else {
      videoObject.isLiked = false;
    }

    res.json(videoObject);
  } catch (error) {
    console.error("Error fetching video by ID:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Controller to increment the view count for a video
exports.incrementViewCount = async (req, res) => {
  try {
    await Video.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    res.status(200).json({ success: true, message: "View count incremented." });
  } catch (error) {
    console.error("Error incrementing view count:", error);
    res
      .status(200)
      .json({ success: false, message: "Could not increment view count." });
  }
};

// Controller to toggle a like on a video
exports.toggleLike = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: "Video not found" });

    if (!video.likes) {
      video.likes = [];
    }

    const userId = req.user.id;
    const userIndex = video.likes.indexOf(userId);

    if (userIndex === -1) {
      video.likes.push(userId);
    } else {
      video.likes.splice(userIndex, 1);
    }

    await video.save();
    res.json({
      likes: video.likes.length,
      isLiked: userIndex === -1,
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Controller to add a comment to a video
exports.addComment = async (req, res) => {
  try {
    const { text } = req.body;
    const newComment = new Comment({
      text,
      author: req.user.id,
      video: req.params.id,
    });

    await newComment.save();
    const populatedComment = await Comment.findById(newComment._id).populate(
      "author",
      "username"
    );
    res.status(201).json(populatedComment);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Controller to get all comments for a video
exports.getComments = async (req, res) => {
  try {
    const comments = await Comment.find({ video: req.params.id })
      .populate("author", "username")
      .sort({ createdAt: -1 });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// Controller to search for videos
exports.searchVideos = async (req, res) => {
  try {
    const searchQuery = req.query.q;
    const sortOption = req.query.sort || "relevance";

    if (!searchQuery) {
      return res.json([]);
    }

    const searchFilter = { $text: { $search: searchQuery } };

    let sortCriteria;
    if (sortOption === "relevance") {
      sortCriteria = { score: { $meta: "textScore" } };
    } else {
      sortCriteria = {
        date_desc: { createdAt: -1 },
        views_desc: { views: -1 },
        likes_desc: { likesCount: -1 },
        comments_desc: { commentCount: -1 },
      }[sortOption] || { createdAt: -1 };
    }

    const aggregation = buildVideoAggregation(searchFilter, sortCriteria);

    if (sortOption === "relevance" && searchFilter.$text) {
      // Add score to the project stage to be able to access it
      aggregation[aggregation.length - 1].$project.score = {
        $meta: "textScore",
      };
    }

    const videos = await Video.aggregate(aggregation);
    res.json(videos);
  } catch (error) {
    console.error("Error searching videos:", error);
    res.status(500).json({ message: "Server error during search." });
  }
};

// NEW: Update a video's details
exports.updateVideo = async (req, res) => {
  try {
    const { title, description } = req.body;
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Security Check: Ensure the person making the request is the video uploader
    if (video.uploader.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "User not authorized to edit this video" });
    }

    video.title = title || video.title;
    video.description = description || video.description;

    const updatedVideo = await video.save();
    res.json(updatedVideo);
  } catch (error) {
    res.status(500).json({ message: "Server error while updating video" });
  }
};

// NEW: Delete a video
exports.deleteVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }

    // Security Check: Ensure the person making the request is the video uploader
    if (video.uploader.toString() !== req.user.id) {
      return res
        .status(403)
        .json({ message: "User not authorized to delete this video" });
    }

    await Video.deleteOne({ _id: req.params.id });
    // We could also delete associated comments here if desired
    // await Comment.deleteMany({ video: req.params.id });

    res.json({ message: "Video deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server error while deleting video" });
  }
};
