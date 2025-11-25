import Joi from "joi";

export const addDishSchema = {
    body: Joi.object().keys({
        restaurant_id: Joi.number().integer().required(),
        category_id: Joi.number().integer().required(),
        name: Joi.string().max(100).required(),
        description: Joi.string().required(),
        price: Joi.number().precision(2).required(),
        is_available: Joi.boolean().optional(),
    }),
    file: Joi.object().required(),
};

