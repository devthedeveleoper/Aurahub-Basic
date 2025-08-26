import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import API from "../api";
import Navbar from "../components/Navbar";
import useAuthStore from "../stores/authStore";
import { useThrottle } from "../hooks/useThrottle";
import { FcLike } from "react-icons/fc";
import SuggestedVideoCard from "../components/SuggestedVideoCard";

const VideoPlayerPage = () => {
  const effectRan = useRef(false);

  const { id } = useParams();
  const { isAuthenticated } = useAuthStore();
  const [video, setVideo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // NEW: State for suggested videos
  const [suggestedVideos, setSuggestedVideos] = useState([]);

  // State for likes
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);

  // State for comments
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {

    const fetchVideoData = async () => {
      // Only run this logic on the first true mount in development
      if (effectRan.current === false) {
        try {
          setLoading(true);

          // Fetch the main video and suggested videos in parallel for speed
          const [videoRes, suggestedRes, commentsRes] = await Promise.all([
            API.get(`/videos/${id}`),
            API.get("/videos", { params: { sort: "date_desc" } }), // Fetch latest videos
            API.get(`/videos/${id}/comments`),
          ]);

          setVideo(videoRes.data);
          setIsLiked(videoRes.data.isLiked);
          setLikesCount(videoRes.data.likesCount);
          setComments(commentsRes.data);

          // Filter out the currently playing video from the suggestions
          const filteredVideos = suggestedRes.data.filter((v) => v._id !== id);
          setSuggestedVideos(filteredVideos);

          // Increment view count
          await API.post(`/videos/${id}/view`);
        } catch (err) {
          setError("Could not load video data.");
          console.log(err);
        } finally {
          setLoading(false);
        }

        // This is the cleanup function for the effect
        return () => {
          effectRan.current = true;
        };
      }
    };

    fetchVideoData();
  }, [id]); // Re-run everything when the video ID changes

  const handleLike = async () => {
    if (!isAuthenticated) {
      alert("Please log in to like a video.");
      return;
    }
    try {
      const res = await API.post(`/videos/${id}/like`);
      setIsLiked(res.data.isLiked);
      setLikesCount(res.data.likes);
    } catch (err) {
      console.error("Failed to like video:", err);
    }
  };

  // Throttle the like handler to once every 2 seconds (2000ms)
  const throttledLikeHandler = useThrottle(handleLike, 2000);

  const handleCommentSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      const res = await API.post(`/videos/${id}/comments`, {
        text: newComment,
      });
      // Add the new comment to the top of the list instantly
      setComments([res.data, ...comments]);
      setNewComment(""); // Clear the input field
    } catch (err) {
      alert("Failed to post comment. Please try again.");
      console.log(err);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="bg-gray-50 min-h-screen">
      <Navbar />
      <main className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
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
            <h1 className="text-3xl font-bold text-gray-900">{video.title}</h1>
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-600">
                <span>{video.views} views</span>
                <span className="mx-2">•</span>
                <span>{new Date(video.createdAt).toLocaleDateString()}</span>
              </div>
              <button
                onClick={throttledLikeHandler}
                className={`flex items-center space-x-2 px-4 py-2 rounded-full font-semibold transition-colors ${
                  isLiked
                    ? "bg-blue-500 text-white"
                    : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                }`}
              >
                <FcLike />
                <span>{likesCount}</span>
              </button>
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-gray-800">
                Uploaded by{" "}
                <strong>{video.uploader?.username || "Unknown"}</strong>
              </p>
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
                <a href="/login" className="text-blue-600">
                  log in
                </a>{" "}
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
                      {comment.author.username}{" "}
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
        </div>

        {/* --- UPDATED Suggested Videos Sidebar --- */}
        <div className="lg:col-span-1">
          {/* This div will stick to the top as the user scrolls down */}
          <div className="sticky top-24">
            <h3 className="font-bold text-lg mb-4">Up Next</h3>
            {/* This inner div is what becomes scrollable */}
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
