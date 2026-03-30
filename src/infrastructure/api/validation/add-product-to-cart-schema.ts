import Joi from "joi";

export const addProductToCartSchema = Joi.object({
  product_id: Joi.string().trim().required(),
  quantity: Joi.number().integer().min(1).required()
});
