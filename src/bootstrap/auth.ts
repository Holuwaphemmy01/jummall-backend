import { Login } from "../application/auth/login";
import createAuthRouter from "../infrastructure/api/routes/auth-routes";
import { PostgresAuthenticationRepository } from "../infrastructure/database/repositories/postgres-authentication-repository";
import { JwtTokenSigner } from "../infrastructure/security/jwt-token-signer";
import { ScryptPasswordHasher } from "../infrastructure/security/scrypt-password-hasher";

export function createAuthModule() {
  const authenticationRepository = new PostgresAuthenticationRepository();
  const passwordHasher = new ScryptPasswordHasher();
  const tokenSigner = new JwtTokenSigner();
  const login = new Login(
    authenticationRepository,
    passwordHasher,
    tokenSigner
  );

  return createAuthRouter({ login });
}
