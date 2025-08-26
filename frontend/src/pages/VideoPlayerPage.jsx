import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import API from "../api";
import Navbar from "../components/Navbar";
import useAuthStore from "../stores/authStore";
import { useThrottle } from "../hooks/useThrottle";
import { toast } from "react-toastify";
import { FcLike } from "react-icons/fc";
import SuggestedVideoCard from "../components/SuggestedVideoCard";
import EditVideoModal from "../components/EditVideoModal";

const VideoPlayerPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuthStore();

  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [suggestedVideos, setSuggestedVideos] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    const fetchVideoData = async () => {
      try {
        setLoading(true);
        setError("");

        const [videoRes, suggestedRes, commentsRes] = await Promise.all([
          API.get(`/videos/${id}`),
          API.get("/videos", { params: { sort: "date_desc" } }),
          API.get(`/videos/${id}/comments`),
        ]);

        setVideo(videoRes.data);
        setComments(commentsRes.data);

        // --- THIS IS THE FIX ---
        // Access the .videos property from the paginated response
        const filteredVideos = suggestedRes.data.videos.filter(
          (v) => v._id !== id
        );
        setSuggestedVideos(filteredVideos);

        API.post(`/videos/${id}/view`).catch((err) =>
          console.error("Failed to count view:", err)
        );
      } catch (err) {
        setError(
          "Could not load video data. It may have been removed or the link is incorrect."
        );
        console.error("Error fetching video data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchVideoData();
    window.scrollTo(0, 0);
  }, [id]);

  const handleLike = async () => {
    if (!isAuthenticated) {
      toast.warn("Please log in to like a video.");
      return;
    }
    try {
      setVideo((prev) => ({
        ...prev,
        isLiked: !prev.isLiked,
        likesCount: prev.isLiked ? prev.likesCount - 1 : prev.likesCount + 1,
      }));
      await API.post(`/videos/${id}/like`);
    } catch (err) {
      toast.error("An error occurred while liking the video.");
      console.error("Failed to like video:", err);
      setVideo((prev) => ({
        ...prev,
        isLiked: !prev.isLiked,
        likesCount: prev.isLiked ? prev.likesCount + 1 : prev.likesCount - 1,
      }));
    }
  };

  const throttledLikeHandler = useThrottle(handleLike, 2000);

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    try {
      const res = await API.post(`/videos/${id}/comments`, {
        text: newComment,
      });
      setComments([res.data, ...comments]);
      setNewComment("");
      toast.success("Comment posted!");
    } catch (err) {
      toast.error("Failed to post comment. Please try again.");
      console.log(err);
    }
  };

  const handleDelete = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete this video? This action cannot be undone."
      )
    ) {
      try {
        await API.delete(`/videos/${id}`);
        toast.success("Video deleted successfully!");
        navigate("/");
      } catch (err) {
        toast.error("Failed to delete video.");
        console.error(err);
      }
    }
  };

  const handleSaveEdits = async (data) => {
    try {
      const response = await API.put(`/videos/${id}`, data);
      setVideo((prev) => ({ ...prev, ...response.data }));
      setShowEditModal(false);
      toast.success("Video updated successfully!");
    } catch (err) {
      toast.error("Failed to update video.");
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <Navbar />
        <div className="text-center p-10">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <Navbar />
        <div className="text-center p-10 text-red-500 font-semibold">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      {showEditModal && (
        <EditVideoModal
          video={video}
          onSave={handleSaveEdits}
          onCancel={() => setShowEditModal(false)}
        />
      )}
      <Navbar />
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {video && (
            <>
              {/* Video Player */}
              <div className="w-full h-[576px] rounded-lg overflow-hidden shadow-xl bg-black">
                <iframe
                  src={`https://streamtape.com/e/${video.fileId}`}
                  title={video.title}
                  frameBorder="0"
                  allowFullScreen
                  className="w-full h-full"
                ></iframe>
              </div>

              {/* Video Details & Like Button */}
              <div className="mt-6 bg-white p-6 rounded-lg shadow-md">
                <h1 className="text-3xl font-bold text-gray-900">
                  {video.title}
                </h1>
                <div className="flex justify-between items-center mt-4">
                  <div className="text-sm text-gray-600">
                    <span>{video.views} views</span>
                    <span className="mx-2">•</span>
                    <span>
                      {new Date(video.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={throttledLikeHandler}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-full font-semibold transition-colors ${
                      video.isLiked
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                    }`}
                  >
                    <FcLike />
                    <span>{video.likesCount}</span>
                  </button>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <p className="text-gray-800">
                      Uploaded by{" "}
                      <Link
                        to={`/profile/${video.uploader?.username}`}
                        className="font-bold hover:text-blue-600 hover:underline"
                      >
                        {video.uploader?.username || "Unknown"}
                      </Link>
                    </p>

                    {user && user.id === video.uploader?._id && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setShowEditModal(true)}
                          className="text-sm px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300"
                        >
                          Edit
                        </button>
                        <button
                          onClick={handleDelete}
                          className="text-sm px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="mt-2 text-gray-700 whitespace-pre-wrap">
                    {video.description}
                  </p>
                </div>
              </div>

              {/* Comment Section */}
              <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-bold mb-4">
                  {comments.length} Comments
                </h2>
                {isAuthenticated ? (
                  <form onSubmit={handleCommentSubmit} className="mb-6">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="w-full p-2 border rounded-md"
                      rows="3"
                    ></textarea>
                    <button
                      type="submit"
                      className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700"
                    >
                      Post Comment
                    </button>
                  </form>
                ) : (
                  <p className="mb-6 text-gray-600">
                    Please{" "}
                    <Link to="/login" className="text-blue-600">
                      log in
                    </Link>{" "}
                    to post a comment.
                  </p>
                )}

                <div className="space-y-4">
                  {comments.map((comment) => (
                    <div key={comment._id} className="flex space-x-3">
                      <div className="flex-shrink-0 w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center font-bold text-gray-600">
                        {comment.author.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold">
                          <Link
                            to={`/profile/${comment.author.username}`}
                            className="hover:underline"
                          >
                            {comment.author.username}
                          </Link>{" "}
                          <span className="text-xs text-gray-500 font-normal">
                            {new Date(comment.createdAt).toLocaleString()}
                          </span>
                        </p>
                        <p>{comment.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Suggested Videos Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <h3 className="font-bold text-lg mb-4">Up Next</h3>
            <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-2">
              {suggestedVideos.length > 0 ? (
                suggestedVideos.map((suggestedVideo) => (
                  <SuggestedVideoCard
                    key={suggestedVideo._id}
                    video={suggestedVideo}
                  />
                ))
              ) : (
                <p className="text-gray-500">No other videos to show.</p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default VideoPlayerPage;
