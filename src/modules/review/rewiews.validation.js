import Joi from "joi";


export const createReviewSchema = {
    body: Joi.object({
        dish_id: Joi.number().integer().required(),
        rating: Joi.number().integer().min(1).max(5).required(),
        comment: Joi.string().optional(),
    }),
};

export const updateReviewSchema = {
    body: Joi.object({
        rating: Joi.number().integer().min(1).max(5).optional(),
        comment: Joi.string().optional(),
    }),
};