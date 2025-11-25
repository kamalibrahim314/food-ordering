import Restaurant from "../../DB/models/Restaurant.js";
import User, { RoleEnum } from "../../DB/models/User.js";

export const addRestaurant = async (req, res) => {
    const { owner_id, name, describetion, address, phone_number, open_time, close_time } = req.body;

    const owner = await User.findOne({ where: { id: owner_id, role: RoleEnum.RESTAURANT_OWNER } });
    if (!owner) return res.status(400).json({ message: "Invalid owner_id or user is not a restaurant owner" });

    const logo = `${req?.file && req.protocol}://${req.get("host")}/${req.file.path.replace(/\\/g, "/")}`;

    const restaurant = await Restaurant.create({ owner_id, name, describetion, logo, address, phone_number, open_time, close_time });
    res.status(201).json({ restaurant, message: "Restaurant added successfully" });
}

export const getAllRestaurants = async (req, res) => {
    const restaurants = Restaurant.findAll();
    res.status(200).json({ restaurants, message: "List of all restaurants" });
}

