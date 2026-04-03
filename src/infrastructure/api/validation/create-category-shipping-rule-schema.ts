import Joi from "joi";
import { shippingSubtotalBandSchema } from "./shipping-subtotal-band-schema";

export const createCategoryShippingRuleSchema = Joi.object({
  category_id: Joi.string().trim().required(),
  method_type: Joi.string()
    .valid("fixed_rate", "percentage_based")
    .required(),
  value: Joi.number().min(0).required(),
  subtotal_bands: Joi.array().items(shippingSubtotalBandSchema).optional()
});
