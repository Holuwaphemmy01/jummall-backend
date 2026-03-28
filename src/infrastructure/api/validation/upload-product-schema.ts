import Joi from "joi";

const productImageSchema = Joi.object({
  file_name: Joi.string().trim().required(),
  mime_type: Joi.string()
    .valid("image/jpeg", "image/png", "image/webp")
    .required(),
  file_base64: Joi.string().trim().required()
});

export const uploadProductSchema = Joi.object({
  category_id: Joi.string().trim().required(),
  name: Joi.string().trim().min(2).max(150).required(),
  description: Joi.string().trim().min(10).max(5000).required(),
  sku: Joi.string().trim().max(100).optional(),
  price: Joi.number().positive().required(),
  quantity: Joi.number().integer().min(0).required(),
  currency: Joi.string().trim().uppercase().length(3).required(),
  condition: Joi.string().trim().min(2).max(50).required(),
  brand: Joi.string().trim().max(100).optional(),
  weight_kg: Joi.number().positive().required(),
  images: Joi.array().items(productImageSchema).min(1).required()
});
