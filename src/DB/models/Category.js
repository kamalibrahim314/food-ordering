import { DataTypes } from "sequelize";
import { sequelize } from "../DBConnection.js";

const Category = sequelize.define("Category", {
    restaurant_id: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
},
    {
        sequelize, modelName: "Category", tableName: "categories", timestamps: true,
    }
);
export default Category;