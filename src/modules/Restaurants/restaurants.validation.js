import Joi from "joi";

export const addRestaurant = {
    body: Joi.object().keys({
        owner_id: Joi.number().integer().required(),
        name: Joi.string().max(100).required(),
        describetion: Joi.string().required(),
        address: Joi.string().required(),
        phone_number: Joi.string().pattern(/^01[0125][0-9]{8}$/).required(),
        open_time: Joi.string().required(),
        close_time: Joi.string().required(),
    }),
    file: Joi.object().required(),
};

export const updateRestaurant = {
    params: Joi.object().keys({
        id: Joi.number().integer().required(),
    }), body: Joi.object().keys({
        name: Joi.string().max(100).optional(),
        describetion: Joi.string().optional(),
        address: Joi.string().optional(),
        phone_number: Joi.string().pattern(/^01[0125][0-9]{8}$/).optional(),
        open_time: Joi.string().optional(),
        close_time: Joi.string().optional(),
    }),
    file: Joi.object().optional(),
};

export const deleteRestaurant = {
    params: Joi.object().keys({
        id: Joi.number().integer().required(),
    }),
};

