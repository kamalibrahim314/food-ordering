import { Router } from "express";
import authRouter from "./user/auth.routes.js";
import restaurantRouter from "./Restaurants/restaurants.routes.js";
import dishRouter from "./Dishes/dishes.routes.js";
import CategoryRouter from "./Categories/categories.routes.js";

const router = Router();

router.use('/auth', authRouter);
router.use('/restaurant', restaurantRouter);
router.use('/dish', dishRouter);
router.use('/category', CategoryRouter);


export default router;