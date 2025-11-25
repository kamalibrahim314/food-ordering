import Joi from "joi";

export const addCategorySchema = {
    body: Joi.object().keys({
        restaurant_id: Joi.number().integer().required(),
        name: Joi.string().max(100).required(),
    }),
};

