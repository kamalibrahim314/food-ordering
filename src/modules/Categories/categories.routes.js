import { Router } from "express";
import { authentication } from "../../middleware/authentication.js";
import authorization from "../../middleware/authorization.js";
import { RoleEnum } from "../../DB/models/User.js";
import { validate } from "../../middleware/validation.js";
import * as categoryController from "./categories.controller.js";
import * as categoryValidation from "./categories.validation.js";

const CategoryRouter = Router();

CategoryRouter.get("/", categoryController.getAllCategories);

CategoryRouter.post("/addCategory",
    authentication(),
    authorization(RoleEnum.RESTAURANT_OWNER),
    validate(categoryValidation.addCategorySchema),
    categoryController.addCategory
);

export default CategoryRouter;