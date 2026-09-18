import User from "./User.js";
import RevokedToken from "./RevokedToken.js";
import Category from "./Category.js";
import Cart from "./Cart.js";
import Dish from "./Dish.js";
import Order from "./Order.js";
import OrderItems from "./OrderItems.js";
import Restaurant from "./Restaurant.js";
import Review from "./Review.js";
import RestaurantOrder from "./RestaurantOrder.js";

// =================== USER ↔ RESTAURANT ===================
User.hasMany(Restaurant, {
    foreignKey: "owner_id",
    as: "owned_restaurants",
});
Restaurant.belongsTo(User, {
    foreignKey: "owner_id",
    as: "owner",
});

// =================== CATEGORY ↔ DISH ===================
Category.hasMany(Dish, {
    foreignKey: "category_id",
    as: "dishes",
});
Dish.belongsTo(Category, {
    foreignKey: "category_id",
    as: "category",
});

// =================== RESTAURANT ↔ DISH ===================
Restaurant.hasMany(Dish, {
    foreignKey: "restaurant_id",
    as: "restaurant_dishes",
});
Dish.belongsTo(Restaurant, {
    foreignKey: "restaurant_id",
    as: "restaurant",
});

// =================== USER ↔ CART ===================
User.hasMany(Cart, {
    foreignKey: "user_id",
    as: "cart_items",
});
Cart.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
});

// =================== DISH ↔ CART ===================
Dish.hasMany(Cart, {
    foreignKey: "dish_id",
    as: "dish_carts",
});
Cart.belongsTo(Dish, {
    foreignKey: "dish_id",
    as: "dish",
});

// =================== USER ↔ ORDER ===================
User.hasMany(Order, {
    foreignKey: "user_id",
    as: "orders",
});
Order.belongsTo(User, {
    foreignKey: "user_id",
    as: "customer",
});

// =================== ORDER ↔ ORDER ITEMS ===================
Order.hasMany(OrderItems, {
    foreignKey: "order_id",
    as: "order_items",
});
OrderItems.belongsTo(Order, {
    foreignKey: "order_id",
    as: "parent_order",
});

// =================== ORDER ↔ RESTAURANT ORDERS ===================
Order.hasMany(RestaurantOrder, {
    foreignKey: "order_id",
    as: "restaurant_orders",
});
RestaurantOrder.belongsTo(Order, {
    foreignKey: "order_id",
    as: "main_order",
});

// =================== RESTAURANT ↔ RESTAURANT ORDERS ===================
Restaurant.hasMany(RestaurantOrder, {
    foreignKey: "restaurant_id",
    as: "orders",
});
RestaurantOrder.belongsTo(Restaurant, {
    foreignKey: "restaurant_id",
    as: "restaurant_details",
});

// =================== ORDER ITEMS ↔ DISH ===================
Dish.hasMany(OrderItems, {
    foreignKey: "dish_id",
    as: "dish_order_items",
});
OrderItems.belongsTo(Dish, {
    foreignKey: "dish_id",
    as: "dish",
});

// =================== RESTAURANT ORDER ↔ ORDER ITEMS ===================
RestaurantOrder.hasMany(OrderItems, {
    foreignKey: "restaurant_id",
    as: "order_items",
});
OrderItems.belongsTo(RestaurantOrder, {
    foreignKey: "restaurant_order_id",
    as: "restaurant_order",
});

// =================== USER ↔ REVIEW ===================
// =================== DISH ↔ REVIEW ===================
Dish.hasMany(Review, {
    foreignKey: "dish_id",
    as: "reviews",
});
Review.belongsTo(Dish, {
    foreignKey: "dish_id",
    as: "dish",
});

// =================== RESTAURANT ↔ REVIEW ===================
Restaurant.hasMany(Review, {
    foreignKey: "restaurant_id",
    as: "reviews",
});
Review.belongsTo(Restaurant, {
    foreignKey: "restaurant_id",
    as: "restaurant",
});

// =================== USER ↔ REVOKED TOKEN ===================
User.hasMany(RevokedToken, {
    foreignKey: "user_id",
    as: "revoked_tokens",
});
RevokedToken.belongsTo(User, {
    foreignKey: "user_id",
    as: "user_token",
});

export { User, RevokedToken, Category, Cart, Dish, Order, OrderItems, Restaurant, Review, RestaurantOrder };
