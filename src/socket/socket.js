import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { RoleEnum } from "../DB/models/User.js";
import { decodeTokenAndFeachUser, verifyAnyToken } from "../utils/token.js";

let io;

const userSockets = new Map();
const restaurantSockets = new Map();

export const initializeSocket = (server) => {
    const defaultAllowed = [
        "https://foodie-silk-theta.vercel.app",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ];
    const rawOrigins = process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || "";
    const configuredOrigins = rawOrigins ? rawOrigins.split(",").map((o) => o.trim()).filter(Boolean) : [];
    const allowedOrigins = [...new Set([...defaultAllowed, ...configuredOrigins])];

    io = new Server(server, {
        cors: {
            origin: (origin, callback) => {
                if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin) || /^https:\/\/foodie.*\.vercel\.app$/.test(origin)) {
                    callback(null, true);
                } else {
                    callback(new Error("Blocked by CORS"));
                }
            },
            methods: ["GET", "POST"],
            credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000,
        connectionStateRecovery: {
            maxDisconnectionDuration: 2 * 60 * 1000,
            skipMiddlewares: true
        }
    });

    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) throw new Error("No token provided");

            const { decoded, role, signature } = verifyAnyToken(token);

            const { user } = await decodeTokenAndFeachUser(token, signature);

            socket.userId = user.id;
            socket.role = role;
            socket.restaurantId = user.restaurant_id;

            next();
        } catch (error) {
            console.error("Socket authentication error:", error.message);
            next(new Error("Authentication failed"));
        }
    });

    io.on("connection", (socket) => {
        console.log(`✅ Socket connected: ${socket.userId} (${socket.role})`);

        if (socket.role === RoleEnum.CUSTOMER) {
            userSockets.set(socket.userId, socket.id);
            socket.join(`user_${socket.userId}`);

            socket.on("join_order_room", (orderId) => {
                socket.join(`order_${orderId}`);
                console.log(`👤 User ${socket.userId} joined order room ${orderId}`);

                socket.emit("room_joined", {
                    order_id: orderId,
                    message: "Successfully joined order tracking"
                });
            });

            socket.on("leave_order_room", (orderId) => {
                socket.leave(`order_${orderId}`);
                console.log(`👤 User ${socket.userId} left order room ${orderId}`);
            });
        }

        if (socket.role === RoleEnum.RESTAURANT && socket.restaurantId) {
            if (!restaurantSockets.has(socket.restaurantId)) {
                restaurantSockets.set(socket.restaurantId, []);
            }
            restaurantSockets.get(socket.restaurantId).push(socket.id);

            socket.join(`restaurant_${socket.restaurantId}`);
            console.log(`🏪 Restaurant ${socket.restaurantId} connected`);

            socket.emit("restaurant_connected", {
                restaurant_id: socket.restaurantId,
                message: "Connected to order notifications"
            });
        }

        socket.on("ping", () => {
            socket.emit("pong");
        });

        socket.on("disconnect", (reason) => {
            console.log(`❌ Socket disconnected: ${socket.userId} - Reason: ${reason}`);

            if (socket.role === RoleEnum.CUSTOMER) {
                userSockets.delete(socket.userId);
            }

            if (socket.role === RoleEnum.RESTAURANT && socket.restaurantId) {
                const sockets = restaurantSockets.get(socket.restaurantId) || [];
                restaurantSockets.set(
                    socket.restaurantId,
                    sockets.filter(id => id !== socket.id)
                );
            }
        });

        socket.on("error", (error) => {
            console.error(`Socket error for user ${socket.userId}:`, error);
        });
    });

    return io;
};

export const getSocketInstance = () => io;

export const emitToUser = (userId, event, data) => {
    if (io) {
        io.to(`user_${userId}`).emit(event, data);
    }
};

export const emitToRestaurant = (restaurantId, event, data) => {
    if (io) {
        io.to(`restaurant_${restaurantId}`).emit(event, data);
    }
};

export const emitToOrder = (orderId, event, data) => {
    if (io) {
        io.to(`order_${orderId}`).emit(event, data);
    }
};
