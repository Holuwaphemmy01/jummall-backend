import Joi from "joi";

export const approveProductPendingReviewSchema = Joi.object({
  review_note: Joi.string().trim().max(500).optional()
});
