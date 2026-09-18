import Joi from "joi";

export const addToCartSchema = {
    body: Joi.object().keys({
        dish_id: Joi.number().integer().required(),
        quantity: Joi.number().integer().min(1).required(),
    }),
};

export const updateQuantitySchema = {
    params: Joi.object().keys({
        id: Joi.number().integer().required(),
    }), body: Joi.object().keys({
        quantity: Joi.number().integer().min(1).required(),
    }),
};

export const removeItemSchema = {
    params: Joi.object().keys({
        id: Joi.number().integer().required(),
    }),
}
