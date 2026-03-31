import Joi from "joi";

export const addBillingAddressSchema = Joi.object({
  full_name: Joi.string().trim().required(),
  phone_number: Joi.string().trim().required(),
  address_line_1: Joi.string().trim().required(),
  address_line_2: Joi.string().trim().allow("", null).optional(),
  city: Joi.string().trim().required(),
  state: Joi.string().trim().required(),
  country: Joi.string().trim().required(),
  postal_code: Joi.string().trim().allow("", null).optional()
});
