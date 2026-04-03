import Joi from "joi";

export const productCategoryImageSchema = Joi.object({
  file_name: Joi.string().trim().required(),
  mime_type: Joi.string()
    .valid("image/jpeg", "image/png", "image/webp")
    .required(),
  file_base64: Joi.string().trim().required()
});
