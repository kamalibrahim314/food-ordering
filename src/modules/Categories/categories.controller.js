import Category from "../../DB/models/Category.js";
import Dish from "../../DB/models/Dish.js";
import fs from "fs";
import { safeUnlinkUpload, normalizeUploadPath } from "../../utils/imageUrl.js";

export const getAllCategories = async (req, res) => {
    const categories = await Category.findAll({
        attributes: ['id', 'name', 'image'],
    });
    res.status(200).json({ categories, message: "List of all categories" });
}

export const getCategory = async (req, res) => {
    const { id } = req.params;
    const category = await Category.findOne({ where: { id } },);
    if (!category) return res.status(404).json({ message: "Category not found" });

    const dishes = await Dish.findAll({ where: { category_id: id } });
    console.log(dishes);

    res.status(200).json({ category, dishes, message: "Category details" });
}

export const addCategory = async (req, res) => {
    const { name } = req.body;

    const image = req.file ? req.file.path.replace(/\\/g, "/") : (req.body.image ? normalizeUploadPath(req.body.image) : null);

    const category = await Category.create({ name, image });
    res.status(201).json({ category, message: "Category added successfully" });
}

export const updateCategory = async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    let image = req.body.image;

    const category = await Category.findOne({ where: { id } });
    if (!category) return res.status(404).json({ message: "Category not found" });

    if (req.file) {
        if (category.dataValues.image) {
            safeUnlinkUpload(category.dataValues.image);
        }

        image = req.file.path.replace(/\\/g, "/");
    } else if (image !== undefined) {
        image = normalizeUploadPath(image);
    }

    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (image !== undefined) updateData.image = image;

    await category.update(updateData);

    res.status(200).json({ category, message: "Category updated successfully" });
}

export const deleteCategory = async (req, res) => {
    const { id } = req.params;

    const category = await Category.findOne({ where: { id } });
    if (!category) return res.status(404).json({ message: "Category not found" });

    const dishes = await Dish.findAll({ where: { category_id: id } });
    if (dishes.length > 0) return res.status(400).json({ message: "Cannot delete category with dishes" });

    if (category.dataValues.image) {
        safeUnlinkUpload(category.dataValues.image);
    }

    await category.destroy();
    res.status(200).json({ message: "Category deleted successfully" });
}


