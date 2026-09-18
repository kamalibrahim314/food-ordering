import dotenv from "dotenv";
dotenv.config();

import mysql2 from "mysql2";
import { Sequelize } from "sequelize";

export const sequelize = new Sequelize(
    process.env.MYSQL_DATABASE,
    process.env.MYSQL_USER,
    process.env.MYSQL_PASSWORD,
    {
        host: process.env.MYSQL_HOST,
        port: Number(process.env.MYSQL_PORT) || 3306,
        dialect: "mysql",
        dialectModule: mysql2,
        logging: false,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000,
        },
        dialectOptions: (process.env.MYSQL_SSL === "true" || (process.env.NODE_ENV === "production" && process.env.MYSQL_HOST !== "localhost")) ? {
            ssl: {
                require: true,
                rejectUnauthorized: false,
            }
        } : {},
    }
);

export const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Connection has been established successfully.');
    } catch (error) {
        console.error('❌ Unable to connect to the database:', error.message || error);
        throw error;
    }
};

export const syncDB = async () => {
    try {
        await sequelize.sync({ alter: false });
        console.log("✅ All models synced successfully.");
    } catch (error) {
        console.error("❌ Error syncing database:", error.message || error);
    }
};
