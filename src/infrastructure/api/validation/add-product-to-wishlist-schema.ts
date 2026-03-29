import Joi from "joi";

export const addProductToWishlistSchema = Joi.object({
  product_id: Joi.string().trim().required()
});
