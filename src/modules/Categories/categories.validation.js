import Joi from "joi";

export const getCategorySchema = {
    params: Joi.object().keys({
        id: Joi.number().integer().required(),
    }),
};

export const addCategorySchema = {
    body: Joi.object().keys({
        name: Joi.string().max(100).required(),
    }),
    file: Joi.object().required(),
};

export const updateCategorySchema = {
    params: Joi.object().keys({
        id: Joi.number().integer().required(),
    }), body: Joi.object().keys({
        name: Joi.string().max(100).optional(),
    }),
    file: Joi.object().optional(),
};

export const deleteCategorySchema = {
    params: Joi.object().keys({
        id: Joi.number().integer().required(),
    }),
};

