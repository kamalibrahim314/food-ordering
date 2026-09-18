import { DataTypes } from "sequelize";
import crypto from "crypto";
import { sequelize } from "../DBConnection.js";
import { AppError } from "../../utils/appError.js";

export const RoleEnum = {
  CUSTOMER: "customer",
  RESTAURANT: "restaurant",
  ADMIN: "admin",
};

const User = sequelize.define("User", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false, validate: { len: [3, 100] }, },
  email: { type: DataTypes.STRING, allowNull: false, unique: true, validate: { isEmail: true, notEmpty: true }, },
  phone_number: { type: DataTypes.STRING(11), allowNull: false, validate: { is: /^01[0125][0-9]{8}$/ }, },
  password: { type: DataTypes.STRING(255), allowNull: false },
  role: { type: DataTypes.ENUM(...Object.values(RoleEnum)), defaultValue: RoleEnum.CUSTOMER },
  isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
  profile_image: { type: DataTypes.STRING(500), defaultValue: "" },

  otp: { type: DataTypes.STRING(6), allowNull: true },
  otpExpiresAt: { type: DataTypes.DATE, allowNull: true },
  otpSessionToken: { type: DataTypes.STRING, allowNull: true },
  otpSessionExpires: { type: DataTypes.DATE, allowNull: true },
  otpAttempts: { type: DataTypes.INTEGER, defaultValue: 0 },
  otpBlockedUntil: { type: DataTypes.DATE, allowNull: true },

}, {
  sequelize, modelName: "User", tableName: "users", timestamps: true, defaultScope: { attributes: { exclude: ["password"] }, },
  scopes: { withPassword: { attributes: { include: ["password"] } }, },
});

// === Generate OTP ===
User.prototype.generateOTP = function () {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  this.otp = otp;
  this.otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);
  const otpSessionToken = crypto.randomBytes(32).toString("hex");
  this.otpSessionToken = otpSessionToken;
  this.otpSessionExpires = new Date(Date.now() + 5 * 60 * 1000);

  return { otp, otpSessionToken };
};

User.safeCompare = function (a, b) {
  const sa = String(a || "");
  const sb = String(b || "");

  const len = Math.max(Buffer.byteLength(sa), Buffer.byteLength(sb));
  const bufA = Buffer.alloc(len, 0);
  const bufB = Buffer.alloc(len, 0);

  Buffer.from(sa).copy(bufA);
  Buffer.from(sb).copy(bufB);

  return crypto.timingSafeEqual(bufA, bufB);
};

User.prototype.verifyOTP = function (inputOtp) {
  const MAX_ATTEMPTS = 5;
  const BLOCK_DURATION = 10 * 60 * 1000;

  if (this.otpBlockedUntil && this.otpBlockedUntil > Date.now()) {
    throw new AppError('too many incorrect attempts. OTP verification is temporarily blocked.', 429);
  }

  if (this.otpExpiresAt && this.otpExpiresAt < Date.now()) {
    this.otp = null;
    this.otpExpiresAt = null;
    this.otpAttempts = 0;
    this.otpBlockedUntil = null;
    throw new AppError("the OTP has expired. please request a new one.");
  }

  const isValid = User.safeCompare(this.otp, inputOtp);

  if (isValid) {
    this.otp = null;
    this.otpExpiresAt = null;
    this.otpAttempts = 0;
    this.otpBlockedUntil = null;
    return true;
  } else {
    this.otpAttempts = (this.otpAttempts || 0) + 1;

    if (this.otpAttempts >= MAX_ATTEMPTS) {
      this.otpBlockedUntil = new Date(Date.now() + BLOCK_DURATION);
      this.otpAttempts = 0;
      throw new AppError('too many incorrect attempts. OTP verification is temporarily blocked.', 429);
    }

    throw new AppError("invalid OTP. please try again.");
  }
};

export default User;

