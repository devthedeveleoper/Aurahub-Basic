import React, { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import VideoCard from "../components/VideoCard";
import useSearchStore from "../stores/searchStore";
import API from "../api";

const HomePage = () => {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // NEW: State to manage the selected sort option
  const [sortBy, setSortBy] = useState("date_desc");

  const searchTerm = useSearchStore((state) => state.searchTerm);

  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setLoading(true);
        let response;
        // Prepare params for the API request, including the sort option
        const params = { sort: sortBy };

        if (searchTerm.trim() !== "") {
          params.q = searchTerm;
          response = await API.get("/videos/search", { params });
        } else {
          response = await API.get("/videos", { params });
        }

        // The response from aggregation is the data itself
        setVideos(response.data);
        setError("");
      } catch (err) {
        setError("Could not fetch videos. Please try again later.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchVideos();
  }, [searchTerm, sortBy]); // Re-run effect when search term OR sort option changes

  const pageTitle = searchTerm
    ? `Results for "${searchTerm}"`
    : "Trending Videos";

  return (
    <div className="bg-gray-50 min-h-screen">
      <Navbar />
      <main className="container mx-auto px-6 py-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-800">{pageTitle}</h2>

          {/* NEW: Sorting Dropdown */}
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

        {loading && <p className="text-center">Loading...</p>}
        {error && <p className="text-center text-red-500">{error}</p>}

        {!loading &&
          !error &&
          (videos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {videos.map((video) => (
                <VideoCard key={video._id} video={video} />
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-600">No videos found.</p>
          ))}
      </main>
    </div>
  );
};

export default HomePage;
