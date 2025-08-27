import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "../stores/authStore";

const Navbar = () => {
  const { isAuthenticated, user, clearUser } = useAuthStore();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState(""); // Local state for the input

  const handleLogout = () => {
    localStorage.removeItem("token");
    clearUser();
    navigate("/login");
  };

  const handleSearch = (e) => {
    // When the user presses "Enter" and the search term isn't empty...
    if (e.key === "Enter" && searchTerm.trim() !== "") {
      // ...navigate to the dedicated search results page.
      navigate(`/search?q=${searchTerm.trim()}`);
    }
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
        <Link
          to="/"
          className="text-2xl font-bold text-blue-600 hover:text-blue-700"
        >
          Aurahub
        </Link>

        <div className="hidden md:flex items-center space-x-4">
          <div className="relative w-72 lg:w-96">
            <input
              type="text"
              className="w-full bg-gray-100 border-2 border-gray-200 rounded-full py-2 px-4 focus:outline-none focus:border-blue-500"
              placeholder="Search for videos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearch} // Triggers search on "Enter"
            />
          </div>
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
        {/* Mobile version would go here if needed */}
      </div>
    </nav>
  );
};

export default Navbar;
