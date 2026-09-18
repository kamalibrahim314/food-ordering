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

import { AppError } from "./utils/appError.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(helmet());

app.use((req, res, next) => {
    if (req.body && Object.keys(req.body).length) {
        Object.assign(req.body, JSON.parse(xss(JSON.stringify(req.body))));
    }

    next();
});

const allowedOrigins = process.env.ALLOWED_ORIGIN || "http://localhost:3000";

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log("❌ Blocked origin:", origin);
            callback(new Error("Not allowed by CORS"));
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

app.use(
    "/uploads",
    express.static(path.join(__dirname, "../uploads"))
);

// Initialize DB once
let dbInitialized = false;

const initializeDB = async () => {
    if (dbInitialized) return;

    await connectDB();
    await syncDB();

    dbInitialized = true;
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