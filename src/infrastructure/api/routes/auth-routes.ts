import { Router } from "express";

import type { LoginUseCase } from "../../../application/auth/login";
import { LoginError } from "../../../application/auth/login";
import type { VerifyEmailUseCase } from "../../../application/auth/verify-email";
import { VerifyEmailError } from "../../../application/auth/verify-email";
import { createRateLimiter } from "../middleware/create-rate-limiter";
import { loginSchema } from "../validation/login-schema";
import { verifyEmailSchema } from "../validation/verify-email-schema";

interface AuthRouterDependencies {
  login: LoginUseCase;
  verifyEmail: VerifyEmailUseCase;
}

export default function createAuthRouter({
  login,
  verifyEmail
}: AuthRouterDependencies) {
  const authRouter = Router();
  const loginRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    message: "Too many login attempts. Please try again later."
  });

  authRouter.post("/verify-email", async (req, res) => {
    const { error, value } = verifyEmailSchema.validate(req.body, {
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
      const result = await verifyEmail.execute({
        email: value.email,
        code: value.code
      });

      return res.status(200).json({
        message: "Email verified successfully.",
        data: {
          email: result.email,
          account_status: result.accountStatus
        }
      });
    } catch (caughtError) {
      if (caughtError instanceof VerifyEmailError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message,
          field: caughtError.field
        });
      }

      return res.status(500).json({
        message: "Unable to verify email."
      });
    }
  });

  authRouter.post("/login", loginRateLimiter, async (req, res) => {
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
            account_status: result.user.accountStatus,
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
