import Joi from "joi";

export const updateProductBrandSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).optional(),
  description: Joi.string().trim().min(2).max(500).optional()
}).min(1);
