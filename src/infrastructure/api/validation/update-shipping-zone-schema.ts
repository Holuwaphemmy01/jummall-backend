import Joi from "joi";

const shippingZoneStateSchema = Joi.object({
  state_name: Joi.string().trim().required(),
  cities: Joi.array().items(Joi.string().trim().required()).min(1).optional()
});

export const updateShippingZoneSchema = Joi.object({
  name: Joi.string().trim().optional(),
  states: Joi.array().items(shippingZoneStateSchema).min(1).optional()
})
  .min(1)
  .messages({
    "object.min": "At least one shipping zone field must be provided."
  });
