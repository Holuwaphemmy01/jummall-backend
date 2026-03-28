import Joi from "joi";

export const resetPasswordSchema = Joi.object({
  email: Joi.string().email().required(),
  code: Joi.string().trim().required(),
  password: Joi.string().min(8).required(),
  confirm_password: Joi.string().min(8).required()
});
