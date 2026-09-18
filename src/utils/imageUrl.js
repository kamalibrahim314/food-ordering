import path from "path";
import fs from "fs";

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
 * Normalizes an image path for saving into the database.
 * If it contains an uploads path (even with http://localhost or https://...),
 * it extracts just the relative path: "uploads/..."
 * If it is an external URL (Cloudinary, etc.), keeps it as is.
 */
export const normalizeUploadPath = (pathOrUrl) => {
    if (!pathOrUrl || typeof pathOrUrl !== "string") return pathOrUrl;
    const match = pathOrUrl.match(/(?:uploads\/|uploads\\).+$/i);
    if (match) {
        return match[0].replace(/\\+/g, "/").replace(/\/+/g, "/");
    }
    return pathOrUrl.trim();
};

/**
 * Normalizes any image URL for output to clients:
 * - If it contains an uploads path, extracts relative path and prepends public base URL.
 * - If it's an external cloud URL (e.g. Cloudinary, S3), returns as-is.
 */
export const formatImageUrl = (rawPath, req) => {
    if (!rawPath || typeof rawPath !== "string") return rawPath;

    // Check if it's an external third-party domain (not localhost, not our current domain)
    const isLocalhost = rawPath.includes("localhost") || rawPath.includes("127.0.0.1");
    const isExternal = (rawPath.startsWith("http://") || rawPath.startsWith("https://")) && !isLocalhost;

    // If it is an external URL from another service, only rewrite if it's our domain or contains /uploads/
    if (isExternal) {
        const isOurDomain = rawPath.includes("food-ordering-brown-sigma.vercel.app") ||
            (process.env.API_URL && rawPath.startsWith(process.env.API_URL));
        if (!isOurDomain && !rawPath.includes("/uploads/")) {
            return rawPath;
        }
    }

    const uploadMatch = rawPath.match(/(?:uploads\/|uploads\\).+$/i);
    if (uploadMatch) {
        const relativePath = uploadMatch[0].replace(/\\+/g, "/").replace(/\/+/g, "/");
        const baseUrl = getBaseUrl(req);
        return `${baseUrl}/${relativePath}`;
    }

    if (rawPath.startsWith("http://") || rawPath.startsWith("https://")) {
        return rawPath;
    }

    const cleanPath = rawPath.replace(/^\/+/, "").replace(/\\+/g, "/").replace(/\/+/g, "/");
    const baseUrl = getBaseUrl(req);
    return `${baseUrl}/${cleanPath}`;
};

/**
 * Safely removes a local file given an absolute URL or relative upload path.
 */
export const safeUnlinkUpload = (pathOrUrl) => {
    if (!pathOrUrl || typeof pathOrUrl !== "string") return false;
    try {
        const relativePath = normalizeUploadPath(pathOrUrl);
        if (!relativePath || relativePath.startsWith("http")) return false;
        const fullPath = path.resolve(process.cwd(), relativePath);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
            return true;
        }
    } catch (err) {
        console.error("Failed to delete local upload:", err.message);
    }
    return false;
};
