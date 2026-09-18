import dotenv from "dotenv";
dotenv.config();

import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import xss from "xss";

import { connectDB, syncDB } from "./DB/DBConnection.js";
import "./DB/models/associations.js";
import router from "./modules/index.js";
import { getSocketInstance } from "./socket/socket.js";
import { AppError } from "./utils/appError.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration supporting comma-separated ALLOWED_ORIGINS, ALLOWED_ORIGIN, and defaults
const defaultAllowedOrigins = [
    "https://foodie-silk-theta.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
];
const rawOrigins = process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || "";
const configuredOrigins = rawOrigins ? rawOrigins.split(",").map((o) => o.trim()).filter(Boolean) : [];
const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...configuredOrigins])];

const isAllowedOrigin = (origin) => {
    if (!origin) return true;
    if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) return true;
    if (/^https:\/\/foodie.*\.vercel\.app$/.test(origin)) return true;
    return false;
};

app.use(cors({
    origin: (origin, callback) => {
        if (isAllowedOrigin(origin)) {
            callback(null, true);
        } else {
            console.log("❌ Blocked origin:", origin);
            callback(null, false);
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    exposedHeaders: ["Content-length"],
}));

app.use("/auth", rateLimit({
    windowMs: 20 * 60 * 1000,
    max: 1000000000,
    message: "Too many requests from this IP, please try again after 15 minutes",
    statusCode: 429,
    legacyHeaders: false,
}));

app.use(cookieParser());
app.use(express.json());

// XSS sanitizer middleware (executed AFTER body parsing)
app.use((req, res, next) => {
    if (req.body && typeof req.body === "object" && Object.keys(req.body).length) {
        try {
            Object.assign(req.body, JSON.parse(xss(JSON.stringify(req.body))));
        } catch {
            // preserve req.body if stringify/parse fails
        }
    }
    next();
});

// Attach socket.io instance to req if available
app.use((req, res, next) => {
    req.io = getSocketInstance();
    next();
});

app.use(
    "/uploads",
    (req, res, next) => {
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
        next();
    },
    express.static(path.join(__dirname, "../uploads"))
);

// Initialize DB once with shared promise to handle cold starts
let dbInitialized = false;
let dbInitPromise = null;

const initializeDB = async () => {
    if (dbInitialized) return;

    if (!dbInitPromise) {
        dbInitPromise = (async () => {
            await connectDB();
            if (process.env.NODE_ENV !== "production" || process.env.DB_SYNC === "true") {
                await syncDB();
            }
            dbInitialized = true;
        })().catch((err) => {
            dbInitPromise = null; // allow retry on next request if connection failed
            throw err;
        });
    }

    await dbInitPromise;
};

// Routes
app.use("/", async (req, res, next) => {
    try {
        await initializeDB();
        next();
    } catch (error) {
        next(error);
    }
});

app.use("/", router);

// 404
app.use((req, res) => {
    throw new AppError(
        `invalid url ${req.originalUrl}`,
        404
    );
});

// Error handler
app.use((err, req, res, next) => {
    const statusCode = err.statusCode || 500;
    const status = err.status || "error";

    res.status(statusCode).json({
        success: false,
        code: statusCode,
        status,
        message: err.message || "An unexpected error occurred",
    });
});

export default app;