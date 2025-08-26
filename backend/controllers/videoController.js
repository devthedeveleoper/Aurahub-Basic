const axios = require("axios");
const FormData = require("form-data");
const Video = require("../models/Video");
const Comment = require("../models/Comment");

const AURA_API_BASE_URL = "https://api.aurahub.fun";
const IMAGEBB_API_URL = "https://api.imgbb.com/1/upload";

// 1. Controller for Simple/Direct Upload Flow
exports.getDirectUploadUrl = async (req, res) => {
  try {
    // We just fetch the upload URL from AuraHub and pass it to the client
    const response = await axios.get(`${AURA_API_BASE_URL}/upload/url`);
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
    res.status(202).json(response.data); // Returns the remote upload ID
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

// 4. Controller to Create the Video Record in our DB (UPDATED)
exports.createVideoRecord = async (req, res) => {
  const { title, description, videoId } = req.body; // 'videoId' is our fileId

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

    // If a custom thumbnail was uploaded, process it with ImageBB
    if (req.file) {
      console.log("Custom thumbnail found. Uploading to ImageBB...");
      const formData = new FormData();
      formData.append("image", req.file.buffer.toString("base64"));
      const imgbbRes = await axios.post(
        `${IMAGEBB_API_URL}?key=${process.env.IMAGEBB_API_KEY}`,
        formData
      );

      if (imgbbRes.data.success) {
        videoData.thumbnailUrl = imgbbRes.data.data.url; // Add ImageBB URL to our data
      }
    }

    // Create the new video record with the prepared data
    const newVideo = new Video(videoData);
    await newVideo.save();

    res
      .status(201)
      .json({ message: "Video published successfully!", video: newVideo });
  } catch (error) {
    console.error(
      "Error creating video record:",
      error.response ? error.response.data : error.message
    );
    res.status(500).json({ message: "Failed to create video record" });
  }
};

// Helper function to build the main aggregation pipeline
const buildVideoAggregation = (filter = {}, sortCriteria = { createdAt: -1 }) => {
    return [
        { $match: filter },
        // Create new fields for likesCount and commentsCount
        {
            $addFields: {
                // *** THIS IS THE FIX ***
                // Use $ifNull to provide a default empty array if 'likes' is missing
                likesCount: { $size: { $ifNull: [ "$likes", [] ] } }
            }
        },
        // Join with the comments collection
        {
            $lookup: {
                from: 'comments',
                localField: '_id',
                foreignField: 'video',
                as: 'comments'
            }
        },
        {
            $addFields: {
                commentCount: { $size: "$comments" } // This one is safe because $lookup always creates an array
            }
        },
        { $sort: sortCriteria },
        // Join with the users collection to get uploader info
        {
            $lookup: {
                from: 'users',
                localField: 'uploader',
                foreignField: '_id',
                as: 'uploaderInfo'
            }
        },
        { $unwind: "$uploaderInfo" },
        // Shape the final output
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
                'uploader.username': "$uploaderInfo.username",
                'uploader._id': "$uploaderInfo._id",
            }
        }
    ];
};

// UPDATED: getAllVideos now uses the aggregation pipeline
exports.getAllVideos = async (req, res) => {
    try {
        const sortOption = req.query.sort || 'date_desc';
        const sortCriteria = {
            'date_desc': { createdAt: -1 },
            'views_desc': { views: -1 },
            'likes_desc': { likesCount: -1 },
            'comments_desc': { commentCount: -1 }
        }[sortOption] || { createdAt: -1 };

        const aggregation = buildVideoAggregation({}, sortCriteria);
        const videos = await Video.aggregate(aggregation);

        res.json(videos);
    } catch (error) {
        console.error('Error fetching videos:', error);
        res.status(500).json({ message: 'Failed to fetch videos' });
    }
};

exports.getVideoById = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id).populate(
      "uploader",
      "username"
    );
    if (!video) {
      return res.status(404).json({ message: "Video not found" });
    }
    // We need to convert the mongoose object to a plain JS object to add properties
    const videoObject = video.toObject();
    // Check if the current user (if any) has liked this video
    const userId = req.user ? req.user.id : null;
    videoObject.isLiked = userId ? video.likes.includes(userId) : false;
    videoObject.likesCount = video.likes.length;

    res.json(videoObject);
  } catch (error) {
    console.error("Error fetching video by ID:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.incrementViewCount = async (req, res) => {
  try {
    // Find the video by its ID and increment the 'views' field by 1
    await Video.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
    res.status(200).json({ success: true, message: "View count incremented." });
  } catch (error) {
    console.error("Error incrementing view count:", error);
    // We send a 200 OK so that a failure here doesn't break the client-side experience
    res
      .status(200)
      .json({ success: false, message: "Could not increment view count." });
  }
};

// NEW: Toggle a like on a video
exports.toggleLike = async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);
        if (!video) return res.status(404).json({ message: 'Video not found' });

        const userId = req.user.id;
        const userIndex = video.likes.indexOf(userId);

        if (userIndex === -1) {
            // User hasn't liked it yet, so add the like
            video.likes.push(userId);
        } else {
            // User has already liked it, so remove the like
            video.likes.splice(userIndex, 1);
        }

        await video.save();
        res.json({
            likes: video.likes.length,
            isLiked: userIndex === -1
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// NEW: Add a comment to a video
exports.addComment = async (req, res) => {
    try {
        const { text } = req.body;
        const newComment = new Comment({
            text,
            author: req.user.id,
            video: req.params.id,
        });

        await newComment.save();
        // Populate author details before sending back to client
        const populatedComment = await Comment.findById(newComment._id).populate('author', 'username');
        res.status(201).json(populatedComment);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// NEW: Get all comments for a video
exports.getComments = async (req, res) => {
    try {
        const comments = await Comment.find({ video: req.params.id })
            .populate('author', 'username')
            .sort({ createdAt: -1 });
        res.json(comments);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

// UPDATED: searchVideos now also uses the aggregation pipeline
exports.searchVideos = async (req, res) => {
    try {
        const searchQuery = req.query.q;
        const sortOption = req.query.sort || 'relevance';

        if (!searchQuery) {
            return res.json([]);
        }

        const searchFilter = { $text: { $search: searchQuery } };
        // Note: For regex search, replace the line above with:
        // const searchFilter = { $or: [{ title: { $regex: searchQuery, $options: 'i' } }, { description: { $regex: searchQuery, $options: 'i' } }] };

        const sortCriteria = {
            'relevance': { score: { $meta: 'textScore' } }, // Only works with $text search
            'date_desc': { createdAt: -1 },
            'views_desc': { views: -1 },
            'likes_desc': { likesCount: -1 },
            'comments_desc': { commentCount: -1 }
        }[sortOption] || { score: { $meta: 'textScore' } };

        const aggregation = buildVideoAggregation(searchFilter, sortCriteria);
        
        // If using $text search, add the score to the initial match stage
        if (sortOption === 'relevance' && searchFilter.$text) {
             aggregation.unshift({ $match: { score: { $meta: 'textScore' } } });
        }
        
        const videos = await Video.aggregate(aggregation);
        res.json(videos);

    } catch (error) {
        console.error('Error searching videos:', error);
        res.status(500).json({ message: 'Server error during search.' });
    }
};