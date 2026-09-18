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

app.use(helmet());

// CORS configuration supporting comma-separated ALLOWED_ORIGINS and ALLOWED_ORIGIN
const rawOrigins = process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || "http://localhost:3000";
const allowedOrigins = rawOrigins.split(",").map((o) => o.trim()).filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
            callback(null, true);
        } else {
            console.log("❌ Blocked origin:", origin);
            callback(null, false);
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
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