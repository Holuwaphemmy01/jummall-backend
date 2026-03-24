import { RegisterBuyer } from "../application/buyer/register-buyer";
import createBuyerRouter from "../infrastructure/api/routes/buyer-routes";
import { PostgresBuyerRepository } from "../infrastructure/database/repositories/postgres-buyer-repository";
import { ScryptPasswordHasher } from "../infrastructure/security/scrypt-password-hasher";

export function createBuyerModule() {
  const buyerRepository = new PostgresBuyerRepository();
  const passwordHasher = new ScryptPasswordHasher();
  const registerBuyer = new RegisterBuyer(buyerRepository, passwordHasher);

  return createBuyerRouter({ registerBuyer });
}
