import { Router } from "express";
import { authentication } from "../../middleware/authentication.js";
import authorization from "../../middleware/authorization.js";
import { RoleEnum } from "../../DB/models/User.js";
import { validate } from "../../middleware/validation.js";
import * as categoryController from "./categories.controller.js";
import * as categoryValidation from "./categories.validation.js";
import { createUploader, upload } from "../../middleware/multer.js";

const CategoryRouter = Router();

const CategoryImage = createUploader({ folder: "categories", type: "images" });

CategoryRouter.get("/", categoryController.getAllCategories);
CategoryRouter.get("/:id", validate(categoryValidation.getCategorySchema), categoryController.getCategory);

CategoryRouter.post("/addCategory", authentication(), authorization(RoleEnum.ADMIN), upload(CategoryImage, 'single', 'image'), validate(categoryValidation.addCategorySchema), categoryController.addCategory);
CategoryRouter.put('/updateCategory/:id', authentication(), authorization(RoleEnum.ADMIN), upload(CategoryImage, 'single', 'image'), validate(categoryValidation.updateCategorySchema), categoryController.updateCategory);
CategoryRouter.delete('/deleteCategory/:id', authentication(), authorization(RoleEnum.ADMIN), validate(categoryValidation.deleteCategorySchema), categoryController.deleteCategory);

export default CategoryRouter;