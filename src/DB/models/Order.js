import { DataTypes } from "sequelize";
import { sequelize } from "../DBConnection.js";

export const statuses = {
    pending: "pending",
    accepted: "accepted",
    preparing: "preparing",
    on_the_way: "on_the_way",
    delivered: "delivered",
    cancelled: "cancelled"
}

const Order = sequelize.define("Order", {
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    status: { type: DataTypes.ENUM(Object.values(statuses)), defaultValue: statuses.pending },
    address: { type: DataTypes.STRING(255), allowNull: false },
    special_instructions: { type: DataTypes.TEXT, allowNull: true },

}, { sequelize, modelName: "Order", tableName: "orders", timestamps: true, });

export default Order;

