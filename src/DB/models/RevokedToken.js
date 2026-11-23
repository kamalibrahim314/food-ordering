import { DataTypes } from "sequelize";
import { sequelize } from "../DBConnection.js";

const RevokedToken = sequelize.define("RevokedToken", {
    jti: { type: DataTypes.STRING, allowNull: false, unique: true, },
    expiresAt: { type: DataTypes.DATE, allowNull: false, },
}, {
    sequelize,
    modelName: "RevokedToken",
    tableName: "revoked_tokens",
    freezeTableName: true,
    timestamps: true,
    indexes: [{ fields: ["expiresAt"] }],
});

export default RevokedToken;