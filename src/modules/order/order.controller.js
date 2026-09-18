// controllers/order.controller.js
import Cart from "../../DB/models/Cart.js";
import Dish from "../../DB/models/Dish.js";
import Order from "../../DB/models/Order.js";
import OrderItems from "../../DB/models/OrderItems.js";
import { statuses } from "../../DB/models/Order.js";
import RestaurantOrder from "../../DB/models/RestaurantOrder.js";
import Restaurant from "../../DB/models/Restaurant.js";
import { AppError } from "../../utils/appError.js";

export const createOrder = async (req, res, next) => {
    const userId = req.user.id;
    const { address, special_instructions } = req.body;

    try {
        const cartItems = await Cart.findAll({
            where: { user_id: userId },
            include: [{ model: Dish, as: "dish" }]
        });

        if (!cartItems.length) return res.status(400).json({ message: "Cart is empty" });

        const itemsByRestaurant = {};
        let totalAmount = 0;

        for (const item of cartItems) {
            const restId = item.dish.restaurant_id;
            if (!itemsByRestaurant[restId]) itemsByRestaurant[restId] = [];

            const itemTotal = Number(item.price_at_moment);
            totalAmount += itemTotal;

            itemsByRestaurant[restId].push({
                dish_id: item.dish.id,
                dish_name: item.dish.name,
                dish_price: item.dish.price,
                quantity: item.quantity,
                total_price: itemTotal,
            });
        }

        const order = await Order.create({
            user_id: userId,
            total_amount: totalAmount,
            address: JSON.stringify(address),
            special_instructions,
        });

        for (const restaurantId in itemsByRestaurant) {
            const restaurantTotal = itemsByRestaurant[restaurantId]
                .reduce((sum, item) => sum + item.total_price, 0);

            const restaurantOrder = await RestaurantOrder.create({
                order_id: order.id,
                restaurant_id: restaurantId,
                total_amount: restaurantTotal,
                status: statuses.pending
            });

            for (const item of itemsByRestaurant[restaurantId]) {
                await OrderItems.create({
                    ...item,
                    order_id: order.id,
                    restaurant_id: restaurantId,
                });
            }

            req.io?.to(`restaurant_${restaurantId}`)?.emit("new_order", {
                order_id: order.id,
                restaurant_order_id: restaurantOrder.id,
                items: itemsByRestaurant[restaurantId],
                user_id: userId,
                address: address,
                total_amount: restaurantTotal,
                timestamp: new Date().toISOString()
            });
        }

        await Cart.destroy({ where: { user_id: req.user.id } });

        req.io?.to(`user_${userId}`)?.emit("order_created_success", {
            order_id: order.id,
            total_amount: totalAmount,
            restaurants_count: Object.keys(itemsByRestaurant).length
        });

        res.status(201).json({
            message: "Order created successfully",
            order,
            restaurant_orders: Object.keys(itemsByRestaurant).length
        });

    } catch (error) {
        next(error);
    }
};

export const acceptOrder = async (req, res, next) => {
    const ownerId = req.user.id;
    const restaurant = await Restaurant.findOne({
        where: { owner_id: ownerId },
        attributes: ['id', 'name']
    });
    const { id: restaurantId } = restaurant;
    if (!restaurantId) return res.status(403).json({ message: "Unauthorized: No restaurant found for this owner" });

    const { id: restaurantOrderId } = req.params;

    try {
        const restaurantOrder = await RestaurantOrder.findOne({
            where: { id: restaurantOrderId, restaurant_id: restaurantId },
            include: [{ model: Order, as: "main_order" }, { model: Restaurant, as: "restaurant_details" }]
        });

        if (!restaurantOrder) return res.status(404).json({ message: "Order not found" });

        if (restaurantOrder.main_order.status === statuses.cancelled) return res.status(400).json({ message: "Cannot accept a cancelled order" });

        await restaurantOrder.update({ status: statuses.accepted });

        req.io?.to(`order_${restaurantOrder.order_id}`)?.emit("restaurant_accepted", {
            order_id: restaurantOrder.order_id,
            restaurant_order_id: restaurantOrderId,
            restaurant_id: restaurantId,
            restaurant_name: restaurantOrder.restaurant_details?.name,
            status: 'accepted',
            accepted_at: new Date().toISOString()
        });

        const allRestaurantOrders = await RestaurantOrder.findAll({
            where: { order_id: restaurantOrder.order_id }
        });

        const allAccepted = allRestaurantOrders.every(ro => ro.status !== 'pending');

        if (allAccepted) {
            await Order.update({ status: 'accepted' }, { where: { id: restaurantOrder.order_id } });

            req.io?.to(`order_${restaurantOrder.order_id}`)?.emit("order_accepted", {
                order_id: restaurantOrder.order_id,
                status: 'accepted',
                message: "All restaurants have accepted the order"
            });
        }

        res.json({
            message: "Order accepted successfully",
            restaurant_order: restaurantOrder
        });

    } catch (error) {
        next(error);
    }
};

