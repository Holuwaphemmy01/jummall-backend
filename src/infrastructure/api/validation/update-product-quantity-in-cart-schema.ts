import Joi from "joi";

export const updateProductQuantityInCartSchema = Joi.object({
  quantity: Joi.number().integer().min(1).required()
});
