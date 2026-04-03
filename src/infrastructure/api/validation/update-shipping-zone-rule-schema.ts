import Joi from "joi";

export const updateShippingZoneRuleSchema = Joi.object({
  zone_id: Joi.string().trim().optional(),
  method_type: Joi.string().valid("fixed_rate", "percentage_based").optional(),
  value: Joi.number().min(0).optional()
})
  .min(1)
  .messages({
    "object.min": "At least one shipping zone rule field must be provided."
  });
