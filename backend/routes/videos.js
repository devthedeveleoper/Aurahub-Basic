const express = require("express");
const router = express.Router();
const multer = require("multer");
const {
  getDirectUploadUrl,
  startRemoteUpload,
  checkRemoteUploadStatus,
  createVideoRecord,
  getAllVideos,
  getVideoById,
  incrementViewCount,
  toggleLike,
  addComment,
  getComments,
  searchVideos,
} = require("../controllers/videoController");
const { ensureAuthenticated } = require("../middlewares/authMiddleware");

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// --- CORRECT ROUTE ORDER ---

// 1. All SPECIFIC string routes come first.
router.get("/get-upload-url", ensureAuthenticated, getDirectUploadUrl);
router.get("/search", searchVideos); // <-- MOVED HERE
router.post("/remote-upload/start", ensureAuthenticated, startRemoteUpload);
router.post(
  "/create-record",
  ensureAuthenticated,
  upload.single("thumbnailFile"),
  createVideoRecord
);
router.get(
  "/remote-upload/status/:remoteId",
  ensureAuthenticated,
  checkRemoteUploadStatus
);

// 2. The general "get all" route.
router.get("/", getAllVideos);

// 3. DYNAMIC routes with an '/:id' parameter come LAST.
router.get("/:id", getVideoById);
router.post("/:id/view", incrementViewCount);
router.post("/:id/like", ensureAuthenticated, toggleLike);
router.post("/:id/comments", ensureAuthenticated, addComment);
router.get("/:id/comments", getComments);

module.exports = router;
