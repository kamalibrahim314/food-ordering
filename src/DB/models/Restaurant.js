import { DataTypes } from "sequelize";
import { sequelize } from "../DBConnection.js";

const Restaurant = sequelize.define("Restaurant", {
    owner_id: { type: DataTypes.INTEGER, allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    describetion: { type: DataTypes.TEXT, allowNull: false },
    logo: { type: DataTypes.STRING(255), allowNull: true },
    address: { type: DataTypes.STRING(255), allowNull: false },
    phone_number: { type: DataTypes.STRING(15), allowNull: false },
    open_time: { type: DataTypes.TIME, allowNull: false },
    close_time: { type: DataTypes.TIME, allowNull: false },
    average_rating: { type: DataTypes.FLOAT, defaultValue: 4.0 },
    total_reviews: { type: DataTypes.INTEGER, defaultValue: 4 },
}, { sequelize, modelName: "Restaurant", tableName: "restaurants", timestamps: true, });

export default Restaurant;