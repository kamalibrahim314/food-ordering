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

restaurantRouter.get("/", restaurantsController.getAllRestaurants);

restaurantRouter.post("/addRestaurant",
    authentication(),
    authorization(RoleEnum.ADMIN),
    upload(RestaurantLogo, 'single', 'image'),
    validate(restaurantsValidation.addRestaurant),
    restaurantsController.addRestaurant
);

export default restaurantRouter;