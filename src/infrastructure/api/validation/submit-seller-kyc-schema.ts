import Joi from "joi";

export const submitSellerKycSchema = Joi.object({
  confirm: Joi.boolean().valid(true).optional()
});
