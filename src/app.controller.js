import dotenv from "dotenv"
dotenv.config()

import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import express from "express"
import cors from "cors"
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import xss from "xss";

import { connectDB, syncDB } from "./DB/DBConnection.js";
import "./DB/models/associations.js"; // wherever you define associations
import router from "./modules/index.js";

import { AppError } from "./utils/appError.js";

const app = express();
const PORT = process.env.PORT || 5003;

export const bootstrap = () => {
    // security middlewares
    app.use(helmet());
    app.use((req, res, next) => {
        if (req.body && Object.keys(req.body).length)
            Object.assign(req.body, JSON.parse(xss(JSON.stringify(req.body))));

        if (req.query && Object.keys(req.query).length)
            Object.assign(req.query, JSON.parse(xss(JSON.stringify(req.query))));

        if (req.params && Object.keys(req.params).length)
            Object.assign(req.params, JSON.parse(xss(JSON.stringify(req.params))));
        next();
    });

    // CORS configuration
    const allowedOrigins = process.env.ALLOWED_ORIGIN || 'http://localhost:3000'

    app.use(cors(
        {
            origin: (origin, callback) => {
                if (!origin || allowedOrigins.includes(origin)) {
                    callback(null, true);
                } else {
                    console.log("❌ Blocked origin:", origin);
                    callback(new Error('Not allowed by CORS'));
                }
            },
            credentials: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            exposedHeaders: ['Content-length'],
        }
    ))

    // rate limiting auth routes
    app.use("/auth", rateLimit({
        windowMs: 20 * 60 * 1000,
        max: 20,
        message: "Too many requests from this IP, please try again after 15 minutes",
        statusCode: 429,
        legacyHeaders: false,
    }))

    // body parsers
    app.use(cookieParser());
    app.use(express.json());

    app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

    // connect to database
    const initDB = async () => {
        await connectDB();
        await syncDB();
    };

    initDB();


    // routes
    app.use('/', router)

    // handle undefined routes
    app.use("/*demo", (req, res) => {
        throw new AppError(`invalid url ${req.originalUrl}`, 404);
    });

    app.use((err, req, res, next) => {
        const statusCode = err.statusCode || 500;
        const status = err.status || "error";

        res.status(statusCode).json({
            success: false,
            code: statusCode,
            status,
            message: err.message || 'An unexpected error occurred',
            arabicMessage:
                err.statusCode === 404
                    ? 'الصفحة غير موجودة'
                    : 'حدث خطأ ما، يرجى المحاولة لاحقاً',
        });
    });

    // start server
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`🔗 http://localhost:${PORT}`);
    });

}