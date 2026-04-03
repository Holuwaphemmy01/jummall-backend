import Joi from "joi";

export const calculateCartShippingSchema = Joi.object({
  billing_address_id: Joi.string().trim().required(),
  discounted_subtotal: Joi.number().min(0).required(),
  free_shipping_coupon_code: Joi.string().trim().allow("", null).optional()
});
