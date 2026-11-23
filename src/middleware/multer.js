import multer from "multer";
import { AppError } from "../utils/appError.js";

// --- Allowed file types ---
const MIME_TYPES = {
  images: ["image/jpeg", "image/png", "image/jpg", "image/webp"],
  videos: ["video/mp4", "video/mpeg", "video/quicktime"],
  pdfs: ["application/pdf"],
  docs: ["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
};

// --- File size limits (in bytes) ---
const FILE_LIMITS = {
  images: 5 * 1024 * 1024, // 5 MB
  videos: 1.5 * 1024 * 1024 * 1024, // 1.5 GB
  pdfs: 20 * 1024 * 1024, // 20 MB
  docs: 10 * 1024 * 1024, // 10 MB
};

// --- File filter ---
const fileFilter = (allowedTypes) => (req, file, cb) => {
  if (!allowedTypes?.length)
    return cb(new AppError("No allowed file types specified.", 400));

  if (allowedTypes.includes(file.mimetype)) cb(null, true);
  else
    cb(
      new AppError(
        `Invalid file type (${file.mimetype}). Allowed: ${allowedTypes.join(", ")}`,
        400
      ),
      false
    );
};

// --- Create Multer instance dynamically with Memory Storage (no disk writes) ---
export const createUploader = (options = {}) => {
  const {
    type = "images",
    folder = "general",
  } = options;

  const allowedTypes = MIME_TYPES[type] || MIME_TYPES.images;
  const fileSizeLimit = FILE_LIMITS[type] || FILE_LIMITS.images;

  // Always use memoryStorage to ensure compatibility with serverless environments (e.g. Vercel)
  const storage = multer.memoryStorage();

  const instance = multer({
    storage,
    fileFilter: fileFilter(allowedTypes),
    limits: { fileSize: fileSizeLimit },
  });

  // Attach default folder destination metadata
  instance.targetFolder = folder;

  return instance;
};

// --- Main handler ---
export const upload = (multerInstance, type, field, maxCount = 1) => {
  return (req, res, next) => {
    let uploadFn;

    switch (type) {
      case "single":
        uploadFn = multerInstance.single(field);
        break;
      case "array":
        uploadFn = multerInstance.array(field, maxCount);
        break;
      case "fields":
        uploadFn = multerInstance.fields(field);
        break;
      default:
        return next(new AppError("Invalid upload type specified.", 500));
    }

    uploadFn(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        return next(new AppError(`Multer error: ${err.message}`, 400));
      } else if (err) {
        return next(new AppError(`Upload failed: ${err.message}`, 500));
      }

      // Attach configured folder to request if available
      if (multerInstance?.targetFolder) {
        req.uploadFolder = multerInstance.targetFolder;
      }

      next();
    });
  };
};
