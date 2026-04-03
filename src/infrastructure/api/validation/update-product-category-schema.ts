import Joi from "joi";
import { productCategoryImageSchema } from "./product-category-image-schema";

export const updateProductCategorySchema = Joi.object({
  name: Joi.string().trim().optional(),
  description: Joi.string().trim().optional(),
  deduction_percentage: Joi.number().min(0).max(100).optional(),
  image: productCategoryImageSchema.optional()
}).min(1);
