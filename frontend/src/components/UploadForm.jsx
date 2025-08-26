import React, { useState, useRef, useEffect } from "react";
import API from "../api";

const UploadForm = () => {
  // ... (All state variables remain the same)
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnail, setThumbnail] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [uploadType, setUploadType] = useState("direct");
  const [statusMessage, setStatusMessage] = useState("");
  const [isPolling, setIsPolling] = useState(false);
  const pollingIntervalRef = useRef(null);

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const createFinalRecord = async (videoId) => {
    setStatusMessage("Publishing video...");
    const finalFormData = new FormData();
    finalFormData.append("title", title);
    finalFormData.append("description", description);
    finalFormData.append("videoId", videoId);

    // *** KEY CHANGE HERE ***
    // Only append the thumbnail if the user has selected one
    if (thumbnail) {
      finalFormData.append("thumbnailFile", thumbnail);
    }

    const res = await API.post("/videos/create-record", finalFormData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    setStatusMessage(res.data.message);
  };

  const handleDirectUpload = async (e) => {
    e.preventDefault();
    // Thumbnail is no longer required here for the initial check
    if (!videoFile || !title) {
      setStatusMessage("Please provide a title and a video file.");
      return;
    }

    try {
      // ... (getting upload URL and uploading video remains the same)
      setStatusMessage("Getting upload URL...");
      const {
        data: { url: uploadUrl },
      } = await API.get("/videos/get-upload-url");

      setStatusMessage("Uploading video...");
      const videoFormData = new FormData();
      videoFormData.append("file", videoFile);

      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        body: videoFormData,
      });
      const uploadResult = await uploadResponse.json();

      if (uploadResult.status !== 200)
        throw new Error(uploadResult.msg || "Video upload failed");

      const videoId = uploadResult.result.id;

      // Use the new centralized function to create the record
      await createFinalRecord(videoId);
    } catch (error) {
      console.error("Upload failed:", error);
      setStatusMessage("Upload failed. Please try again.");
    }
  };

  const handleRemoteUpload = async (e) => {
    e.preventDefault();
    // Thumbnail is no longer required here for the initial check
    if (!videoUrl || !title) {
      setStatusMessage("Please provide a video URL and a title.");
      return;
    }

    try {
      // ... (starting remote upload and polling logic remains the same)
      setStatusMessage("Queuing remote upload...");
      const startResponse = await API.post("/videos/remote-upload/start", {
        videoUrl,
      });
      const { id: remoteId } = startResponse.data;

      if (!remoteId) throw new Error("Failed to start remote upload.");

      setIsPolling(true);
      setStatusMessage(`Upload queued (ID: ${remoteId}). Checking status...`);

      pollingIntervalRef.current = setInterval(async () => {
        const statusResponse = await API.get(
          `/videos/remote-upload/status/${remoteId}`
        );
        const statusData =
          statusResponse.data[Object.keys(statusResponse.data)[0]];

        if (statusData && statusData.status === "finished") {
          clearInterval(pollingIntervalRef.current);
          setIsPolling(false);
          const videoId = statusData.linkid;
          // Use the new centralized function to create the record
          await createFinalRecord(videoId);
        } else if (statusData && statusData.status === "error") {
          // ... error handling
        } else {
          // ... status update
        }
      }, 5000);
    } catch (error) {
      console.error("Remote upload failed:", error);
      setStatusMessage(
        "Remote upload failed. Please check the URL and try again."
      );
      setIsPolling(false);
    }
  };

  return (
    <div className="bg-gray-100 flex items-center justify-center min-h-screen">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-2xl">
        {/* ... (The switcher buttons remain the same) ... */}
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
          Upload a New Video 🎬
        </h2>

        <div className="flex justify-center mb-6 rounded-lg p-1 bg-gray-200">
          <button
            onClick={() => setUploadType("direct")}
            disabled={isPolling}
            className={`w-1/2 p-2 rounded-md font-semibold transition-colors duration-300 ${
              uploadType === "direct"
                ? "bg-blue-600 text-white"
                : "hover:bg-gray-300"
            } disabled:opacity-50`}
          >
            Direct Upload
          </button>
          <button
            onClick={() => setUploadType("remote")}
            disabled={isPolling}
            className={`w-1/2 p-2 rounded-md font-semibold transition-colors duration-300 ${
              uploadType === "remote"
                ? "bg-blue-600 text-white"
                : "hover:bg-gray-300"
            } disabled:opacity-50`}
          >
            Remote URL Upload
          </button>
        </div>

        <form
          onSubmit={
            uploadType === "direct" ? handleDirectUpload : handleRemoteUpload
          }
          className="space-y-6"
        >
          {/* ... (Title and Description inputs remain the same) ... */}
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Title
            </label>
            <input
              id="title"
              type="text"
              placeholder="My Awesome Video"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Description
            </label>
            <textarea
              id="description"
              placeholder="A short description of your video..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 h-24 resize-none"
            />
          </div>

          <div>
            <label
              htmlFor="thumbnail"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Custom Thumbnail{" "}
              <span className="text-xs text-gray-500">(Optional)</span>
            </label>
            <input
              id="thumbnail"
              type="file"
              accept="image/*"
              onChange={(e) => setThumbnail(e.target.files[0])}
              // *** KEY CHANGE HERE: "required" is removed ***
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

          {/* ... (The rest of the form remains the same) ... */}
          {uploadType === "direct" ? (
            <div>
              <label
                htmlFor="videoFile"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Video File
              </label>
              <input
                id="videoFile"
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files[0])}
                required
                className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
            </div>
          ) : (
            <div>
              <label
                htmlFor="videoUrl"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Video URL
              </label>
              <input
                id="videoUrl"
                type="url"
                placeholder="http://example.com/video.mp4"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isPolling}
            className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPolling ? "Uploading..." : "Upload Video"}
          </button>
        </form>

        {statusMessage && (
          <p className="mt-4 text-center text-sm font-medium text-gray-600">
            {statusMessage}
          </p>
        )}
      </div>
    </div>
  );
};

export default UploadForm;
