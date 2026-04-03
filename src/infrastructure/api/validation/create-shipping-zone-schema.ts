import Joi from "joi";

const shippingZoneStateSchema = Joi.object({
  state_name: Joi.string().trim().required(),
  cities: Joi.array().items(Joi.string().trim().required()).min(1).optional()
});

export const createShippingZoneSchema = Joi.object({
  name: Joi.string().trim().required(),
  states: Joi.array().items(shippingZoneStateSchema).min(1).required()
});
