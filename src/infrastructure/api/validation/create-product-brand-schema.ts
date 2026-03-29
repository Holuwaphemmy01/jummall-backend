import Joi from "joi";

export const createProductBrandSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  description: Joi.string().trim().min(2).max(500).required()
});
