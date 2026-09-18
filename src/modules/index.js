import { Router } from "express";
import authRouter from "./user/auth.routes.js";
import restaurantRouter from "./Restaurants/restaurants.routes.js";
import dishRouter from "./Dishes/dishes.routes.js";
import CategoryRouter from "./Categories/categories.routes.js";
import CartRouter from "./cart/carts.routes.js";
import orderRouter from "./order/order.routes.js";
import ReviewRouter from "./review/rewiews.routes.js";

const router = Router();

router.use('/auth', authRouter);
router.use('/restaurant', restaurantRouter);
router.use('/dish', dishRouter);
router.use('/category', CategoryRouter);
router.use('/cart', CartRouter);
router.use('/order', orderRouter);
router.use('/review', ReviewRouter);

export default router;