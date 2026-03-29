import Joi from "joi";

export const searchProductsSchema = Joi.object({
  query: Joi.string().trim().min(1).max(150).required(),
  limit: Joi.number().integer().min(1).max(20).default(10)
});
