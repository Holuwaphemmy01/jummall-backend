import Joi from "joi";

export const updateCategoryShippingRuleSchema = Joi.object({
  category_id: Joi.string().trim().optional(),
  method_type: Joi.string().valid("fixed_rate", "percentage_based").optional(),
  value: Joi.number().min(0).optional()
})
  .min(1)
  .messages({
    "object.min": "At least one category shipping rule field must be provided."
  });
