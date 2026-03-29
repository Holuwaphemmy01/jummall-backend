import { Router } from "express";

import { GetUserProfile } from "../application/user/get-user-profile";
import { createAuthMiddleware } from "../infrastructure/api/middleware/create-auth-middleware";
import createUserRouter from "../infrastructure/api/routes/user-routes";
import { PostgresAuthenticationRepository } from "../infrastructure/database/repositories/postgres-authentication-repository";
import { PostgresSellerKycRepository } from "../infrastructure/database/repositories/postgres-seller-kyc-repository";
import { JwtTokenVerifier } from "../infrastructure/security/jwt-token-verifier";

export function createUserModule() {
  const userRouter = Router();
  const authenticationRepository = new PostgresAuthenticationRepository();
  const sellerKycRepository = new PostgresSellerKycRepository();
  const tokenVerifier = new JwtTokenVerifier();
  const getUserProfile = new GetUserProfile(
    authenticationRepository,
    sellerKycRepository
  );
  const authenticateBuyerOrSeller = createAuthMiddleware(tokenVerifier, [
    "buyer",
    "seller"
  ]);

  userRouter.use(authenticateBuyerOrSeller);
  userRouter.use(
    createUserRouter({
      getUserProfile
    })
  );

  return userRouter;
}
