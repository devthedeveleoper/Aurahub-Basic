import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import useAuthStore from './stores/authStore';
import API from './api';
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import VideoPlayerPage from './pages/VideoPlayerPage';
import ProfilePage from "./pages/ProfilePage";
import UploadForm from './components/UploadForm';

function App() {
    const { setUser, clearUser } = useAuthStore();

    // --- THIS USEEFFECT IS THE MISSING PIECE ---
    // It runs when the app first loads to check for an existing session.
    useEffect(() => {
        const checkAuthStatus = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    // The axios interceptor will automatically add the token to this request
                    console.log("Token found, checking auth status...");
                    const res = await API.get('/auth/status');
                    if (res.data.isAuthenticated) {
                        setUser(res.data.user);
                    }
                } catch (error) {
                    // This will happen if the token is invalid or expired
                    console.error('Auth check failed:', error);
                    localStorage.removeItem('token');
                    clearUser();
                }
            }
        };
        checkAuthStatus();
    }, [setUser, clearUser]); // Dependencies ensure this runs once on load

    return (
      <Router>
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/upload" element={<UploadForm />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/video/:id" element={<VideoPlayerPage />} />
          <Route path="/profile/:username" element={<ProfilePage />} />
        </Routes>
      </Router>
    );
}

export default App;