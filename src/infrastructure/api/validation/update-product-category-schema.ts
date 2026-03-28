import Joi from "joi";

export const updateProductCategorySchema = Joi.object({
  name: Joi.string().trim().optional(),
  description: Joi.string().trim().optional(),
  deduction_percentage: Joi.number().min(0).max(100).optional()
}).min(1);
