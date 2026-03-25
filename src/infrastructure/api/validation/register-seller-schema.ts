import Joi from "joi";

export const registerSellerSchema = Joi.object({
  first_name: Joi.string().trim().min(2).max(50).required(),
  last_name: Joi.string().trim().min(2).max(50).required(),
  username: Joi.string()
    .trim()
    .min(3)
    .max(30)
    .pattern(/^[a-zA-Z0-9_.-]+$/)
    .required(),
  email: Joi.string().trim().email().required(),
  phone_number: Joi.string()
    .trim()
    .pattern(/^\+?[0-9]{7,15}$/)
    .required(),
  password: Joi.string().min(8).max(128).required(),
  confirm_password: Joi.string()
    .required()
    .valid(Joi.ref("password"))
    .messages({
      "any.only": "confirm_password must match password."
    }),
  account_type: Joi.string()
    .trim()
    .lowercase()
    .valid("individual", "business")
    .required()
});
