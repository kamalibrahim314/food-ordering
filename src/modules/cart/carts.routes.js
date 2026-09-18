import { Router } from "express";
import { authentication } from "../../middleware/authentication.js";
import authorization from "../../middleware/authorization.js";
import { RoleEnum } from "../../DB/models/User.js";
import { validate } from "../../middleware/validation.js";
import * as cartController from "./carts.controller.js";
import * as cartValidation from "./carts.validation.js";

const CartRouter = Router();

CartRouter.post('/add', authentication(), validate(cartValidation.addToCartSchema), cartController.addToCart);
CartRouter.put('/update/:id', authentication(), validate(cartValidation.updateQuantitySchema), cartController.updateQuantity);
CartRouter.delete('/delete/:id', authentication(), validate(cartValidation.removeItemSchema), cartController.removeItem);
CartRouter.delete('/clear', authentication(), cartController.clearCart);

CartRouter.get('/', authentication(), cartController.getCart);
CartRouter.get('/sync-prices', authentication(), cartController.syncCartPrices);

export default CartRouter;