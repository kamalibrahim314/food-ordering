import { Router } from "express";
import authorization from "../../middleware/authorization.js";
import { authentication } from "../../middleware/authentication.js";
import * as orderController from "./order.controller.js";
import * as orderValidation from "./order.validation.js";
import { RoleEnum } from "../../DB/models/User.js";
import { validate } from "../../middleware/validation.js";


const orderRouter = Router();

orderRouter.post('/', authentication(), validate(orderValidation.createOrderSchema), orderController.createOrder);

orderRouter.put('/accept/:id', authentication(), authorization(RoleEnum.RESTAURANT), validate(orderValidation.acceptOrderSchema), orderController.acceptOrder);

orderRouter.put('/status/:id', authentication(), authorization(RoleEnum.RESTAURANT), validate(orderValidation.updateRestaurantOrderStatusSchema), orderController.updateRestaurantOrderStatus);

orderRouter.put('/cancel/:id', authentication(), orderController.cancelOrder);

orderRouter.get('/me', authentication(), orderController.getMyOrders);

// orderRouter.get('/restaurant/orders', authentication(), authorization(RoleEnum.RESTAURANT), validate(orderValidation.getRestaurantOrdersSchema), orderController.getRestaurantOrders);

// orderRouter.get('/restaurant/orders/:id', authentication(), authorization(RoleEnum.RESTAURANT), validate(orderValidation.getRestaurantOrderDetailsSchema), orderController.getRestaurantOrderDetails);

orderRouter.get('/:id', authentication(), orderController.getOrderDetails);

export default orderRouter;
