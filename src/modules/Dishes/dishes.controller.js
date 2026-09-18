import Category from "../../DB/models/Category.js";
import Dish from "../../DB/models/Dish.js";
import Restaurant from "../../DB/models/Restaurant.js";
import fs from "fs";
import { safeUnlinkUpload, normalizeUploadPath } from "../../utils/imageUrl.js";

export const getAllDishes = async (req, res) => {
    try {
        const dishes = await Dish.findAll(
            {
                attributes: ['id', 'name', 'description', 'price', 'image', 'is_available'],
                include: [
                    { model: Restaurant, as: 'restaurant', attributes: ['name', 'logo'], },
                    { model: Category, as: 'category', attributes: ['name'] },
                ],
            }
        );
        res.status(200).json({ dishes, message: "List of all dishes" });
    }
    catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

export const getPopularDishes = async (req, res) => {
    try {
        const popularDishes = await Dish.findAll({
            attributes: ['id', 'name', 'description', 'price', 'image', 'is_available',
                [sequelize.fn('COUNT', sequelize.col('Cart.dish_id')), 'popularity']
            ],
            include: [
                { model: Restaurant, as: 'restaurant', attributes: ['name', 'logo'] },
                { model: Category, as: 'category', attributes: ['name'] },
                { model: Cart, as: 'Cart', attributes: [] }
            ],
            group: ['Dish.id', 'restaurant.id', 'category.id'],
            order: [[sequelize.literal('popularity'), 'DESC']],
            limit: 10
        });

        return res.status(200).json({
            dishes: popularDishes,
            message: "List of popular dishes"
        });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};


export const getDish = async (req, res) => {
    const { id } = req.params;
    const dish = await Dish.findOne({
        where: { id },
        attributes: ['name', 'description', 'price', 'image', 'is_available'],
        include: [
            { model: Restaurant, as: 'restaurant', attributes: ['name', 'logo'], },
            { model: Category, as: 'category', attributes: ['name'] },
        ],
    });
    if (!dish) return res.status(404).json({ message: "Dish not found" });

    res.status(200).json({ dish, message: "Dish details" });
}

export const addDish = async (req, res) => {
    try {
        const { restaurant_id, category_id, name, description, price, is_available } = req.body;
        const image = req.file ? req.file.path.replace(/\\/g, "/") : (req.body.image ? normalizeUploadPath(req.body.image) : null);

        const category = await Category.findOne({ where: { id: category_id } });
        if (!category) return res.status(404).json({ message: "Category not found" });

        const restaurant = await Restaurant.findOne({ where: { id: restaurant_id } });
        if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

        const owner = await Restaurant.findOne({ where: { id: restaurant_id, owner_id: req.user.id } });
        if (!owner) return res.status(400).json({ message: "Invalid owner_id or user is not a restaurant owner" });

        const dish = await Dish.create({ restaurant_id, category_id, image, name, description, price, is_available });
        res.status(201).json({ dish, message: "Dish added successfully" });
    }
    catch (err) {
        return res.status(500).json({ message: err.message });
    }
}

export const updateDish = async (req, res) => {
    const { id } = req.params;
    const { category_id, name, description, price, is_available } = req.body;

    const dish = await Dish.findOne({ where: { id } });
    if (!dish) return res.status(404).json({ message: "Dish not found" });

    const owner = await Restaurant.findOne({ where: { id: dish.restaurant_id, owner_id: req.user.id } });
    if (!owner) return res.status(400).json({ message: "Invalid owner_id or user is not a restaurant owner" });

    let image;
    if (req.file) {
        if (dish.dataValues.image) {
            safeUnlinkUpload(dish.dataValues.image);
        }
        image = req.file.path.replace(/\\/g, "/");
    } else if (req.body.image !== undefined) {
        image = normalizeUploadPath(req.body.image);
    }

    const updateData = {};
    if (category_id) {
        const category = await Category.findOne({ where: { id: category_id } });
        if (!category) return res.status(404).json({ message: "Category not found" });
        updateData.category_id = category_id;
    };
    if (image !== undefined) updateData.image = image;
    if (name) updateData.name = name;
    if (description) updateData.description = description;
    if (price) updateData.price = price;
    if (is_available) updateData.is_available = is_available;

    await dish.update(updateData);

    res.status(200).json({ dish, message: "Dish updated successfully" });
}

export const deleteDish = async (req, res) => {
    const { id } = req.params;

    const dish = await Dish.findOne({ where: { id } });
    if (!dish) return res.status(404).json({ message: "Dish not found" });

    const owner = await Restaurant.findOne({ where: { id: dish.restaurant_id, owner_id: req.user.id } });
    if (!owner) return res.status(400).json({ message: "Invalid owner_id or user is not a restaurant owner" });

    if (dish.dataValues.image) {
        safeUnlinkUpload(dish.dataValues.image);
    }

    await dish.destroy();
    res.status(200).json({ message: "Dish deleted successfully" });
}
