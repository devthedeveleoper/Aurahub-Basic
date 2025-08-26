import React from "react";
import { Link } from "react-router-dom";
import VideoThumbnail from "./VideoThumbnail"; // <-- Import the new component

const VideoCard = ({ video }) => {
  return (
    <Link to={`/video/${video._id}`} className="block group">
      <div className="overflow-hidden rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 bg-white">
        {/* Replace the old img tag with the new smart component */}
        <VideoThumbnail
          customThumbnailUrl={video.thumbnailUrl}
          fileId={video.fileId}
          altText={video.title}
        />

        <div className="p-4">
          <h3 className="text-lg font-bold text-gray-900 truncate group-hover:text-blue-600">
            {video.title}
          </h3>
          <p className="mt-1 text-sm text-gray-600">
            <Link
              to={`/profile/${video.uploader?.username}`}
              className="hover:text-blue-600 hover:underline"
            >
              {video.uploader?.username || "Unknown Uploader"}
            </Link>
          </p>
          <div className="mt-2 flex items-center text-xs text-gray-500">
            <span>{video.views} views</span>
            <span className="mx-2">•</span>
            <span>{new Date(video.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default VideoCard;
