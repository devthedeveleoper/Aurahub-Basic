import React, { useState, useEffect, useCallback } from "react";
import Navbar from "../components/Navbar";
import VideoCard from "../components/VideoCard";
import VideoCardSkeleton from "../components/VideoCardSkeleton";
import useSearchStore from "../stores/searchStore";
import API from "../api";

const HomePage = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");

  // State for pagination
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const searchTerm = useSearchStore((state) => state.searchTerm);

  const fetchVideos = useCallback(
    async (currentPage, currentSortBy, currentSearchTerm) => {
      // Only show the main loading state, not the "Load More..." button's loading state
      if (currentPage === 1) {
        setLoading(true);
      }

      try {
        let response;
        const params = { sort: currentSortBy, page: currentPage, limit: 12 };

        if (currentSearchTerm.trim() !== "") {
          // Note: The search endpoint needs pagination support for this to work perfectly.
          // Assuming it's updated or will be updated to handle page/limit.
          params.q = currentSearchTerm;
          response = await API.get("/videos/search", { params });
          setVideos(response.data.results || response.data); // Search replaces all content
          setHasMore(response.data.currentPage < response.data.totalPages);
        } else {
          response = await API.get("/videos", { params });
          // If it's the first page, replace videos. Otherwise, append them.
          setVideos((prev) =>
            currentPage === 1
              ? response.data.videos
              : [...prev, ...response.data.videos]
          );
          setHasMore(response.data.currentPage < response.data.totalPages);
        }
        setError("");
      } catch (err) {
        setError("Could not fetch videos. Please try again later.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Effect for initial load and when sort/search changes
  useEffect(() => {
    setPage(1); // Reset to page 1 for any new search or sort
    fetchVideos(1, sortBy, searchTerm);
  }, [searchTerm, sortBy, fetchVideos]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchVideos(nextPage, sortBy, searchTerm);
  };

  const pageTitle = searchTerm
    ? `Results for "${searchTerm}"`
    : "Trending Videos";

  return (
    <div className="bg-gray-50 min-h-screen">
      <Navbar />
      <main className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800">{pageTitle}</h2>

          <div className="flex items-center space-x-2">
            <label htmlFor="sort" className="text-sm font-medium text-gray-700">
              Sort by:
            </label>
            <select
              id="sort"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="date_desc">Newest</option>
              <option value="views_desc">Most Views</option>
              <option value="likes_desc">Most Likes</option>
              <option value="comments_desc">Most Comments</option>
              {searchTerm && <option value="relevance">Relevance</option>}
            </select>
          </div>
        </div>

        {error && <p className="text-center text-red-500">{error}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {loading && page === 1 ? (
            Array.from({ length: 12 }).map((_, index) => (
              <VideoCardSkeleton key={index} />
            ))
          ) : videos.length > 0 ? (
            videos.map((video) => <VideoCard key={video._id} video={video} />)
          ) : (
            <p className="col-span-full text-center text-gray-600">
              No videos found.
            </p>
          )}
        </div>

        <div className="text-center mt-12">
          {hasMore && (
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
            >
              {loading && page > 1 ? "Loading..." : "Load More"}
            </button>
          )}
        </div>
      </main>
    </div>
  );
};

export default HomePage;
