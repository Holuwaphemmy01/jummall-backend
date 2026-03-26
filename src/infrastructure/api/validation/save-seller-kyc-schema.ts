import Joi from "joi";

export const saveSellerKycSchema = Joi.object({
  account_type: Joi.string().valid("individual", "business").required(),
  email: Joi.string().email().optional(),
  phone_number: Joi.string().trim().optional(),
  address: Joi.string().trim().optional(),
  city: Joi.string().trim().optional(),
  state: Joi.string().trim().optional(),
  country: Joi.string().trim().optional(),
  bank_name: Joi.string().trim().optional(),
  bank_account_number: Joi.string().trim().optional(),
  bank_account_name: Joi.string().trim().optional(),
  full_name: Joi.string().trim().optional(),
  date_of_birth: Joi.date().iso().optional(),
  gender: Joi.string().trim().optional(),
  id_type: Joi.string()
    .valid("national_id", "international_passport", "drivers_license", "voters_card")
    .optional(),
  id_number: Joi.string().trim().optional(),
  business_name: Joi.string().trim().optional(),
  registration_number: Joi.string().trim().optional(),
  registered_business_address: Joi.string().trim().optional(),
  representative_first_name: Joi.string().trim().optional(),
  representative_last_name: Joi.string().trim().optional(),
  representative_role: Joi.string().trim().optional()
});
