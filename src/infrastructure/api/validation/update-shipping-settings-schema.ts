import Joi from "joi";

export const updateShippingSettingsSchema = Joi.object({
  shipping_mode: Joi.string().valid("PLATFORM", "VENDOR"),
  category_shipping_mode: Joi.string().valid("HIGHEST", "ADDITIVE"),
  vendor_fallback_policy: Joi.string().valid(
    "USE_PLATFORM_RULES",
    "BLOCK_CHECKOUT"
  )
})
  .min(1)
  .messages({
    "object.min": "At least one shipping setting must be provided."
  });
