import Joi from "joi";
import { shippingSubtotalBandSchema } from "./shipping-subtotal-band-schema";

export const updateCategoryShippingRuleSchema = Joi.object({
  category_id: Joi.string().trim().optional(),
  method_type: Joi.string().valid("fixed_rate", "percentage_based").optional(),
  value: Joi.number().min(0).optional(),
  subtotal_bands: Joi.array().items(shippingSubtotalBandSchema).optional()
})
  .min(1)
  .messages({
    "object.min": "At least one category shipping rule field must be provided."
  });
