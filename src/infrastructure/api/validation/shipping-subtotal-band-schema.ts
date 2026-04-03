import Joi from "joi";

export const shippingSubtotalBandSchema = Joi.object({
  min_subtotal: Joi.number().min(0).required(),
  max_subtotal: Joi.number().greater(Joi.ref("min_subtotal")).allow(null).optional(),
  method_type: Joi.string()
    .valid("fixed_rate", "percentage_based")
    .required(),
  value: Joi.number().min(0).required()
});