export const updateRestaurantOrderStatus = async (req, res, next) => {
    try {
        const { id: restaurant_order_id } = req.params;
        const { status } = req.body;
        const ownerId = req.user.id;
        const restaurant = await Restaurant.findOne({
            where: { owner_id: ownerId },
            attributes: ['id', 'name']
        });
        const { id: restaurantId } = restaurant;
        if (!restaurantId) return res.status(403).json({ message: "Unauthorized: No restaurant found for this owner" });

        const allowedStatuses = [statuses.preparing, statuses.on_the_way, statuses.delivered];
        if (!allowedStatuses.includes(status)) return res.status(400).json({ message: "Invalid status" });

        const restaurantOrder = await RestaurantOrder.findOne({
            where: { id: restaurant_order_id, restaurant_id: restaurantId },
            include: [{ model: Restaurant, as: "restaurant_details" }]
        });

        if (!restaurantOrder) return res.status(404).json({ message: "Order not found" });

        if (restaurantOrder.main_order.status === statuses.cancelled) return res.status(400).json({ message: "Cannot update status of a cancelled order" });


        const statusFlow = [statuses.pending, statuses.accepted, statuses.preparing, statuses.on_the_way, statuses.delivered];
        const currentIndex = statusFlow.indexOf(restaurantOrder.status);
        const newIndex = statusFlow.indexOf(status);

        if (newIndex <= currentIndex) return res.status(400).json({ message: "Invalid status update" });

        await restaurantOrder.update({ status });

        req.io?.to(`order_${restaurantOrder.order_id}`)?.emit("order_status_update", {
            order_id: restaurantOrder.order_id,
            restaurant_order_id: restaurantOrder.id,
            restaurant_id: restaurantId,
            restaurant_name: restaurantOrder.restaurant_details?.name,
            status: status,
            timestamp: new Date().toISOString()
        });

        const allRestaurantOrders = await RestaurantOrder.findAll({
            where: { order_id: restaurantOrder.order_id }
        });

        const allAtSameStatus = allRestaurantOrders.every(ro => ro.status === status);

        if (allAtSameStatus) {
            await Order.update(
                { status: status },
                { where: { id: restaurantOrder.order_id } }
            );

            let message = '';
            switch (status) {
                case statuses.preparing:
                    message = "All restaurants are preparing your order";
                    break;
                case statuses.on_the_way:
                    message = "All restaurants are on the way";
                    break;
                case statuses.delivered:
                    message = "Order has been delivered by all restaurants";
                    break;
            }

            req.io?.to(`order_${restaurantOrder.order_id}`)?.emit("order_status_synchronized", {
                order_id: restaurantOrder.order_id,
                status: status,
                message: message,
                timestamp: new Date().toISOString()
            });
        }

        res.json({
            message: "Order status updated successfully",
            status: status,
            restaurant_order: restaurantOrder
        });

    } catch (error) {
        next(error);
    }
};

export const cancelOrder = async (req, res, next) => {
    const userId = req.user.id;
    const { id: order_id } = req.params;

    try {
        const order = await Order.findOne({
            where: { id: order_id, user_id: userId, status: statuses.pending },
            include: [
                {
                    model: RestaurantOrder,
                    as: "restaurant_orders",
                    include: [{ model: Restaurant, as: "restaurant_details" }]
                }
            ]
        });
        console.log(order);

        if (!order) return res.status(404).json({ message: "Order not found or cannot be cancelled" });

        const anyAccepted = order.restaurant_orders.some(ro => ro.status !== statuses.pending) || false;

        if (anyAccepted) return res.status(400).json({ message: "Can't cancel an order that has already started" });

        await order.update({ status: statuses.cancelled });

        await RestaurantOrder.update(
            { status: statuses.cancelled },
            { where: { order_id } }
        );

        order.restaurant_orders.forEach(restaurantOrder => {
            req.io?.to(`restaurant_${restaurantOrder.restaurant_id}`)?.emit("order_cancelled", {
                order_id: order_id,
                restaurant_order_id: restaurantOrder.id,
                user_id: userId,
                message: "Order has been cancelled by customer"
            });
        });

        req.io?.to(`order_${order_id}`)?.emit("order_cancelled_success", {
            order_id: order_id,
            message: "Order cancelled successfully"
        });

        res.json({
            message: "Order cancelled successfully",
            order_id: order_id
        });

    } catch (error) {
        next(error);
    }
};

