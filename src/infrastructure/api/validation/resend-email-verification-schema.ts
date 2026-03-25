import Joi from "joi";

export const resendEmailVerificationSchema = Joi.object({
  email: Joi.string().trim().email().required()
});
