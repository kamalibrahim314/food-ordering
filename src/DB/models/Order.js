import { DataTypes } from "sequelize";
import { sequelize } from "../DBConnection.js";

export const statuses = {
    pending: "pending",
    accepted: "accepted",
    preparing: "preparing",
    delivering: "delivering",
    completed: "completed",
    cancelled: "cancelled",
    paid: "paid",
    failed: "failed",
}

export const paymentMethods = {
    cash: "cash",
    card: "card",
    online: "online",
}

const Order = sequelize.define("Order", {
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    restaurant_id: { type: DataTypes.INTEGER, allowNull: false },
    total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    status: { type: DataTypes.ENUM([statuses.pending, statuses.accepted, statuses.preparing, statuses.delivering, statuses.completed, statuses.cancelled]), defaultValue: statuses.pending },
    address: { type: DataTypes.STRING(255), allowNull: false },
    payment_method: { type: DataTypes.ENUM(...Object.values(paymentMethods)), allowNull: false },
},
    {
        sequelize, modelName: "Order", tableName: "orders", timestamps: true,
    }
);
export default Order;