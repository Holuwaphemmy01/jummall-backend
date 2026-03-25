import { InitiateEmailVerification } from "../application/auth/initiate-email-verification";
import { RegisterBuyer } from "../application/buyer/register-buyer";
import { SendWelcomeEmail } from "../application/notification/send-welcome-email";
import createBuyerRouter from "../infrastructure/api/routes/buyer-routes";
import { PostgresBuyerRepository } from "../infrastructure/database/repositories/postgres-buyer-repository";
import { PostgresEmailVerificationRepository } from "../infrastructure/database/repositories/postgres-email-verification-repository";
import { ResendMailProvider } from "../infrastructure/notification/resend-mail-provider";
import { NumericVerificationCodeGenerator } from "../infrastructure/security/numeric-verification-code-generator";
import { ScryptPasswordHasher } from "../infrastructure/security/scrypt-password-hasher";

export function createBuyerModule() {
  const buyerRepository = new PostgresBuyerRepository();
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
  const registerBuyer = new RegisterBuyer(
    buyerRepository,
    passwordHasher,
    initiateEmailVerification,
    sendWelcomeEmail
  );

  return createBuyerRouter({ registerBuyer });
}
