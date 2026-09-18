import { compare, hash } from "bcrypt";
import jwt from "jsonwebtoken";
import { Op } from "sequelize";
import crypto from "crypto";

import { generateTokens, setRefreshTokenCookie } from "../../utils/token.js";

import RevokedToken from "../../DB/models/RevokedToken.js";
import User from "../../DB/models/User.js";

import { AppError } from "../../utils/appError.js";
import { eventEmitter } from "../../utils/eivnt.js";

export const register = async (req, res) => {
    try {
        let { name, email, phone_number, password } = req.body;

        let userExists = await User.findOne({ where: { email } });

        if (userExists && userExists.isVerified) return res.status(400).json({ success: false, message: 'this email is already registered' });

        if (!userExists) {
            const hashedPassword = await hash(password, 12);
            await User.create({ name, email, phone_number, password: hashedPassword });
        }

        if (userExists && !userExists.isVerified) {
            const hashedPassword = await hash(password, 12);
            await User.update({ name, email, phone_number, password: hashedPassword }, { where: { email } });
        }

        userExists = await User.findOne({ where: { email } });

        const { otp, otpSessionToken } = userExists.generateOTP();
        eventEmitter.emit('userCreated', { email, otp });

        await userExists.save();

        return res.status(200).json({
            success: true,
            otpSessionToken,
            message: 'user registered successfully, please verify your email',
        });

    } catch (error) {
        throw new AppError(error.message || 'something went wrong', 500);
    }
}

export const verifyOtp = async (req, res) => {
    try {
        const { email, otp, otpSessionToken } = req.body;
        const user = await User.findOne({ where: { email, otpSessionToken, otpSessionExpires: { [Op.gt]: new Date() }, isVerified: false } });

        if (!user) return res.status(400).json({ success: false, message: 'invalid credentials' });

        const isValidOtp = await user.verifyOTP(otp);
        if (!isValidOtp) return res.status(400).json({ success: false, message: 'invalid credentials' });

        user.isVerified = true;
        await user.save();

        const { accessToken, refreshToken } = generateTokens(user);
        setRefreshTokenCookie(res, refreshToken);

        return res.status(200).json({ success: true, accessToken, message: 'success in verifying otp' });
    } catch (error) {
        throw new AppError(error.message, 500);
    }
}

export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.scope("withPassword").findOne({ where: { email, isVerified: true } });
        if (!user) return res.status(400).json({ success: false, message: 'invalid credentials' });

        const isPasswordCorrect = await compare(password, user.password);
        if (!isPasswordCorrect) return res.status(400).json({ success: false, message: 'invalid credentials' });

        const { accessToken, refreshToken } = generateTokens(user);
        setRefreshTokenCookie(res, refreshToken);

        return res.status(200).json({ success: true, user, accessToken, role: user.role, message: 'success in login' });
    } catch (error) {
        console.log('login Error', error);
        throw new AppError(error.message, 500);
    }
}

export const logout = async (req, res) => {
    try {
        const refreshToken = req?.cookies?.jwt;
        if (!refreshToken) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

        if (!decoded?.UserInfo?.jti) {
            return res.status(400).json({ message: "Invalid token payload" });
        }

        await RevokedToken.create({ jti: decoded?.UserInfo?.jti, expiresAt: new Date(decoded.exp * 1000), });

        res.clearCookie("jwt", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "None" : "Lax",
        });

        return res.status(200).json({ success: true, message: 'success in logout' });
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ message: "Refresh token expired" });
        }
        return res.status(401).json({ message: "Invalid token" });
    }
}

export const refresh = async (req, res) => {
    try {
        const refreshToken = req?.cookies?.jwt;
        if (!refreshToken) return res.status(401).json({ message: "Unauthorized" });

        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

        const user = await User.findByPk(decoded.UserInfo.id);
        if (!user) return res.status(401).json({ message: "Unauthorized" });

        const revoked = await RevokedToken.findOne({ where: { jti: decoded.UserInfo.jti } });
        if (revoked) return res.status(401).json({ message: "Unauthorized" });

        await RevokedToken.create({ jti: decoded?.UserInfo?.jti, expiresAt: new Date(decoded.exp * 1000) });

        const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);
        setRefreshTokenCookie(res, newRefreshToken);

        return res.status(200).json({ accessToken, message: 'success in refresh' });
    } catch (err) {
        if (err.name === 'TokenExpiredError') throw new AppError('Refresh token expired', 401);
        if (err.name !== 'SequelizeUniqueConstraintError') throw new AppError(err.message, 500);
        throw new AppError(err.message, 500);
    }
}

export const forgotPassword = async (req, res) => {
    try {
        let { email } = req.body;
        const user = await User.findOne({ where: { email, isVerified: true } });
        if (!user) return res.status(200).json({ message: 'If this number is registered, you will receive an OTP shortly.' });

        const { otp, otpSessionToken } = user.generateOTP();
        eventEmitter.emit('forgotPassword', { email, otp });

        await user.save();

        return res.status(200).json({
            success: true,
            otpSessionToken,
            message: 'If this number is registered, you will receive an OTP shortly.',
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: 'Password reset failed' });
    }
};

export const verifyResetCode = async (req, res) => {
    try {
        let { email, otp, otpSessionToken } = req.body;

        const user = await User.findOne({ where: { email, otpSessionToken, otpSessionExpires: { [Op.gt]: new Date() }, isVerified: true } });
        if (!user) return res.status(400).json({ res, message: "Invalid or expired reset request" });

        const isValidOtp = await user.verifyOTP(otp);
        if (!isValidOtp) return res.status(400).json({ res, message: "Invalid OTP or OTP has expired" });

        const newSessionToken = crypto.randomBytes(32).toString('hex');
        user.otpSessionToken = newSessionToken;
        user.otpSessionExpires = Date.now() + 5 * 60 * 1000;
        await user.save();

        return res.status(200).json({ otpSessionToken: newSessionToken, message: 'OTP verified successfully. You can now reset your password' });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'OTP verification failed' });
    }
};

export const resetPassword = async (req, res) => {
    try {
        let { email, newPassword, otpSessionToken } = req.body;

        const user = await User.scope("withPassword").findOne({ where: { email, otpSessionToken, otpSessionExpires: { [Op.gt]: new Date() }, isVerified: true } });

        if (!user) return res.status(400).json({ message: "Invalid or expired reset request" });

        const hashedPassword = await hash(newPassword, 12);

        user.password = hashedPassword;
        user.otpSessionToken = null;
        user.otpSessionExpires = null;
        await user.save();

        return res.status(200).json({ message: 'Password reset successfully' });

    } catch (error) {
        return res.status(500).json({ message: 'Password reset failed' });
    }
};

