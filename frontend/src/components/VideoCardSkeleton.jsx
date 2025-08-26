import React from "react";

const VideoCardSkeleton = () => {
  return (
    <div className="flex flex-col gap-2">
      {/* Pulsing Thumbnail Placeholder */}
      <div className="bg-gray-300 rounded-lg w-full h-48 animate-pulse"></div>

      <div className="flex gap-2">
        {/* Uploader Avatar Placeholder (optional, but good for layout) */}
        <div className="bg-gray-300 rounded-full w-10 h-10 animate-pulse flex-shrink-0"></div>

        <div className="flex flex-col gap-2 w-full">
          {/* Title Placeholder */}
          <div className="bg-gray-300 rounded-md w-full h-4 animate-pulse"></div>
          {/* Sub-Title Placeholder */}
          <div className="bg-gray-300 rounded-md w-2/3 h-4 animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};

export default VideoCardSkeleton;
