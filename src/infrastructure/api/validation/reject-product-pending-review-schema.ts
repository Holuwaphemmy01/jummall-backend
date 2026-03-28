import Joi from "joi";

export const rejectProductPendingReviewSchema = Joi.object({
  review_note: Joi.string().trim().min(1).max(500).required()
});
