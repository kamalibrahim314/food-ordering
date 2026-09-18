import { DataTypes } from "sequelize";
import { sequelize } from "../DBConnection.js";

const Category = sequelize.define("Category", {
    name: { type: DataTypes.STRING(100), allowNull: false },
    image: { type: DataTypes.STRING(255), allowNull: true },
}, { sequelize, modelName: "Category", tableName: "categories", timestamps: true, });

export default Category;