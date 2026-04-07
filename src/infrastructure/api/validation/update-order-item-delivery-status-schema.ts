import Joi from "joi";

export const updateOrderItemDeliveryStatusSchema = Joi.object({
  delivery_status: Joi.string()
    .valid("shipped", "delivered", "delivery_failed")
    .required(),
  delivery_failure_reason: Joi.alternatives()
    .conditional("delivery_status", {
      is: "delivery_failed",
      then: Joi.string().trim().min(1).max(500).required(),
      otherwise: Joi.valid(null).optional()
    })
    .optional()
});
