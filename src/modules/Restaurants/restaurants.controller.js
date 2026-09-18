import Category from "../../DB/models/Category.js";
import Dish from "../../DB/models/Dish.js";
import Restaurant from "../../DB/models/Restaurant.js";
import User, { RoleEnum } from "../../DB/models/User.js";
import fs from "fs";


export const getAllRestaurants = async (req, res) => {
    const restaurants = await Restaurant.findAll();
    res.status(200).json({ restaurants, message: "List of all restaurants" });
}

export const getRestaurant = async (req, res) => {
    const { id } = req.params;

    const restaurant = await Restaurant.findOne({ where: { id } });
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

    const dishes = await Dish.findAll({ where: { restaurant_id: id } },
        {
            attributes: ['name', 'description', 'price', 'image', 'is_available'],
            include: [
                { model: Restaurant, as: 'restaurant', attributes: ['name', 'logo'], },
                { model: Category, as: 'category', attributes: ['name'] },
            ],
        }
    );

    res.status(200).json({ restaurant, dishes, message: "Restaurant details" });
}

export const addRestaurant = async (req, res) => {
    const { owner_id, name, describetion, address, phone_number, open_time, close_time } = req.body;

    const owner = await User.findOne({ where: { id: owner_id, role: RoleEnum.RESTAURANT } });
    if (!owner) return res.status(400).json({ message: "Invalid owner_id or user is not a restaurant owner" });

    const existingRestaurant = await Restaurant.findOne({ where: { owner_id } });
    if (existingRestaurant) return res.status(400).json({ message: "Restaurant already exists for this owner" });

    const logo = `${req?.file && req.protocol}://${req.get("host")}/${req.file.path.replace(/\\/g, "/")}`;

    const restaurant = await Restaurant.create({ owner_id, name, describetion, logo, address, phone_number, open_time, close_time });
    res.status(201).json({ restaurant, message: "Restaurant added successfully" });
}

export const updateRestaurant = async (req, res) => {
    const { id } = req.params;
    const { name, describetion, address, phone_number, open_time, close_time } = req.body;

    const restaurant = await Restaurant.findOne({ where: { id } });
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

    const owner = await User.findOne({ where: { id: restaurant.owner_id, role: RoleEnum.RESTAURANT } });
    if (!owner) return res.status(400).json({ message: "Invalid owner_id or user is not a restaurant owner" });

    let image;

    if (req.file) {
        if (restaurant.dataValues.logo) {
            const relativePath = restaurant.logo
                .replace(`${req.protocol}://${req.get("host")}/`, '')
                .replace(/\//g, '\\');

            if (fs.existsSync(relativePath)) fs.unlinkSync(relativePath);
        }

        image = `${req.protocol}://${req.get("host")}/${req.file.path.replace(/\\/g, "/")}`;
    }

    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (describetion !== undefined) updateData.describetion = describetion;
    if (address !== undefined) updateData.address = address;
    if (phone_number !== undefined) updateData.phone_number = phone_number;
    if (open_time !== undefined) updateData.open_time = open_time;
    if (close_time !== undefined) updateData.close_time = close_time;
    if (image !== undefined) updateData.logo = image;

    await restaurant.update(updateData);

    res.status(200).json({ restaurant, message: "Restaurant updated successfully" });
};


export const deleteRestaurant = async (req, res) => {
    const { id } = req.params;

    const restaurant = await Restaurant.findOne({ where: { id } });
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

    const owner = await User.findOne({ where: { id: restaurant.owner_id, role: RoleEnum.RESTAURANT } });
    if (!owner) return res.status(400).json({ message: "Invalid owner_id or user is not a restaurant owner" });

    if (restaurant.dataValues.logo) {
        const imagePath = restaurant.logo.replace(`${req.protocol}://${req.get("host")}/`, '').replace(/\//g, '\\');
        if (fs.existsSync(imagePath)) fs.unlinkSync(imagePath);
    }

    await restaurant.destroy();
    res.status(200).json({ message: "Restaurant deleted successfully" });
}

export const getMyRestaurant = async (req, res) => {
    const restaurant = await Restaurant.findOne({ where: { owner_id: req.user.id } });
    if (!restaurant) return res.status(404).json({ message: "Restaurant not found for this user" });

    const dishes = await Dish.findAll({ where: { restaurant_id: restaurant.id } },
        {
            attributes: ['id', 'name', 'description', 'price', 'image', 'is_available'],
            include: [
                { model: Category, as: 'category', attributes: ['name'] },
            ],
        }
    );
    res.status(200).json({ restaurant, dishes, message: "My restaurant details" });
}
