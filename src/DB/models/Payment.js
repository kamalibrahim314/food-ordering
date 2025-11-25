import { DataTypes } from "sequelize";
import { sequelize } from "../DBConnection.js";
import { statuses } from "./Order.js";

export const paymentMethods = {
    credit_card: "credit_card",
    paypal: "paypal",
    cash: "cash",
}

const Payment = sequelize.define("Payment", {
    order_id: { type: DataTypes.INTEGER, allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    method: { type: DataTypes.ENUM(...Object.values(paymentMethods)), allowNull: false },
    status: { type: DataTypes.ENUM([statuses.pending, statuses.paid, statuses.failed]), defaultValue: statuses.pending },
    provider_transaction_id: { type: DataTypes.STRING(255), allowNull: true },
},
    {
        sequelize, modelName: "Payment", tableName: "payments", timestamps: true,
    }
);
export default Payment;