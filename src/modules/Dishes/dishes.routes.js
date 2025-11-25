import { Router } from "express";
import { TokenType } from "../../utils/token.js";

import * as dishesController from "./dishes.controller.js";
import * as dishesValidation from "./dishes.validation.js";
import { authentication } from "../../middleware/authentication.js";
import authorization from "../../middleware/authorization.js";
import { RoleEnum } from "../../DB/models/User.js";
import { createUploader, upload } from "../../middleware/multer.js";
import { validate } from "../../middleware/validation.js";

const DishImage = createUploader({ folder: "dishes", type: "images" });


const dishRouter = Router();

dishRouter.get("/", dishesController.getAllDishes);

dishRouter.post("/addDish",
    authentication(),
    authorization(RoleEnum.RESTAURANT_OWNER),
    upload(DishImage, 'single', 'image'),
    validate(dishesValidation.addDishSchema),
    dishesController.addDish
);

export default dishRouter;