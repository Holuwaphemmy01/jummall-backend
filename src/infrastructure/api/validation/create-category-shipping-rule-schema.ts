import Joi from "joi";

export const createCategoryShippingRuleSchema = Joi.object({
  category_id: Joi.string().trim().required(),
  method_type: Joi.string()
    .valid("fixed_rate", "percentage_based")
    .required(),
  value: Joi.number().min(0).required()
});
