import { DataTypes } from "sequelize";
import { sequelize } from "../DBConnection.js";

const Dish = sequelize.define("Dish", {
    restaurant_id: { type: DataTypes.INTEGER, allowNull: false },
    category_id: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: false },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    image: { type: DataTypes.STRING(255), allowNull: true },
    is_available: { type: DataTypes.BOOLEAN, defaultValue: true },
    average_rating: { type: DataTypes.FLOAT, defaultValue: 4.0 },
    total_reviews: { type: DataTypes.INTEGER, defaultValue: 4 },
}, { sequelize, modelName: "Dish", tableName: "dishes", timestamps: true, });

export default Dish;