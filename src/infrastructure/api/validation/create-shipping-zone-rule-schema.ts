import Joi from "joi";

export const createShippingZoneRuleSchema = Joi.object({
  zone_id: Joi.string().trim().required(),
  method_type: Joi.string()
    .valid("fixed_rate", "percentage_based")
    .required(),
  value: Joi.number().min(0).required()
});
