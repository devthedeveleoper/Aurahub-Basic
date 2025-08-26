import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "../stores/authStore";
import useSearchStore from "../stores/searchStore"; // Import search store
import { useDebounce } from "../hooks/useDebounce"; // Import debounce hook
import API from "../api";

const Navbar = () => {
  const { isAuthenticated, user, clearUser } = useAuthStore();
  const navigate = useNavigate();

  // Get the global search term setter from the Zustand store
  const setGlobalSearchTerm = useSearchStore((state) => state.setSearchTerm);

  // Use local state for the input field to provide a responsive typing experience
  const [localSearchTerm, setLocalSearchTerm] = useState("");

  // Create a debounced version of the local search term
  const debouncedSearchTerm = useDebounce(localSearchTerm, 300);

  // This effect updates the global state only after the user stops typing
  useEffect(() => {
    setGlobalSearchTerm(debouncedSearchTerm);
  }, [debouncedSearchTerm, setGlobalSearchTerm]);

  const handleLogout = () => {
    // No API call needed
    localStorage.removeItem("token"); // Remove the token
    clearUser(); // Clear the Zustand store
    navigate("/login");
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-6 py-3 flex justify-between items-center">
        <Link
          to="/"
          className="text-2xl font-bold text-blue-600 hover:text-blue-700"
        >
          Aurahub
        </Link>

        <div className="relative w-1/3">
          <input
            type="text"
            className="w-full bg-gray-100 border-2 border-gray-200 rounded-full py-2 px-4 focus:outline-none focus:border-blue-500"
            placeholder="Search for videos..."
            value={localSearchTerm}
            onChange={(e) => setLocalSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex items-center space-x-4">
          {isAuthenticated ? (
            <>
              <Link
                to="/upload"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-semibold"
              >
                Upload
              </Link>
              <button
                onClick={handleLogout}
                className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 font-semibold"
              >
                Logout
              </button>
              <span className="font-medium text-gray-700">
                Welcome, {user.username}!
              </span>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-gray-800 hover:text-blue-600 font-semibold"
              >
                Login
              </Link>
              <Link
                to="/register"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-semibold"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
