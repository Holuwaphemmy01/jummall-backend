import { Router } from "express";

import type { LoginUseCase } from "../../../application/auth/login";
import { LoginError } from "../../../application/auth/login";
import { loginSchema } from "../validation/login-schema";

interface AuthRouterDependencies {
  login: LoginUseCase;
}

export default function createAuthRouter({ login }: AuthRouterDependencies) {
  const authRouter = Router();

  authRouter.post("/login", async (req, res) => {
    const { error, value } = loginSchema.validate(req.body, {
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
      const result = await login.execute({
        email: value.email,
        password: value.password
      });

      return res.status(200).json({
        message: "Login successful.",
        data: {
          access_token: result.accessToken,
          user: {
            id: result.user.id,
            first_name: result.user.firstName,
            last_name: result.user.lastName,
            username: result.user.username,
            email: result.user.email,
            phone: result.user.phone,
            role: result.user.role,
            created_at: result.user.createdAt.toISOString(),
            updated_at: result.user.updatedAt.toISOString()
          }
        }
      });
    } catch (caughtError) {
      if (caughtError instanceof LoginError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message
        });
      }

      return res.status(500).json({
        message: "Unable to login."
      });
    }
  });

  return authRouter;
}
