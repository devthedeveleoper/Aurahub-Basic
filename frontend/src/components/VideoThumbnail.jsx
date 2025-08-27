import React, { useState, useEffect } from "react";
import axios from "axios";

const FALLBACK_IMAGE_URL = "https://i.ibb.co/hRHpLpv3/luffy-crying.gif";

const VideoThumbnail = ({ fileId, customThumbnailUrl, altText }) => {
  const [imageUrl, setImageUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // This function will determine which thumbnail to use
    const fetchThumbnail = async () => {
      setIsLoading(true);
      // Priority 1: If a custom thumbnail URL is provided, use it immediately.
      if (customThumbnailUrl) {
        setImageUrl(customThumbnailUrl);
        setIsLoading(false);
        return;
      }

      // Priority 2: If no custom thumbnail, fetch the URL from the AuraHub API.
      try {
        const response = await axios.get(
          `https://api.aurahub.fun/fs/files/thumbnail/${fileId}`
        );
        if (response.data && response.data.thumbnail_url) {
          setImageUrl(response.data.thumbnail_url);
        } else {
          // This handles cases where the API call succeeds but doesn't return a URL
          setImageUrl(FALLBACK_IMAGE_URL);
        }
      } catch (error) {
        // This catches network errors or 404s (like 'Splash not found')
        console.error(`Failed to fetch thumbnail for fileId ${fileId}:`, error);
        setImageUrl(FALLBACK_IMAGE_URL);
      } finally {
        setIsLoading(false);
      }
    };

    fetchThumbnail();
  }, [fileId, customThumbnailUrl]); // Rerun if the fileId or custom URL changes

  const handleImageError = (e) => {
    // Priority 3: A final fallback in case the URL is valid but the image is broken.
    e.target.onerror = null;
    e.target.src = FALLBACK_IMAGE_URL;
  };

  // While loading, show a simple placeholder
  if (isLoading) {
    return <div className="w-full h-48 bg-gray-200 animate-pulse"></div>;
  }

  // Once loaded, display the image
  return (
    <img
      src={imageUrl}
      alt={altText}
      onError={handleImageError}
      className="w-full h-48 object-contain transition-transform duration-300 group-hover:scale-105"
    />
  );
};

export default VideoThumbnail;