export const getOrderDetails = async (req, res, next) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;

        const order = await Order.findOne({
            where: { id: id, user_id: userId },
            include: [
                { model: OrderItems, as: 'order_items', attributes: ['id', 'dish_name', 'dish_price', 'quantity', 'total_price'] },
                {
                    model: RestaurantOrder, as: 'restaurant_orders', include: [
                        { model: Restaurant, as: 'restaurant_details', attributes: ['id', 'name', 'logo', 'address', 'phone_number'] },
                        { model: OrderItems, as: 'order_items', where: { order_id: id }, required: false, attributes: ['id', 'dish_name', 'dish_price', 'quantity', 'total_price'] }
                    ]
                }]
        });

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }
        res.json({ success: true, data: { order: order.toJSON() } });

    } catch (error) {
        console.error('Get order details error:', error);
        next(new AppError('Failed to get order details', 500));
    }
};

export const getMyOrders = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const orders = await Order.findAll({
            where: { user_id: userId },
            include: [
                { model: OrderItems, as: 'order_items', attributes: ['id', 'dish_name', 'dish_price', 'quantity', 'total_price'] }
            ],
            order: [['createdAt', 'DESC']]
        });

        res.json({ success: true, orders });

    } catch (error) {
        console.error('Get my orders error:', error);
        next(new AppError('Failed to get orders', 500));
    }
};

// export const getRestaurantOrders = async (req, res, next) => {
//     try {
//         const ownerId = req.user.id;
//         const restaurant = await Restaurant.findOne({
//             where: { owner_id: ownerId },
//             attributes: ['id', 'name']
//         });

//         if (!restaurant) {
//             return res.status(403).json({ message: "Unauthorized: No restaurant found for this owner" });
//         }

//         const { status } = req.query;

//         const whereClause = { restaurant_id: restaurant.id };
//         if (status) {
//             whereClause.status = status;
//         }

//         const restaurantOrders = await RestaurantOrder.findAll({
//             where: whereClause,
//             include: [
//                 {
//                     model: Order,
//                     as: 'main_order',
//                     attributes: ['id', 'user_id', 'address', 'special_instructions', 'createdAt']
//                 },
//                 {
//                     model: OrderItems,
//                     as: 'order_items',
//                     attributes: ['id', 'dish_name', 'dish_price', 'quantity', 'total_price']
//                 }
//             ],
//             order: [['createdAt', 'DESC']]
//         });

//         res.json({
//             success: true,
//             restaurant_orders: restaurantOrders,
//             restaurant: {
//                 id: restaurant.id,
//                 name: restaurant.name
//             }
//         });

//     } catch (error) {
//         console.error('Get restaurant orders error:', error);
//         next(new AppError('Failed to get restaurant orders', 500));
//     }
// };

// export const getRestaurantOrderDetails = async (req, res, next) => {
//     try {
//         const { id: restaurantOrderId } = req.params;
//         const ownerId = req.user.id;

//         const restaurant = await Restaurant.findOne({
//             where: { owner_id: ownerId },
//             attributes: ['id', 'name']
//         });

//         if (!restaurant) {
//             return res.status(403).json({ message: "Unauthorized: No restaurant found for this owner" });
//         }

//         const restaurantOrder = await RestaurantOrder.findOne({
//             where: {
//                 id: restaurantOrderId,
//                 restaurant_id: restaurant.id
//             },
//             include: [
//                 {
//                     model: Order,
//                     as: 'main_order',
//                     attributes: ['id', 'user_id', 'address', 'special_instructions', 'total_amount', 'status', 'createdAt']
//                 },
//                 {
//                     model: OrderItems,
//                     as: 'order_items',
//                     attributes: ['id', 'dish_name', 'dish_price', 'quantity', 'total_price']
//                 }
//             ]
//         });

//         if (!restaurantOrder) {
//             return res.status(404).json({ message: "Order not found" });
//         }

//         res.json({
//             success: true,
//             restaurant_order: restaurantOrder
//         });

//     } catch (error) {
//         console.error('Get restaurant order details error:', error);
//         next(new AppError('Failed to get restaurant order details', 500));
//     }
// };
