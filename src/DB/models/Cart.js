import { DataTypes } from "sequelize";
import { sequelize } from "../DBConnection.js";

const Cart = sequelize.define("Cart", {
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    dish_id: { type: DataTypes.INTEGER, allowNull: false },
    quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    price_at_moment: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
},
    {
        sequelize, modelName: "Cart", tableName: "carts", timestamps: true,
    }
);
export default Cart;