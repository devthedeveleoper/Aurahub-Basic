import React, { useState, useEffect, useCallback } from "react";
import Navbar from "../components/Navbar";
import VideoCard from "../components/VideoCard";
import VideoCardSkeleton from "../components/VideoCardSkeleton";
import API from "../api";
import { useInView } from "react-intersection-observer";

const HomePage = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const { ref, inView } = useInView({ threshold: 0.5 });

  const fetchVideos = useCallback(async (currentPage, currentSortBy) => {
    if (currentPage === 1) setLoading(true);

    try {
      const params = { sort: currentSortBy, page: currentPage, limit: 12 };
      const response = await API.get("/videos", { params });

      setVideos((prev) =>
        currentPage === 1
          ? response.data.videos
          : [...prev, ...response.data.videos]
      );
      setHasMore(response.data.currentPage < response.data.totalPages);
      setError("");
    } catch (err) {
      setError("Could not fetch videos.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    fetchVideos(1, sortBy);
  }, [sortBy, fetchVideos]);

  useEffect(() => {
    if (inView && hasMore && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchVideos(nextPage, sortBy);
    }
  }, [inView, hasMore, loading, page, sortBy, fetchVideos]);

  return (
    <div className="bg-gray-50 min-h-screen">
      <Navbar />
      <main className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800">Trending Videos</h2>
          {/* Sorting Dropdown */}
          <div className="flex items-center space-x-2">
            <label htmlFor="sort" className="text-sm font-medium text-gray-700">
              Sort by:
            </label>
            <select
              id="sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left"
            >
              <option value="date_desc">Newest</option>
              <option value="views_desc">Most Views</option>
              <option value="likes_desc">Most Likes</option>
              <option value="comments_desc">Most Comments</option>
            </select>
          </div>
        </div>

        {error && <p className="text-center text-red-500">{error}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {loading && page === 1
            ? Array.from({ length: 8 }).map((_, index) => (
                <VideoCardSkeleton key={index} />
              ))
            : videos.map((video) => (
                <VideoCard key={video._id} video={video} />
              ))}
        </div>

        <div ref={ref} className="h-10 mt-8">
          {loading && page > 1 && (
            <p className="text-center text-gray-600">Loading more videos...</p>
          )}
        </div>
      </main>
    </div>
  );
};

export default HomePage;
