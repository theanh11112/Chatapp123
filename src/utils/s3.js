// src/utils/s3.js
import { S3_BUCKET_NAME, AWS_S3_REGION } from "../config";

// Temporary mock upload for development (no backend required)
const uploadToS3 = async (file) => {
  try {
    console.log("📤 Mock uploading file:", file.name, file.type, file.size);

    // Simulate upload delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Generate mock S3 URL (this is just for display, no actual upload)
    const mockFileKey = `uploads/${Date.now()}-${file.name
      .replace(/\s+/g, "-")
      .toLowerCase()}`;
    const mockUrl = `https://${S3_BUCKET_NAME}.s3.${AWS_S3_REGION}.amazonaws.com/${mockFileKey}`;

    console.log("✅ Mock upload completed:", mockUrl);

    // Return a blob URL for actual file display
    const blobUrl = URL.createObjectURL(file);

    return {
      url: mockUrl, // For database storage
      previewUrl: blobUrl, // For immediate display
      fileKey: mockFileKey,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    };
  } catch (error) {
    console.error("❌ Mock upload failed:", error);

    // Fallback: create simple blob URL
    const blobUrl = URL.createObjectURL(file);
    return {
      url: blobUrl,
      previewUrl: blobUrl,
      fileKey: `fallback-${Date.now()}`,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    };
  }
};

// Helper function to generate S3 URL (for display only)
const getS3Url = (fileKey) => {
  if (!fileKey) return null;

  // If it's already a full URL, return as is
  if (fileKey.startsWith("http")) {
    return fileKey;
  }

  // If it's a blob URL, return as is
  if (fileKey.startsWith("blob:")) {
    return fileKey;
  }

  // Generate mock S3 URL from file key
  return `https://${S3_BUCKET_NAME}.s3.${AWS_S3_REGION}.amazonaws.com/${fileKey}`;
};

// Helper function to check if file is image
const isImageFile = (file) => {
  const imageTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ];
  return imageTypes.includes(file.type);
};

// Helper function to check if file is audio
const isAudioFile = (file) => {
  const audioTypes = [
    "audio/mpeg",
    "audio/wav",
    "audio/ogg",
    "audio/aac",
    "audio/webm",
  ];
  return audioTypes.includes(file.type);
};

// Helper function to validate file size (max 10MB)
const validateFileSize = (file, maxSizeMB = 10) => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    throw new Error(`File size must be less than ${maxSizeMB}MB`);
  }
  return true;
};

// Validate image dimensions (optional)
const validateImageDimensions = (file, maxWidth = 2048, maxHeight = 2048) => {
  return new Promise((resolve, reject) => {
    if (!isImageFile(file)) {
      resolve(true);
      return;
    }

    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = function () {
      URL.revokeObjectURL(url);

      if (img.width > maxWidth || img.height > maxHeight) {
        reject(
          new Error(
            `Image dimensions must be less than ${maxWidth}x${maxHeight} pixels`
          )
        );
      } else {
        resolve(true);
      }
    };

    img.onerror = function () {
      URL.revokeObjectURL(url);
      resolve(true); // If we can't check dimensions, just allow it
    };

    img.src = url;
  });
};

// Upload multiple files
const uploadMultipleToS3 = async (files) => {
  try {
    console.log(`📤 Mock uploading ${files.length} files...`);

    const uploadPromises = files.map((file) => uploadToS3(file));
    const results = await Promise.all(uploadPromises);

    console.log("✅ All mock uploads completed");
    return results;
  } catch (error) {
    console.error("❌ Multiple files upload failed:", error);
    throw error;
  }
};

// Mock delete function (does nothing in development)
const deleteFromS3 = async (fileKey) => {
  console.log("🗑️ Mock deleting file:", fileKey);

  // Simulate delete delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    success: true,
    message: "File deleted successfully (mock)",
    fileKey: fileKey,
  };
};

// Clean up blob URLs to prevent memory leaks
const revokeBlobUrl = (url) => {
  if (url && url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
};

// Get file type icon
const getFileTypeIcon = (fileType) => {
  if (isImageFile({ type: fileType })) return "🖼️";
  if (isAudioFile({ type: fileType })) return "🎵";
  if (fileType?.includes("pdf")) return "📄";
  if (fileType?.includes("word") || fileType?.includes("document")) return "📝";
  if (fileType?.includes("zip") || fileType?.includes("compressed"))
    return "📦";
  return "📎";
};

// Format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export {
  uploadToS3,
  uploadMultipleToS3,
  deleteFromS3,
  getS3Url,
  isImageFile,
  isAudioFile,
  validateFileSize,
  validateImageDimensions,
  revokeBlobUrl,
  getFileTypeIcon,
  formatFileSize,
};
