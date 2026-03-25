import { Router } from "express";

import type { RegisterSellerUseCase } from "../../../application/seller/register-seller";
import { RegisterSellerError } from "../../../application/seller/register-seller";
import { registerSellerSchema } from "../validation/register-seller-schema";

interface SellerRouterDependencies {
  registerSeller: RegisterSellerUseCase;
}

export default function createSellerRouter({
  registerSeller
}: SellerRouterDependencies) {
  const sellerRouter = Router();

  sellerRouter.post("/register", async (req, res) => {
    const { error, value } = registerSellerSchema.validate(req.body, {
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
      const seller = await registerSeller.execute({
        firstName: value.first_name,
        lastName: value.last_name,
        email: value.email,
        phone: value.phone_number,
        password: value.password,
        confirmPassword: value.confirm_password,
        accountType: value.account_type
      });

      return res.status(201).json({
        message: "Seller registered successfully.",
        data: {
          id: seller.id,
          first_name: seller.firstName,
          last_name: seller.lastName,
          email: seller.email,
          phone_number: seller.phone,
          role: seller.role,
          account_type: seller.accountType,
          kyc_status: seller.kycStatus,
          created_at: seller.createdAt.toISOString(),
          updated_at: seller.updatedAt.toISOString()
        }
      });
    } catch (error) {
      if (error instanceof RegisterSellerError) {
        return res.status(error.statusCode).json({
          message: error.message,
          field: error.field
        });
      }

      return res.status(500).json({
        message: "Unable to register seller."
      });
    }
  });

  return sellerRouter;
}
