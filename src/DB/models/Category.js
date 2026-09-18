import { DataTypes } from "sequelize";
import { sequelize } from "../DBConnection.js";
import { formatImageUrl, normalizeUploadPath } from "../../utils/imageUrl.js";

const Category = sequelize.define("Category", {
    name: { type: DataTypes.STRING(100), allowNull: false },
    image: {
        type: DataTypes.STRING(255),
        allowNull: true,
        get() {
            const rawValue = this.getDataValue("image");
            return formatImageUrl(rawValue);
        },
        set(val) {
            this.setDataValue("image", normalizeUploadPath(val));
        }
    },
}, { sequelize, modelName: "Category", tableName: "categories", timestamps: true, });

export default Category;