import { DataTypes } from "sequelize";
import { sequelize } from "../DBConnection.js";

const Review = sequelize.define("Review", {
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    dish_id: { type: DataTypes.INTEGER, allowNull: false },
    restaurant_id: { type: DataTypes.INTEGER, allowNull: false },
    rating: { type: DataTypes.INTEGER, allowNull: false },
    comment: { type: DataTypes.TEXT, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, modelName: "Review", tableName: "reviews", timestamps: true, });

export default Review;