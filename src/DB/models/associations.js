import User from "./User.js";
import RevokedToken from "./RevokedToken.js";
import Category from "./Category.js";
import Cart from "./Cart.js";
import Dish from "./Dish.js";
import Order from "./Order.js";
import OrderItems from "./OrderItems.js";
import Payment from "./Payment.js";
import Restaurant from "./Restaurant.js";
import Review from "./Review.js";

// owner → restaurants
User.hasMany(Restaurant, {
    foreignKey: "owner_id",
    as: "restaurants",
});
Restaurant.belongsTo(User, {
    foreignKey: "owner_id",
    as: "owner",
});

// restaurant → categories
Restaurant.hasMany(Category, {
    foreignKey: "restaurant_id",
    as: "categories",
});
Category.belongsTo(Restaurant, {
    foreignKey: "restaurant_id",
    as: "restaurant",
});

// category → dishes
Category.hasMany(Dish, {
    foreignKey: "category_id",
    as: "dishes",
});
Dish.belongsTo(Category, {
    foreignKey: "category_id",
    as: "category",
});

// restaurant → dishes
Restaurant.hasMany(Dish, {
    foreignKey: "restaurant_id",
    as: "dishes",
});
Dish.belongsTo(Restaurant, {
    foreignKey: "restaurant_id",
    as: "restaurant",
});

// users  ↔  CART
User.hasMany(Cart, {
    foreignKey: "user_id",
    as: "cart_items",
});
Cart.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
});

// DISH  ↔  CART
Dish.hasMany(Cart, {
    foreignKey: "dish_id",
    as: "carts",
});
Cart.belongsTo(Dish, {
    foreignKey: "dish_id",
    as: "dish",
});

// users  ↔  ORDERS
User.hasMany(Order, {
    foreignKey: "user_id",
    as: "orders",
});
Order.belongsTo(User, {
    foreignKey: "user_id",
    as: "customer",
});

// RESTAURANT  ↔  ORDERS
Restaurant.hasMany(Order, {
    foreignKey: "restaurant_id",
    as: "orders",
});
Order.belongsTo(Restaurant, {
    foreignKey: "restaurant_id",
    as: "restaurant",
});

// orders  ↔  ORDER ITEMS
Order.hasMany(OrderItems, {
    foreignKey: "order_id",
    as: "items",
});
OrderItems.belongsTo(Order, {
    foreignKey: "order_id",
    as: "order",
});

// DISH  ↔  ORDER ITEMS
Dish.hasMany(OrderItems, {
    foreignKey: "dish_id",
    as: "order_items",
});
OrderItems.belongsTo(Dish, {
    foreignKey: "dish_id",
    as: "dish",
});


// ORDER  ↔  PAYMENT
Order.hasOne(Payment, {
    foreignKey: "order_id",
    as: "payment",
});
Payment.belongsTo(Order, {
    foreignKey: "order_id",
    as: "order",
});

// users  ↔  REVIEWS
User.hasMany(Review, {
    foreignKey: "user_id",
    as: "reviews",
});
Review.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
});

// DISH  ↔  REVIEWS
Dish.hasMany(Review, {
    foreignKey: "dish_id",
    as: "reviews",
});
Review.belongsTo(Dish, {
    foreignKey: "dish_id",
    as: "dish",
});

// users  ↔  REVOKED TOKENS
User.hasMany(RevokedToken, {
    foreignKey: "user_id",
    as: "revoked_tokens",
});
RevokedToken.belongsTo(User, {
    foreignKey: "user_id",
    as: "user",
});

export { User, RevokedToken, Category, Cart, Dish, Order, OrderItems, Payment, Restaurant, Review, };
