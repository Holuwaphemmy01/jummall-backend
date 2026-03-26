import Joi from "joi";

export const approveSellerKycSchema = Joi.object({
  review_note: Joi.string().trim().max(1000).optional()
});
