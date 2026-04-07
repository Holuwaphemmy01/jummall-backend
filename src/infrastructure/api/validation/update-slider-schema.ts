import Joi from "joi";
import { sliderImageSchema } from "./slider-image-schema";

export const updateSliderSchema = Joi.object({
  title: Joi.string().trim().min(2).max(120),
  description: Joi.string().trim().min(2).max(500),
  subtitle: Joi.string().trim().min(2).max(160),
  button_label: Joi.string().trim().min(1).max(60),
  background_color: Joi.string().trim().min(3).max(64),
  is_light: Joi.boolean(),
  display_order: Joi.number().integer().min(0),
  image: sliderImageSchema
}).min(1);
