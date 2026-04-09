import Joi from "joi";

export const updateBuyerProfileSchema = Joi.object({
  first_name: Joi.string().trim().min(2).max(50).optional(),
  last_name: Joi.string().trim().min(2).max(50).optional(),
  phone: Joi.string()
    .trim()
    .pattern(/^\+?[0-9]{7,15}$/)
    .optional(),
  username: Joi.any().forbidden().messages({
    "any.unknown": "username is not allowed.",
    "any.forbidden": "username cannot be updated."
  }),
  email: Joi.any().forbidden().messages({
    "any.unknown": "email is not allowed.",
    "any.forbidden": "email cannot be updated."
  })
}).min(1);
