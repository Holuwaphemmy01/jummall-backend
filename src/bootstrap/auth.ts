import { ForgotPassword } from "../application/auth/forgot-password";
import { InitiateEmailVerification } from "../application/auth/initiate-email-verification";
import { Login } from "../application/auth/login";
import { ResendEmailVerification } from "../application/auth/resend-email-verification";
import { ResetPassword } from "../application/auth/reset-password";
import { VerifyEmail } from "../application/auth/verify-email";
import createAuthRouter from "../infrastructure/api/routes/auth-routes";
import { PostgresAuthenticationRepository } from "../infrastructure/database/repositories/postgres-authentication-repository";
import { PostgresEmailVerificationRepository } from "../infrastructure/database/repositories/postgres-email-verification-repository";
import { PostgresPasswordResetRepository } from "../infrastructure/database/repositories/postgres-password-reset-repository";
import { ResendMailProvider } from "../infrastructure/notification/resend-mail-provider";
import { JwtTokenSigner } from "../infrastructure/security/jwt-token-signer";
import { NumericVerificationCodeGenerator } from "../infrastructure/security/numeric-verification-code-generator";
import { ScryptPasswordHasher } from "../infrastructure/security/scrypt-password-hasher";

export function createAuthModule() {
  const authenticationRepository = new PostgresAuthenticationRepository();
  const emailVerificationRepository = new PostgresEmailVerificationRepository();
  const passwordResetRepository = new PostgresPasswordResetRepository();
  const passwordHasher = new ScryptPasswordHasher();
  const tokenSigner = new JwtTokenSigner();
  const verificationCodeGenerator = new NumericVerificationCodeGenerator();
  const mailProvider = new ResendMailProvider();
  const forgotPassword = new ForgotPassword(
    authenticationRepository,
    passwordResetRepository,
    verificationCodeGenerator,
    mailProvider,
    Number(process.env.PASSWORD_RESET_CODE_TTL_MINUTES ?? 15)
  );
  const initiateEmailVerification = new InitiateEmailVerification(
    emailVerificationRepository,
    verificationCodeGenerator,
    mailProvider,
    Number(process.env.EMAIL_VERIFICATION_CODE_TTL_MINUTES ?? 15)
  );
  const login = new Login(
    authenticationRepository,
    passwordHasher,
    tokenSigner,
    initiateEmailVerification
  );
  const verifyEmail = new VerifyEmail(emailVerificationRepository);
  const resetPassword = new ResetPassword(
    passwordResetRepository,
    authenticationRepository,
    passwordHasher
  );
  const resendEmailVerification = new ResendEmailVerification(
    emailVerificationRepository,
    initiateEmailVerification,
    60 * 1000
  );

  return createAuthRouter({
    forgotPassword,
    login,
    resendEmailVerification,
    resetPassword,
    verifyEmail
  });
}
