import { Router } from "express";

import { ApproveSellerKyc } from "../application/admin/approve-seller-kyc";
import { GetCompletedSellerKyc } from "../application/admin/get-completed-seller-kyc";
import { ListCompletedSellerKyc } from "../application/admin/list-completed-seller-kyc";
import { createAuthMiddleware } from "../infrastructure/api/middleware/create-auth-middleware";
import createAdminRouter from "../infrastructure/api/routes/admin-routes";
import { PostgresAdminKycRepository } from "../infrastructure/database/repositories/postgres-admin-kyc-repository";
import { JwtTokenVerifier } from "../infrastructure/security/jwt-token-verifier";

export function createAdminModule() {
  const adminRouter = Router();
  const adminKycRepository = new PostgresAdminKycRepository();
  const tokenVerifier = new JwtTokenVerifier();
  const authenticateAdmin = createAuthMiddleware(tokenVerifier, "admin");
  const approveSellerKyc = new ApproveSellerKyc(adminKycRepository);
  const listCompletedSellerKyc = new ListCompletedSellerKyc(adminKycRepository);
  const getCompletedSellerKyc = new GetCompletedSellerKyc(adminKycRepository);

  adminRouter.use(authenticateAdmin);
  adminRouter.use(
    createAdminRouter({
      approveSellerKyc,
      listCompletedSellerKyc,
      getCompletedSellerKyc
    })
  );

  return adminRouter;
}
