import { AppError } from "../utils/appError.js";
import { decodeTokenAndFeachUser, getTokenSignature, TokenType } from "../utils/token.js";

export const authentication = (tokenType = TokenType.access) => {
    return async (req, res, next) => {
        try {
            const { authorization } = req.headers;
            if (!authorization) {
                return res.status(401).json({ message: "unauthorized" });
            }

            const [prefix, token] = authorization?.split(" ") || [];

            if (!prefix || !token) throw new AppError("Token not found", 401);

            const signature = await getTokenSignature(tokenType, prefix)
            if (!signature) throw new AppError("Token signature", 401);

            const decoded = await decodeTokenAndFeachUser(token, signature);
            if (!decoded) throw new AppError("invalid token decoded", 401);

            req.user = decoded?.user?.dataValues;
            req.decoded = decoded;

            next();
        } catch (error) {
            console.error("Auth error:", error);
            return res.status(401).json({ message: "Unauthorized" });
        }
    };
}
