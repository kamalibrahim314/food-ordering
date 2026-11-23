import path from "path";
import fs from "fs";
import { deleteFromCloudinary } from "./cloudinary.js";

/**
 * Resolves the public base URL of the API.
 * Priority:
 * 1. process.env.API_URL / BASE_URL / SERVER_URL
 * 2. req headers (x-forwarded-proto + x-forwarded-host / host)
 * 3. process.env.VERCEL_URL (https://${process.env.VERCEL_URL})
 * 4. Production default: https://food-ordering-brown-sigma.vercel.app
 * 5. Development default: http://localhost:5003
 */
export const getBaseUrl = (req) => {
    const envUrl = process.env.API_URL || process.env.BASE_URL || process.env.SERVER_URL;
    if (envUrl) {
        return envUrl.replace(/\/+$/, "");
    }
    if (req) {
        const protocol = req.headers?.["x-forwarded-proto"] || req.protocol || "http";
        const host = req.headers?.["x-forwarded-host"] || req.get?.("host") || req.headers?.host;
        if (host) {
            return `${protocol}://${host}`.replace(/\/+$/, "");
        }
    }
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`.replace(/\/+$/, "");
    }
    if (process.env.NODE_ENV === "production") {
        return "https://food-ordering-brown-sigma.vercel.app";
    }
    return "http://localhost:5003";
};

/**
 * Normalizes an image path or URL for saving into the database.
 * - If it is a Cloudinary or external URL (http:// or https://), keeps it as is.
 * - If it contains a local uploads path, extracts relative path: "uploads/..."
 */
export const normalizeUploadPath = (pathOrUrl) => {
    if (!pathOrUrl || typeof pathOrUrl !== "string") return pathOrUrl;
    const trimmed = pathOrUrl.trim();

    // Preserve Cloudinary and external URLs
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        // If it points to an old localhost upload, extract relative path
        if (trimmed.includes("localhost") || trimmed.includes("127.0.0.1")) {
            const match = trimmed.match(/(?:uploads\/|uploads\\).+$/i);
            if (match) {
                return match[0].replace(/\\+/g, "/").replace(/\/+/g, "/");
            }
        }
        return trimmed;
    }

    // Relative local upload path
    const match = trimmed.match(/(?:uploads\/|uploads\\).+$/i);
    if (match) {
        return match[0].replace(/\\+/g, "/").replace(/\/+/g, "/");
    }

    return trimmed;
};

/**
 * Normalizes any image URL for output to clients:
 * - If it's a Cloudinary URL or external cloud URL, returns as-is.
 * - If it contains a legacy local uploads path, prepends public base URL.
 */
export const formatImageUrl = (rawPath, req) => {
    if (!rawPath || typeof rawPath !== "string") return rawPath;
    const trimmed = rawPath.trim();

    // If it's a Cloudinary URL, return directly
    if (trimmed.includes("cloudinary.com") || trimmed.includes("res.cloudinary.com")) {
        return trimmed;
    }

    // Check if it's an external third-party domain (not localhost, not our current domain)
    const isLocalhost = trimmed.includes("localhost") || trimmed.includes("127.0.0.1");
    const isExternal = (trimmed.startsWith("http://") || trimmed.startsWith("https://")) && !isLocalhost;

    if (isExternal) {
        const isOurDomain = trimmed.includes("food-ordering-brown-sigma.vercel.app") ||
            (process.env.API_URL && trimmed.startsWith(process.env.API_URL));
        if (!isOurDomain && !trimmed.includes("/uploads/")) {
            return trimmed;
        }
    }

    // Handle local uploads path
    const uploadMatch = trimmed.match(/(?:uploads\/|uploads\\).+$/i);
    if (uploadMatch) {
        const relativePath = uploadMatch[0].replace(/\\+/g, "/").replace(/\/+/g, "/");
        const baseUrl = getBaseUrl(req);
        return `${baseUrl}/${relativePath}`;
    }

    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
        return trimmed;
    }

    const cleanPath = trimmed.replace(/^\/+/, "").replace(/\\+/g, "/").replace(/\/+/g, "/");
    const baseUrl = getBaseUrl(req);
    return `${baseUrl}/${cleanPath}`;
};

/**
 * Safely removes a file:
 * - If Cloudinary URL: destroys asset in Cloudinary
 * - If local file: unlinks if exists without throwing in read-only environments
 */
export const safeUnlinkUpload = async (pathOrUrl) => {
    if (!pathOrUrl || typeof pathOrUrl !== "string") return false;

    // Cloudinary URL removal
    if (pathOrUrl.includes("cloudinary.com") || pathOrUrl.includes("res.cloudinary.com")) {
        return await deleteFromCloudinary(pathOrUrl);
    }

    // Local filesystem removal (safe for read-only environments like Vercel)
    try {
        const relativePath = normalizeUploadPath(pathOrUrl);
        if (!relativePath || relativePath.startsWith("http")) return false;
        const fullPath = path.resolve(process.cwd(), relativePath);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            return true;
        }
    } catch (err) {
        console.warn("safeUnlinkUpload: Unable to delete local file:", err.message);
    }
    return false;
};
