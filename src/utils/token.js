import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import User, { RoleEnum } from "../DB/models/User.js";
import { AppError } from "./appError.js";
import RevokedToken from "../DB/models/RevokedToken.js";

export const generateTokens = (user) => {
    const uniqueId = uuidv4();
    let secret;
    if (user.dataValues.role === RoleEnum.ADMIN) secret = process.env.adminSegnature;
    else if (user.dataValues.role === RoleEnum.CASHIER) secret = process.env.cashierSegnature;
    else if (user.dataValues.role === RoleEnum.RESTAURANT_OWNER) secret = process.env.restaurant_ownerSegnature;
    else if (user.dataValues.role === RoleEnum.CUSTOMER) secret = process.env.customersSegnature;
    else throw new AppError("Invalid role", 400);

    const accessToken = jwt.sign(
        {
            UserInfo: {
                id: user.id,
                role: user.role,
                name: user.name,
                email: user.email,
                phone_number: user.phone_number,
                profile_image: user.profile_image,
                isVerified: user.isVerified,
                jti: uniqueId
            }
        },
        secret,
        { expiresIn: '1d' }
    );

    const refreshToken = jwt.sign(
        {
            UserInfo: {
                id: user.id,
                jti: uniqueId
            }
        },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: '1y' }
    );

    return { accessToken, refreshToken };
};

export const setRefreshTokenCookie = (res, token) => {
    res.cookie('jwt', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 12 * 30 * 24 * 60 * 60 * 1000, // 12 months
    });
};


export const TokenType = {
    access: "access",
    refresh: "refresh"
}

export const getTokenSignature = async (tokenType, prefix) => {

    if (tokenType === TokenType.access) {
        if (prefix === process.env.customersPrefix) return process.env.customersSegnature;
        else if (prefix === process.env.cashierPrefix) return process.env.cashierSegnature;
        else if (prefix === process.env.adminPrefix) return process.env.adminSegnature;
        else if (prefix === process.env.restaurant_ownerPrefix) return process.env.restaurant_ownerSegnature;
        else return null;
    } else if (tokenType === TokenType.refresh) {
        if (prefix === process.env.customersPrefix) return process.env.customersSegnature;
        else if (prefix === process.env.cashierPrefix) return process.env.cashierSegnature;
        else if (prefix === process.env.adminPrefix) return process.env.adminSegnature;
        else if (prefix === process.env.restaurant_ownerPrefix) return process.env.restaurant_ownerSegnature;
        else return null;
    }
    return null
}

export const decodeTokenAndFeachUser = async (token, signature) => {
    const decoded = jwt.verify(token, signature);

    if (!decoded) throw new AppError("Invalid token", 401);

    const user = await User.findByPk(decoded?.UserInfo?.id);

    if (!user) throw new AppError("Invalid token - user not found", 401);

    if (!user?.isVerified) {
        throw new AppError("Invalid token - user not comfirmed", 401);
    }
    if (await RevokedToken.findOne({ where: { jti: decoded?.UserInfo?.jti } })) {
        throw new AppError("Invalid token - token revoked", 401);
    }
    return { user, decoded }
}