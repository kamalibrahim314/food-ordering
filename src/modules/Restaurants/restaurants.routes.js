import { Router } from "express";
import { TokenType } from "../../utils/token.js";

import { validate } from "../../middleware/validation.js";
import { authentication } from "../../middleware/authentication.js";
import * as restaurantsController from "./restaurants.controller.js";
import * as restaurantsValidation from "./restaurants.validation.js";
import authorization from "../../middleware/authorization.js";
import { RoleEnum } from "../../DB/models/User.js";
import { createUploader, upload } from "../../middleware/multer.js";

const RestaurantLogo = createUploader({ folder: "restaurants", type: "images" });

const restaurantRouter = Router();

restaurantRouter.post("/addRestaurant", authentication(), authorization(RoleEnum.ADMIN), upload(RestaurantLogo, 'single', 'image'), validate(restaurantsValidation.addRestaurant), restaurantsController.addRestaurant);
restaurantRouter.put('/updateRestaurant/:id', authentication(), authorization(RoleEnum.ADMIN), upload(RestaurantLogo, 'single', 'image'), validate(restaurantsValidation.updateRestaurant), restaurantsController.updateRestaurant);
restaurantRouter.delete('/deleteRestaurant/:id', authentication(), authorization(RoleEnum.ADMIN), validate(restaurantsValidation.deleteRestaurant), restaurantsController.deleteRestaurant);

restaurantRouter.get('/my-restaurant', authentication(), authorization(RoleEnum.RESTAURANT), restaurantsController.getMyRestaurant);

restaurantRouter.get("/", restaurantsController.getAllRestaurants);
restaurantRouter.get("/:id", restaurantsController.getRestaurant);


export default restaurantRouter;

