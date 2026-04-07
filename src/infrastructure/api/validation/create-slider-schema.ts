import Joi from "joi";
import { sliderImageSchema } from "./slider-image-schema";

export const createSliderSchema = Joi.object({
  title: Joi.string().trim().min(2).max(120).required(),
  description: Joi.string().trim().min(2).max(500).required(),
  subtitle: Joi.string().trim().min(2).max(160).required(),
  button_label: Joi.string().trim().min(1).max(60).required(),
  background_color: Joi.string().trim().min(3).max(64).required(),
  is_light: Joi.boolean().required(),
  display_order: Joi.number().integer().min(0).required(),
  image: sliderImageSchema.required()
});
