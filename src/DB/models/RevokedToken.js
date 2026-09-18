import { DataTypes } from "sequelize";
import { sequelize } from "../DBConnection.js";

const RevokedToken = sequelize.define("RevokedToken", {
    jti: { type: DataTypes.STRING, allowNull: false, unique: true, },
    expiresAt: { type: DataTypes.DATE, allowNull: false, },
}, { tableName: "revoked_tokens", timestamps: true, indexes: [{ fields: ["expiresAt"], },], });

export default RevokedToken;