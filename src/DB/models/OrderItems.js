import { DataTypes } from "sequelize";
import { sequelize } from "../DBConnection.js";

const Order_items = sequelize.define("Order_items", {
    order_id: { type: DataTypes.INTEGER, allowNull: false },
    restaurant_id: { type: DataTypes.INTEGER, allowNull: false },
    dish_id: { type: DataTypes.INTEGER, allowNull: false },
    dish_name: { type: DataTypes.STRING(100), allowNull: false },
    dish_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    special_instructions: { type: DataTypes.TEXT, allowNull: true },
    total_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
}, { sequelize, modelName: "Order_items", tableName: "order_items", timestamps: true, });

export default Order_items;