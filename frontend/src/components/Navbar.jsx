import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuthStore from "../stores/authStore";

const Navbar = () => {
  const { isAuthenticated, user, clearUser } = useAuthStore();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  // State to manage the mobile menu's visibility
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    clearUser();
    setIsMenuOpen(false); // Close menu on logout
    navigate("/login");
  };

  const handleSearch = (e) => {
    if (e.key === "Enter" && searchTerm.trim() !== "") {
      navigate(`/search?q=${searchTerm.trim()}`);
      setSearchTerm(""); // Clear search bar
      setIsMenuOpen(false); // Close menu after search
    }
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 py-3">
        {/* Main Navbar for all screen sizes */}
        <div className="flex justify-between items-center">
          {/* Brand/Logo */}
          <Link
            to="/"
            className="text-2xl font-bold text-blue-600 hover:text-blue-700"
            onClick={() => setIsMenuOpen(false)}
          >
            Aurahub
          </Link>

          {/* Desktop Menu (Visible on medium screens and up) */}
          <div className="hidden md:flex items-center space-x-4">
            <div className="relative w-72 lg:w-96">
              <input
                type="text"
                className="w-full bg-gray-100 border-2 border-gray-200 rounded-full py-2 px-4 focus:outline-none focus:border-blue-500"
                placeholder="Search for videos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearch}
              />
            </div>
            {isAuthenticated ? (
              <>
                <Link
                  to="/upload"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-semibold whitespace-nowrap"
                >
                  Upload
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-gray-200 text-gray-800 px-4 py-2 rounded-md hover:bg-gray-300 font-semibold"
                >
                  Logout
                </button>
                {user && (
                  <span className="font-medium text-gray-700 hidden lg:block whitespace-nowrap">
                    Welcome, {user.username}!
                  </span>
                )}
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
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 font-semibold whitespace-nowrap"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Hamburger Menu Button (Visible on mobile only) */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16m-7 6h7"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu (Collapsible) */}
        {isMenuOpen && (
          <div className="md:hidden mt-4">
            <div className="relative mb-4">
              <input
                type="text"
                className="w-full bg-gray-100 border-2 border-gray-200 rounded-full py-2 px-4 focus:outline-none focus:border-blue-500"
                placeholder="Search for videos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearch}
              />
            </div>
            <div className="flex flex-col items-start space-y-2">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/upload"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full text-left py-2 px-2 text-gray-800 font-semibold rounded-md hover:bg-gray-100"
                  >
                    Upload
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left py-2 px-2 text-gray-800 font-semibold rounded-md hover:bg-gray-100"
                  >
                    Logout
                  </button>
                  {user && (
                    <span className="py-2 px-2 font-medium text-gray-700">
                      Welcome, {user.username}!
                    </span>
                  )}
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full text-left py-2 px-2 text-gray-800 font-semibold rounded-md hover:bg-gray-100"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setIsMenuOpen(false)}
                    className="w-full text-left py-2 px-2 text-gray-800 font-semibold rounded-md hover:bg-gray-100"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
