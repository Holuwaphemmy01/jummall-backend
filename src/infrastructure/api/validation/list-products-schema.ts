import Joi from "joi";

export const listProductsSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  category_id: Joi.string().trim().optional(),
  brand_id: Joi.string().trim().optional(),
  min_price: Joi.number().min(0).optional(),
  max_price: Joi.number().min(0).optional(),
  search: Joi.string().trim().min(1).max(150).optional()
});
