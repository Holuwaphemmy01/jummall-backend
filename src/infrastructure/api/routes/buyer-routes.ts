import { Router } from "express";

import type { RegisterBuyerUseCase } from "../../../application/buyer/register-buyer";
import { RegisterBuyerError } from "../../../application/buyer/register-buyer";
import { registerBuyerSchema } from "../validation/register-buyer-schema";

interface BuyerRouterDependencies {
  registerBuyer: RegisterBuyerUseCase;
}

export default function createBuyerRouter({
  registerBuyer
}: BuyerRouterDependencies) {
  const buyerRouter = Router();

  buyerRouter.post("/register", async (req, res) => {
    const { error, value } = registerBuyerSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({
        message: "Validation failed.",
        errors: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message
        }))
      });
    }

    try {
      const buyer = await registerBuyer.execute({
        firstName: value.first_name,
        lastName: value.last_name,
        username: value.username,
        email: value.email,
        password: value.password,
        phone: value.phone,
        passwordConfirmation: value.password_confirmation
      });

      return res.status(201).json({
        message: "Buyer registered successfully.",
        data: {
          id: buyer.id,
          first_name: buyer.firstName,
          last_name: buyer.lastName,
          username: buyer.username,
          email: buyer.email,
          phone: buyer.phone,
          role: buyer.role,
          created_at: buyer.createdAt.toISOString(),
          updated_at: buyer.updatedAt.toISOString()
        }
      });
    } catch (error) {
      if (error instanceof RegisterBuyerError) {
        return res.status(error.statusCode).json({
          message: error.message,
          field: error.field
        });
      }

      return res.status(500).json({
        message: "Unable to register buyer."
      });
    }
  });

  return buyerRouter;
}
