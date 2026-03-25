import { RegisterSeller } from "../application/seller/register-seller";
import createSellerRouter from "../infrastructure/api/routes/seller-routes";
import { PostgresSellerRepository } from "../infrastructure/database/repositories/postgres-seller-repository";
import { ScryptPasswordHasher } from "../infrastructure/security/scrypt-password-hasher";

export function createSellerModule() {
  const sellerRepository = new PostgresSellerRepository();
  const passwordHasher = new ScryptPasswordHasher();
  const registerSeller = new RegisterSeller(sellerRepository, passwordHasher);

  return createSellerRouter({ registerSeller });
}
