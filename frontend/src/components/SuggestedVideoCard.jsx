import React from "react";
import { Link } from "react-router-dom";

const FALLBACK_IMAGE_URL = "https://i.ibb.co/hRHpLpv3/luffy-crying.gif";

const SuggestedVideoCard = ({ video }) => {
  const thumbnailUrl = video.thumbnailUrl
    ? video.thumbnailUrl
    : `https://thumb.tapecontent.net/thumb/${video.fileId}/thumb.jpg`;

  const handleImageError = (e) => {
    e.target.onerror = null;
    e.target.src = FALLBACK_IMAGE_URL;
  };

  return (
    <Link to={`/video/${video._id}`} className="flex space-x-3 group">
      {/* Thumbnail */}
      <div className="flex-shrink-0 w-40 h-24">
        <img
          src={thumbnailUrl}
          alt={video.title}
          onError={handleImageError}
          className="w-full h-full object-cover rounded-lg"
        />
      </div>
      {/* Video Info */}
      <div className="flex flex-col">
        <h4 className="font-bold text-sm text-gray-900 group-hover:text-blue-600 leading-tight">
          {video.title}
        </h4>
        <p className="text-xs text-gray-600 mt-1">
          {video.uploader?.username || "Unknown Uploader"}
        </p>
        <p className="text-xs text-gray-500 mt-1">{video.views} views</p>
      </div>
    </Link>
  );
};

export default SuggestedVideoCard;
