import Joi from "joi";

export const createProductCategorySchema = Joi.object({
  name: Joi.string().trim().required(),
  description: Joi.string().trim().required(),
  deduction_percentage: Joi.number().min(0).max(100).required()
});
