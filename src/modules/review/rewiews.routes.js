import { Router } from "express";
import * as reviewController from "./rewiews.controller.js";
import * as reviewValidation from "./rewiews.validation.js";
import { authentication } from "../../middleware/authentication.js";
import authorization from "../../middleware/authorization.js";
import { RoleEnum } from "../../DB/models/User.js";
import { validate } from "../../middleware/validation.js";

const ReviewRouter = Router();

ReviewRouter.get("/", validate(reviewValidation.getAllReviewsSchema), reviewController.getAllReviews);
ReviewRouter.get("/summary", authentication(), reviewController.getReviewsSummary);
ReviewRouter.get("/average", validate(reviewValidation.getAverageRatingSchema), reviewController.getAverageRating);
ReviewRouter.get("/restaurant/:restaurant_id", reviewController.getRestaurantReviews);
ReviewRouter.get("/dish/:dish_id", reviewController.getDishReviews);
ReviewRouter.get("/:id", reviewController.getReviewById);

ReviewRouter.post("/", authentication(), authorization([RoleEnum.CUSTOMER, RoleEnum.ADMIN]), validate(reviewValidation.createReviewSchema), reviewController.createReview);
ReviewRouter.put("/:id", authentication(), validate(reviewValidation.updateReviewSchema), reviewController.updateReview);
ReviewRouter.delete("/:id", authentication(), reviewController.deleteReview);
ReviewRouter.get("/user/my-reviews", authentication(), reviewController.getUserReviews);

export default ReviewRouter;