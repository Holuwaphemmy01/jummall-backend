import Joi from "joi";

export const updateFreeShippingRuleSchema = Joi.object({
  name: Joi.string().trim().optional(),
  type: Joi.string().valid("coupon", "threshold").optional(),
  coupon_code: Joi.string().trim().optional(),
  minimum_order_subtotal: Joi.number().min(0).optional()
})
  .min(1)
  .messages({
    "object.min": "At least one free shipping rule field must be provided."
  });
