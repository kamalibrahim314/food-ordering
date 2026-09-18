import Dish from "../../DB/models/Dish.js";
import Cart from "../../DB/models/Cart.js";
import Restaurant from "../../DB/models/Restaurant.js";

export const addToCart = async (req, res) => {
    console.log(req.body);
    const { dish_id, quantity = 1 } = req.body;

    const dish = await Dish.findOne({ where: { id: dish_id } });
    if (!dish) return res.status(404).json({ message: "Dish not found" });

    const unit_price = dish.price;

    let cartItem = await Cart.findOne({ where: { user_id: req.user.id, dish_id } });
    if (cartItem) {
        cartItem.quantity += quantity;
        cartItem.price_at_moment = unit_price * cartItem.quantity;
        await cartItem.save();
    } else {
        cartItem = await Cart.create({ user_id: req.user.id, dish_id, quantity, price_at_moment: unit_price * quantity });
    }

    res.status(200).json({ cartItem, message: "Dish added to cart" });
}

export const updateQuantity = async (req, res) => {
    try {
        const { id } = req.params;
        const { quantity } = req.body;

        let cartItem = await Cart.findOne({
            where: { id, user_id: req.user.id },
            include: [{ model: Dish, as: "dish" }]
        });

        if (!cartItem) return res.status(404).json({ message: "Cart item not found" });

        if (quantity < 1)
            return res.status(400).json({ message: "Quantity must be >= 1" });

        cartItem.quantity = quantity;
        cartItem.price_at_moment = cartItem.dish.price * quantity;

        await cartItem.save();

        res.status(200).json({ cartItem, message: "Cart updated" });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const removeItem = async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await Cart.destroy({
            where: { id, user_id: req.user.id }
        });

        if (!deleted) return res.status(404).json({ message: "Item not found" });

        res.status(200).json({ message: "Item removed from cart" });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};


export const clearCart = async (req, res) => {
    try {
        await Cart.destroy({ where: { user_id: req.user.id } });

        res.status(200).json({ message: "Cart cleared" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const getCart = async (req, res) => {
    try {
        const cart = await Cart.findAll({
            where: { user_id: req.user.id },
            include: [{
                model: Dish, as: "dish", attributes: ["id", "name", "price", "image"],
                include: [{ model: Restaurant, as: "restaurant", attributes: ["name"] }]
            },

            ],
            attributes: ["id", "quantity", "price_at_moment"],
            order: [["createdAt", "DESC"]]
        });

        const total = cart.reduce((sum, item) => sum + Number(item.price_at_moment), 0);

        res.status(200).json({ cart, total });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

export const syncCartPrices = async (req, res) => {
    try {
        const items = await Cart.findAll({
            where: { user_id: req.user.id },
            include: [{ model: Dish, as: "dish" }]
        });

        for (let item of items) {
            item.price_at_moment = item.dish.price * item.quantity;
            await item.save();
        }

        res.status(200).json({ message: "Cart prices synced" });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};



