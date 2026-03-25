import Joi from "joi";

export const verifyEmailSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  code: Joi.string().trim().length(6).pattern(/^[0-9]+$/).required()
});
