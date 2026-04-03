import Joi from "joi";

export const createFreeShippingRuleSchema = Joi.object({
  name: Joi.string().trim().required(),
  type: Joi.string().valid("coupon", "threshold").required(),
  coupon_code: Joi.when("type", {
    is: "coupon",
    then: Joi.string().trim().required(),
    otherwise: Joi.forbidden()
  }),
  minimum_order_subtotal: Joi.when("type", {
    is: "threshold",
    then: Joi.number().min(0).required(),
    otherwise: Joi.forbidden()
  })
});
