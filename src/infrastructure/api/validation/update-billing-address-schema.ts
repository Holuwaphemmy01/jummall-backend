import Joi from "joi";

export const updateBillingAddressSchema = Joi.object({
  full_name: Joi.string().trim().optional(),
  phone_number: Joi.string().trim().optional(),
  address_line_1: Joi.string().trim().optional(),
  address_line_2: Joi.string().trim().allow("", null).optional(),
  city: Joi.string().trim().optional(),
  state: Joi.string().trim().optional(),
  country: Joi.string().trim().optional(),
  postal_code: Joi.string().trim().allow("", null).optional()
}).min(1);
