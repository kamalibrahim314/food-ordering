import dotenv from "dotenv";
dotenv.config();

import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.cloudinaryCloudName,
  api_key: process.env.CLOUDINARY_API_KEY || process.env.cloudinaryApiKey,
  api_secret: process.env.CLOUDINARY_API_SECRET || process.env.cloudinaryApiSecret,
  secure: true,
});

/**
 * Upload a Buffer to Cloudinary via upload_stream
 * @param {Buffer} buffer - File buffer from multer memoryStorage
 * @param {Object} options - Upload options (folder, public_id, etc.)
 * @returns {Promise<Object>} Cloudinary upload result containing secure_url, public_id, etc.
 */
export const uploadStreamToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const subFolder = options.folder ? options.folder.replace(/^\/+/, "") : "general";
    const fullFolder = `food-ordering/${subFolder}`;

    const uploadOptions = {
      folder: fullFolder,
      resource_type: options.resource_type || "auto",
      ...options,
    };
    // Ensure folder is set to our structured path
    uploadOptions.folder = fullFolder;

    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) {
        console.error("Cloudinary upload_stream error:", error);
        return reject(error);
      }
      resolve(result);
    });

    stream.end(buffer);
  });
};

/**
 * Upload a local file path to Cloudinary (used by migration scripts or file uploads)
 * @param {string} filePath - Absolute or relative local path to file
 * @param {Object} options - Upload options
 * @returns {Promise<Object>} Cloudinary upload result
 */
export const uploadFileToCloudinary = async (filePath, options = {}) => {
  const subFolder = options.folder ? options.folder.replace(/^\/+/, "") : "general";
  const fullFolder = `food-ordering/${subFolder}`;

  return await cloudinary.uploader.upload(filePath, {
    folder: fullFolder,
    resource_type: options.resource_type || "auto",
    ...options,
  });
};

/**
 * Extract Cloudinary public_id from a secure_url or return public_id directly
 * Handles URLs like https://res.cloudinary.com/<cloud>/image/upload/v12345/food-ordering/categories/dinner-123.jpg
 * Returns "food-ordering/categories/dinner-123"
 */
export const getPublicIdFromUrl = (urlOrPublicId) => {
  if (!urlOrPublicId || typeof urlOrPublicId !== "string") return null;

  if (!urlOrPublicId.startsWith("http://") && !urlOrPublicId.startsWith("https://")) {
    return urlOrPublicId;
  }

  // Match anything between upload/(v<digits>/)? and the file extension
  const match = urlOrPublicId.match(/(?:image|video|raw)\/upload\/(?:v\d+\/)?([^\.]+)/i);
  if (match && match[1]) {
    return match[1];
  }

  return null;
};

/**
 * Safely delete an asset from Cloudinary given its URL or public_id
 * @param {string} urlOrPublicId
 * @returns {Promise<boolean>}
 */
export const deleteFromCloudinary = async (urlOrPublicId) => {
  if (!urlOrPublicId || typeof urlOrPublicId !== "string") return false;

  const publicId = getPublicIdFromUrl(urlOrPublicId);
  if (!publicId) return false;

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === "ok";
  } catch (err) {
    console.error(`Failed to delete asset ${publicId} from Cloudinary:`, err.message);
    return false;
  }
};

export default cloudinary;
