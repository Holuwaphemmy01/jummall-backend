import { Login } from "../application/auth/login";
import { VerifyEmail } from "../application/auth/verify-email";
import createAuthRouter from "../infrastructure/api/routes/auth-routes";
import { PostgresAuthenticationRepository } from "../infrastructure/database/repositories/postgres-authentication-repository";
import { PostgresEmailVerificationRepository } from "../infrastructure/database/repositories/postgres-email-verification-repository";
import { JwtTokenSigner } from "../infrastructure/security/jwt-token-signer";
import { ScryptPasswordHasher } from "../infrastructure/security/scrypt-password-hasher";

export function createAuthModule() {
  const authenticationRepository = new PostgresAuthenticationRepository();
  const emailVerificationRepository = new PostgresEmailVerificationRepository();
  const passwordHasher = new ScryptPasswordHasher();
  const tokenSigner = new JwtTokenSigner();
  const login = new Login(
    authenticationRepository,
    passwordHasher,
    tokenSigner
  );
  const verifyEmail = new VerifyEmail(emailVerificationRepository);

  return createAuthRouter({ login, verifyEmail });
}
