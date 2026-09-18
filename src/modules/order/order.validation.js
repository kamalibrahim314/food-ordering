import Joi from "joi";
import { statuses } from "../../DB/models/Order.js";

export const createOrderSchema = {
    body: Joi.object({
        address: Joi.string().required(),
        special_instructions: Joi.string().optional()
    })
};

export const acceptOrderSchema = {
    params: Joi.object().keys({
        id: Joi.number().integer().required(),
    }),
};

export const updateRestaurantOrderStatusSchema = {
    params: Joi.object().keys({
        id: Joi.number().integer().required(),
    }),
    body: Joi.object().keys({
        status: Joi.string().valid(statuses.preparing, statuses.on_the_way, statuses.delivered).required(),
    }),
};

// export const getRestaurantOrdersSchema = {
//     query: Joi.object().keys({
//         status: Joi.string().valid(
//             statuses.pending,
//             statuses.accepted,
//             statuses.preparing,
//             statuses.on_the_way,
//             statuses.delivered,
//             statuses.cancelled
//         ).optional()
//     })
// };

// export const getRestaurantOrderDetailsSchema = {
//     params: Joi.object().keys({
//         id: Joi.number().integer().required(),
//     })
// };
