import Dish from "../../DB/models/Dish.js";
import Restaurant from "../../DB/models/Restaurant.js";
import User, { RoleEnum } from "../../DB/models/User.js";

export const getAllDishes = async (req, res) => {
    const dishes = await Dish.findAll();
    res.status(200).json({ dishes, message: "List of all dishes" });
}

export const addDish = async (req, res) => {
    const { restaurant_id, category_id, name, description, price, is_available } = req.body;
    const image = `${req?.file && req.protocol}://${req.get("host")}/${req.file.path.replace(/\\/g, "/")}`;

    const owner = await Restaurant.findOne({ where: { id: restaurant_id, owner_id: req.user.id } });
    if (!owner) return res.status(400).json({ message: "Invalid owner_id or user is not a restaurant owner" });

    const dish = await Dish.create({ restaurant_id, category_id, image, name, description, price, is_available });
    res.status(201).json({ dish, message: "Dish added successfully" });
}
