import Joi from "joi";

export const signUpSchema = {
    body: Joi.object({
        name: Joi.string().pattern(/^[a-zA-Z0-9ء-ي\s]{3,50}$/).trim().min(3).max(50),
        email: Joi.string().email(),
        phone_number: Joi.string().pattern(/^01[0125][0-9]{8}$/),
        password: Joi.string().pattern(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&#^]{8,}$/),
    }).required(),
};

export const verifyOtpSchema = {
    body: Joi.object({
        email: Joi.string().email(),
        otp: Joi.string().pattern(/^[0-9]{6}$/),
        otpSessionToken: Joi.string().pattern(/^[0-9a-fA-F]{64}$/),
    }).required(),
};

export const signInSchema = {
    body: Joi.object({
        email: Joi.string().email(),
        password: Joi.string().pattern(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&#^]{8,}$/),
    }).required(),
};

export const forgetPasswordSchema = {
    body: Joi.object({
        email: Joi.string().email(),
    }).required(),
}

export const verifyResetCodeSchema = {
    body: Joi.object({
        email: Joi.string().email(),
        otp: Joi.string().pattern(/^[0-9]{6}$/),
        otpSessionToken: Joi.string().pattern(/^[0-9a-fA-F]{64}$/),
    }).required(),
}

export const resetPasswordSchema = {
    body: Joi.object({
        email: Joi.string().email(),
        newPassword: Joi.string().pattern(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*?&#^]{8,}$/),
        otpSessionToken: Joi.string().pattern(/^[0-9a-fA-F]{64}$/),
    }).required(),
}

