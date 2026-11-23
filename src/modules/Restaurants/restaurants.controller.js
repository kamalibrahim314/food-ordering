import Category from "../../DB/models/Category.js";
import Dish from "../../DB/models/Dish.js";
import Restaurant from "../../DB/models/Restaurant.js";
import User, { RoleEnum } from "../../DB/models/User.js";
import { safeUnlinkUpload, normalizeUploadPath } from "../../utils/imageUrl.js";
import { uploadStreamToCloudinary } from "../../utils/cloudinary.js";

export const getAllRestaurants = async (req, res) => {
    try {
        const restaurants = await Restaurant.findAll();
        res.status(200).json({ restaurants, message: "List of all restaurants" });
    } catch (err) {
        res.status(500).json({ message: err.message || "Failed to get restaurants" });
    }
}

export const getRestaurant = async (req, res) => {
    try {
        const { id } = req.params;

        const restaurant = await Restaurant.findOne({ where: { id } });
        if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

        const dishes = await Dish.findAll({ where: { restaurant_id: id } },
            {
                attributes: ['name', 'description', 'price', 'image', 'is_available'],
                include: [
                    { model: Restaurant, as: 'restaurant', attributes: ['name', 'logo'] },
                    { model: Category, as: 'category', attributes: ['name'] },
                ],
            }
        );

        res.status(200).json({ restaurant, dishes, message: "Restaurant details" });
    } catch (err) {
        res.status(500).json({ message: err.message || "Failed to get restaurant" });
    }
}

export const addRestaurant = async (req, res) => {
    try {
        const { owner_id, name, describetion, address, phone_number, open_time, close_time } = req.body;

        const owner = await User.findOne({ where: { id: owner_id, role: RoleEnum.RESTAURANT } });
        if (!owner) return res.status(400).json({ message: "Invalid owner_id or user is not a restaurant owner" });

        const existingRestaurant = await Restaurant.findOne({ where: { owner_id } });
        if (existingRestaurant) return res.status(400).json({ message: "Restaurant already exists for this owner" });

        let logo = null;
        if (req.file) {
            const uploadResult = await uploadStreamToCloudinary(req.file.buffer, { folder: "restaurants" });
            logo = uploadResult.secure_url;
        } else if (req.body.logo || req.body.image_url || req.body.image) {
            logo = normalizeUploadPath(req.body.logo || req.body.image_url || req.body.image);
        }

        const restaurant = await Restaurant.create({ owner_id, name, describetion, logo, address, phone_number, open_time, close_time });
        res.status(201).json({ restaurant, message: "Restaurant added successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message || "Failed to add restaurant" });
    }
}

export const updateRestaurant = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, describetion, address, phone_number, open_time, close_time } = req.body;

        const restaurant = await Restaurant.findOne({ where: { id } });
        if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

        const owner = await User.findOne({ where: { id: restaurant.owner_id, role: RoleEnum.RESTAURANT } });
        if (!owner) return res.status(400).json({ message: "Invalid owner_id or user is not a restaurant owner" });

        let image;
        if (req.file) {
            if (restaurant.dataValues.logo) {
                await safeUnlinkUpload(restaurant.dataValues.logo);
            }
            const uploadResult = await uploadStreamToCloudinary(req.file.buffer, { folder: "restaurants" });
            image = uploadResult.secure_url;
        } else if (req.body.logo !== undefined || req.body.image_url !== undefined || req.body.image !== undefined) {
            image = normalizeUploadPath(req.body.logo ?? req.body.image_url ?? req.body.image);
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
    } catch (err) {
        res.status(500).json({ message: err.message || "Failed to update restaurant" });
    }
};

export const deleteRestaurant = async (req, res) => {
    try {
        const { id } = req.params;

        const restaurant = await Restaurant.findOne({ where: { id } });
        if (!restaurant) return res.status(404).json({ message: "Restaurant not found" });

        const owner = await User.findOne({ where: { id: restaurant.owner_id, role: RoleEnum.RESTAURANT } });
        if (!owner) return res.status(400).json({ message: "Invalid owner_id or user is not a restaurant owner" });

        if (restaurant.dataValues.logo) {
            await safeUnlinkUpload(restaurant.dataValues.logo);
        }

        await restaurant.destroy();
        res.status(200).json({ message: "Restaurant deleted successfully" });
    } catch (err) {
        res.status(500).json({ message: err.message || "Failed to delete restaurant" });
    }
}

export const getMyRestaurant = async (req, res) => {
    try {
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
    } catch (err) {
        res.status(500).json({ message: err.message || "Failed to get my restaurant" });
    }
}
