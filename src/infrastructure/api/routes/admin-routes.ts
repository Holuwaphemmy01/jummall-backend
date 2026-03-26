import { Router } from "express";

import {
  GetCompletedSellerKycError,
  type GetCompletedSellerKycUseCase
} from "../../../application/admin/get-completed-seller-kyc";
import type { ListCompletedSellerKycUseCase } from "../../../application/admin/list-completed-seller-kyc";

interface AdminRouterDependencies {
  listCompletedSellerKyc: ListCompletedSellerKycUseCase;
  getCompletedSellerKyc: GetCompletedSellerKycUseCase;
}

export default function createAdminRouter({
  listCompletedSellerKyc,
  getCompletedSellerKyc
}: AdminRouterDependencies) {
  const adminRouter = Router();

  adminRouter.get("/kyc", async (_req, res) => {
    try {
      const kycSubmissions = await listCompletedSellerKyc.execute();

      return res.status(200).json({
        message: "Completed seller KYC submissions fetched successfully.",
        data: kycSubmissions.map((submission) => ({
          id: submission.id,
          user_id: submission.userId,
          seller: {
            first_name: submission.sellerFirstName,
            last_name: submission.sellerLastName,
            username: submission.sellerUsername,
            email: submission.sellerEmail,
            phone: submission.sellerPhone
          },
          account_type: submission.accountType,
          status: submission.status,
          submitted_at: submission.submittedAt?.toISOString() ?? null,
          reviewed_at: submission.reviewedAt?.toISOString() ?? null,
          created_at: submission.createdAt.toISOString(),
          updated_at: submission.updatedAt.toISOString()
        }))
      });
    } catch {
      return res.status(500).json({
        message: "Unable to fetch completed seller KYC submissions."
      });
    }
  });

  adminRouter.get("/kyc/:kycId", async (req, res) => {
    try {
      const submission = await getCompletedSellerKyc.execute({
        kycId: req.params.kycId
      });

      return res.status(200).json({
        message: "Seller KYC submission fetched successfully.",
        data: {
          id: submission.id,
          user_id: submission.userId,
          seller: {
            first_name: submission.sellerFirstName,
            last_name: submission.sellerLastName,
            username: submission.sellerUsername,
            email: submission.sellerEmail,
            phone: submission.sellerPhone
          },
          account_type: submission.accountType,
          status: submission.status,
          email: submission.email,
          phone: submission.phone,
          address: submission.address,
          city: submission.city,
          state: submission.state,
          country: submission.country,
          bank_name: submission.bankName,
          bank_account_number: submission.bankAccountNumber,
          bank_account_name: submission.bankAccountName,
          full_name: submission.fullName,
          date_of_birth: submission.dateOfBirth?.toISOString() ?? null,
          gender: submission.gender,
          id_type: submission.idType,
          id_number: submission.idNumber,
          business_name: submission.businessName,
          registration_number: submission.registrationNumber,
          registered_business_address: submission.registeredBusinessAddress,
          representative_first_name: submission.representativeFirstName,
          representative_last_name: submission.representativeLastName,
          representative_role: submission.representativeRole,
          review_note: submission.reviewNote,
          submitted_at: submission.submittedAt?.toISOString() ?? null,
          reviewed_at: submission.reviewedAt?.toISOString() ?? null,
          created_at: submission.createdAt.toISOString(),
          updated_at: submission.updatedAt.toISOString(),
          documents: submission.documents.map((document) => ({
            id: document.id,
            document_type: document.documentType,
            storage_path: document.storagePath,
            mime_type: document.mimeType,
            original_file_name: document.originalFileName,
            created_at: document.createdAt.toISOString(),
            updated_at: document.updatedAt.toISOString()
          }))
        }
      });
    } catch (caughtError) {
      if (caughtError instanceof GetCompletedSellerKycError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message
        });
      }

      return res.status(500).json({
        message: "Unable to fetch seller KYC submission."
      });
    }
  });

  return adminRouter;
}
