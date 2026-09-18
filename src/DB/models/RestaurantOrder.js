import { DataTypes } from "sequelize";
import { sequelize } from "../DBConnection.js";
import { statuses } from "./Order.js";

const RestaurantOrder = sequelize.define("RestaurantOrder", {
    order_id: { type: DataTypes.INTEGER, allowNull: false },
    restaurant_id: { type: DataTypes.INTEGER, allowNull: false },
    status: { type: DataTypes.ENUM(Object.values(statuses)), defaultValue: statuses.pending },
    total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
}, { sequelize, modelName: "RestaurantOrder", tableName: "restaurantOrders", timestamps: true, });

export default RestaurantOrder;