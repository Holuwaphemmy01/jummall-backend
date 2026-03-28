import { Router } from "express";

import type { ForgotPasswordUseCase } from "../../../application/auth/forgot-password";
import type { LoginUseCase } from "../../../application/auth/login";
import { LoginError } from "../../../application/auth/login";
import type { ResendEmailVerificationUseCase } from "../../../application/auth/resend-email-verification";
import { ResendEmailVerificationError } from "../../../application/auth/resend-email-verification";
import type { ResetPasswordUseCase } from "../../../application/auth/reset-password";
import { ResetPasswordError } from "../../../application/auth/reset-password";
import type { VerifyEmailUseCase } from "../../../application/auth/verify-email";
import { VerifyEmailError } from "../../../application/auth/verify-email";
import { createRateLimiter } from "../middleware/create-rate-limiter";
import { forgotPasswordSchema } from "../validation/forgot-password-schema";
import { loginSchema } from "../validation/login-schema";
import { resendEmailVerificationSchema } from "../validation/resend-email-verification-schema";
import { resetPasswordSchema } from "../validation/reset-password-schema";
import { verifyEmailSchema } from "../validation/verify-email-schema";

interface AuthRouterDependencies {
  forgotPassword: ForgotPasswordUseCase;
  login: LoginUseCase;
  resendEmailVerification: ResendEmailVerificationUseCase;
  resetPassword: ResetPasswordUseCase;
  verifyEmail: VerifyEmailUseCase;
}

export default function createAuthRouter({
  forgotPassword,
  login,
  resendEmailVerification,
  resetPassword,
  verifyEmail
}: AuthRouterDependencies) {
  const authRouter = Router();
  const forgotPasswordRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    message: "Too many password reset requests. Please try again later."
  });
  const loginRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    message: "Too many login attempts. Please try again later."
  });
  const resetPasswordRateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 5,
    message: "Too many password reset attempts. Please try again later."
  });

  authRouter.post("/forgot-password", forgotPasswordRateLimiter, async (req, res) => {
    const { error, value } = forgotPasswordSchema.validate(req.body, {
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
      await forgotPassword.execute({
        email: value.email
      });

      return res.status(200).json({
        message:
          "If an account with that email exists, a password reset code has been sent."
      });
    } catch {
      return res.status(500).json({
        message: "Unable to initiate password reset."
      });
    }
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

  authRouter.post("/resend-verification-email", async (req, res) => {
    const { error, value } = resendEmailVerificationSchema.validate(req.body, {
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
      const result = await resendEmailVerification.execute({
        email: value.email
      });

      return res.status(200).json({
        message: "Verification email resent successfully.",
        data: {
          email: result.email
        }
      });
    } catch (caughtError) {
      if (caughtError instanceof ResendEmailVerificationError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message,
          field: caughtError.field
        });
      }

      return res.status(500).json({
        message: "Unable to resend verification email."
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

  authRouter.post("/reset-password", resetPasswordRateLimiter, async (req, res) => {
    const { error, value } = resetPasswordSchema.validate(req.body, {
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
      await resetPassword.execute({
        email: value.email,
        code: value.code,
        password: value.password,
        confirmPassword: value.confirm_password
      });

      return res.status(200).json({
        message: "Password reset successful."
      });
    } catch (caughtError) {
      if (caughtError instanceof ResetPasswordError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message,
          field: caughtError.field
        });
      }

      return res.status(500).json({
        message: "Unable to reset password."
      });
    }
  });

  return authRouter;
}
