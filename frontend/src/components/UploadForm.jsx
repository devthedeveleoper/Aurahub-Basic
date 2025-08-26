import React, { useState, useRef, useEffect } from "react";
import API from "../api";
import axios from "axios";

// Helper functions for formatting progress data
const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const formatTime = (seconds) => {
  if (seconds === Infinity || isNaN(seconds) || seconds < 0) return "...";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return [h, m, s]
    .map((v) => (v < 10 ? "0" + v : v))
    .filter((v, i) => v !== "00" || i > 0)
    .join(":");
};

const UploadForm = () => {
  // Form fields state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [thumbnail, setThumbnail] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState("");

  // UI and logic state
  const [uploadType, setUploadType] = useState("direct");
  const [statusMessage, setStatusMessage] = useState("");

  // Direct upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState("");
  const [eta, setEta] = useState("");

  // Remote upload state
  const [isPolling, setIsPolling] = useState(false);
  const pollingIntervalRef = useRef(null);

  // Cleanup effect for polling interval
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // UPDATED: createFinalRecord now sends the file to our backend
  const createFinalRecord = async (videoId) => {
    setStatusMessage("Publishing video...");
    const finalFormData = new FormData();
    finalFormData.append("title", title);
    finalFormData.append("description", description);
    finalFormData.append("videoId", videoId);

    // If a thumbnail file was selected, append it to the form data
    if (thumbnail) {
      finalFormData.append("thumbnailFile", thumbnail);
    }

    // Send everything to our backend in one request
    const res = await API.post("/videos/create-record", finalFormData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    setStatusMessage(res.data.message);
  };

  // Handler for direct file uploads
  const handleDirectUpload = async (e) => {
    e.preventDefault();
    if (!videoFile || !title) {
      setStatusMessage("Please provide a title and a video file.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setUploadSpeed("");
    setEta("");
    setStatusMessage("Preparing upload...");
    const startTime = Date.now();

    try {
      const {
        data: { url: uploadUrl },
      } = await API.get("/videos/get-upload-url");
      setStatusMessage("Uploading video...");

      const videoFormData = new FormData();
      videoFormData.append("file", videoFile);

      const response = await axios.post(uploadUrl, videoFormData, {
        onUploadProgress: (progressEvent) => {
          const { loaded, total } = progressEvent;
          const percent = Math.floor((loaded * 100) / total);
          setUploadProgress(percent);

          const elapsedTime = (Date.now() - startTime) / 1000;
          const bytesPerSecond = loaded / elapsedTime;
          const remainingBytes = total - loaded;
          const remainingSeconds = remainingBytes / bytesPerSecond;

          setUploadSpeed(`${formatBytes(bytesPerSecond)}/s`);
          setEta(`${formatTime(remainingSeconds)} remaining`);
        },
      });

      const uploadResult = response.data;
      if (uploadResult.status !== 200) {
        throw new Error(uploadResult.msg || "Video upload failed");
      }

      const videoId = uploadResult.result.id;
      await createFinalRecord(videoId);
    } catch (error) {
      console.error("Upload failed:", error);
      setStatusMessage("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  // Handler for remote URL uploads
  const handleRemoteUpload = async (e) => {
    e.preventDefault();
    if (!videoUrl || !title) {
      setStatusMessage("Please provide a video URL and a title.");
      return;
    }

    try {
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
          await createFinalRecord(videoId);
        } else if (statusData && statusData.status === "error") {
          clearInterval(pollingIntervalRef.current);
          setIsPolling(false);
          setStatusMessage(
            `Error during remote upload: ${
              statusData.error_message || "Unknown error"
            }`
          );
        } else if (statusData) {
          setStatusMessage(
            `Status: ${statusData.status} (${formatBytes(
              statusData.bytes_loaded
            )} / ${formatBytes(statusData.bytes_total)})`
          );
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
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">
          Upload a New Video 🎬
        </h2>

        <div className="flex justify-center mb-6 rounded-lg p-1 bg-gray-200">
          <button
            onClick={() => setUploadType("direct")}
            disabled={isPolling || isUploading}
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
            disabled={isPolling || isUploading}
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
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>

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

          {isUploading && (
            <div className="space-y-2">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-150"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-sm font-medium text-gray-600">
                <span>{uploadProgress}%</span>
                <span>{uploadSpeed}</span>
                <span>{eta}</span>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isPolling || isUploading}
            className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading
              ? `Uploading... (${uploadProgress}%)`
              : isPolling
              ? "Processing..."
              : "Upload Video"}
          </button>
        </form>

        {statusMessage && !isUploading && (
          <p className="mt-4 text-center text-sm font-medium text-gray-600">
            {statusMessage}
          </p>
        )}
      </div>
    </div>
  );
};

export default UploadForm;
