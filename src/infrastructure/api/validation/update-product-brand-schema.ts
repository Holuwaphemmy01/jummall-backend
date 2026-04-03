import Joi from "joi";
import { productBrandImageSchema } from "./product-brand-image-schema";

export const updateProductBrandSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).optional(),
  description: Joi.string().trim().min(2).max(500).optional(),
  image: productBrandImageSchema.optional()
}).min(1);
