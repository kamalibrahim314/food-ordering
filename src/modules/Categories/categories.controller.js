import Category from "../../DB/models/Category.js";
import Restaurant from "../../DB/models/Restaurant.js";


export const getAllCategories = async (req, res) => {
    const categories = await Category.findAll();
    res.status(200).json({ categories, message: "List of all categories" });
}

export const addCategory = async (req, res) => {
    const { name, restaurant_id } = req.body;

    const owner = await Restaurant.findOne({ where: { id: restaurant_id, owner_id: req.user.id } });
    if (!owner) return res.status(400).json({ message: "Invalid owner_id or user is not a restaurant owner" });

    const category = await Category.create({ name, restaurant_id });
    res.status(201).json({ category, message: "Category added successfully" });
}


