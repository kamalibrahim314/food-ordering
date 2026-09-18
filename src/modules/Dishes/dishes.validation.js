import Joi from "joi";


export const getDisheSchema = {
    params: Joi.object().keys({
        id: Joi.number().integer().required(),
    }),
};

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

export const updateDishSchema = {
    params: Joi.object().keys({
        id: Joi.number().integer().required(),
    }), body: Joi.object().keys({
        category_id: Joi.number().integer().optional(),
        name: Joi.string().max(100).optional(),
        description: Joi.string().optional(),
        price: Joi.number().precision(2).optional(),
        is_available: Joi.boolean().optional(),
    }),
    file: Joi.object().optional(),
};

export const deleteDishSchema = {
    params: Joi.object().keys({
        id: Joi.number().integer().required(),
    }),
};
