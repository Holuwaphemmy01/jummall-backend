import Joi from "joi";
import { productCategoryImageSchema } from "./product-category-image-schema";

export const createProductCategorySchema = Joi.object({
  name: Joi.string().trim().required(),
  description: Joi.string().trim().required(),
  deduction_percentage: Joi.number().min(0).max(100).required(),
  image: productCategoryImageSchema.required()
});
