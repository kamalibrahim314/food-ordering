import multer from "multer";
import path from "path";
import fs from "fs";
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

// --- Dynamic Disk Storage ---
const diskStorage = (folder = "general") =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      const uploadPath = path.join("uploads", folder);
      if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
      cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname);
      const base = path.basename(file.originalname, ext);
      cb(null, `${base}-${uniqueSuffix}${ext}`);
    },
  });

// --- Create Multer instance dynamically ---
export const createUploader = (options = {}) => {
  const {
    folder = "general",
    type = "images",
    useMemory = false,
  } = options;

  const allowedTypes = MIME_TYPES[type] || MIME_TYPES.images;
  const fileSizeLimit = FILE_LIMITS[type] || FILE_LIMITS.images;

  const storage = useMemory ? multer.memoryStorage() : diskStorage(folder);

  return multer({
    storage,
    fileFilter: fileFilter(allowedTypes),
    limits: { fileSize: fileSizeLimit },
  });
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
      next();
    });
  };
};
