import { InitiateEmailVerification } from "../application/auth/initiate-email-verification";
import { SendWelcomeEmail } from "../application/notification/send-welcome-email";
import { RegisterSeller } from "../application/seller/register-seller";
import createSellerRouter from "../infrastructure/api/routes/seller-routes";
import { PostgresEmailVerificationRepository } from "../infrastructure/database/repositories/postgres-email-verification-repository";
import { PostgresSellerRepository } from "../infrastructure/database/repositories/postgres-seller-repository";
import { ResendMailProvider } from "../infrastructure/notification/resend-mail-provider";
import { NumericVerificationCodeGenerator } from "../infrastructure/security/numeric-verification-code-generator";
import { ScryptPasswordHasher } from "../infrastructure/security/scrypt-password-hasher";

export function createSellerModule() {
  const sellerRepository = new PostgresSellerRepository();
  const emailVerificationRepository = new PostgresEmailVerificationRepository();
  const passwordHasher = new ScryptPasswordHasher();
  const verificationCodeGenerator = new NumericVerificationCodeGenerator();
  const mailProvider = new ResendMailProvider();
  const sendWelcomeEmail = new SendWelcomeEmail(mailProvider);
  const initiateEmailVerification = new InitiateEmailVerification(
    emailVerificationRepository,
    verificationCodeGenerator,
    mailProvider,
    Number(process.env.EMAIL_VERIFICATION_CODE_TTL_MINUTES ?? 15)
  );
  const registerSeller = new RegisterSeller(
    sellerRepository,
    passwordHasher,
    initiateEmailVerification,
    sendWelcomeEmail
  );

  return createSellerRouter({ registerSeller });
}
