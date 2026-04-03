import Joi from "joi";
import { productBrandImageSchema } from "./product-brand-image-schema";

export const createProductBrandSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  description: Joi.string().trim().min(2).max(500).required(),
  image: productBrandImageSchema.required()
});
