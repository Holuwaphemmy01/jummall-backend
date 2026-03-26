import { Router } from "express";

import type { SaveSellerKycDraftUseCase } from "../../../application/seller-kyc/save-seller-kyc-draft";
import type { SubmitSellerKycUseCase } from "../../../application/seller-kyc/submit-seller-kyc";
import type { UploadSellerKycDocumentUseCase } from "../../../application/seller-kyc/upload-seller-kyc-document";
import { SellerKycError } from "../../../application/seller-kyc/seller-kyc-errors";
import { parseBase64File } from "../files/parse-base64-file";
import type { AuthenticatedUser } from "../middleware/create-auth-middleware";
import { saveSellerKycSchema } from "../validation/save-seller-kyc-schema";
import { submitSellerKycSchema } from "../validation/submit-seller-kyc-schema";
import { uploadSellerKycDocumentSchema } from "../validation/upload-seller-kyc-document-schema";

interface SellerKycRouterDependencies {
  saveSellerKycDraft: SaveSellerKycDraftUseCase;
  uploadSellerKycDocument: UploadSellerKycDocumentUseCase;
  submitSellerKyc: SubmitSellerKycUseCase;
}

export default function createSellerKycRouter({
  saveSellerKycDraft,
  uploadSellerKycDocument,
  submitSellerKyc
}: SellerKycRouterDependencies) {
  const sellerKycRouter = Router();

  sellerKycRouter.put("/", async (req, res) => {
    const { error, value } = saveSellerKycSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({
        message: "Validation failed.",
        errors: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message
        }))
      });
    }

    const authUser = res.locals.authUser as AuthenticatedUser;

    try {
      const kyc = await saveSellerKycDraft.execute({
        userId: authUser.sub,
        accountType: value.account_type,
        email: value.email,
        phone: value.phone_number,
        address: value.address,
        city: value.city,
        state: value.state,
        country: value.country,
        bankName: value.bank_name,
        bankAccountNumber: value.bank_account_number,
        bankAccountName: value.bank_account_name,
        fullName: value.full_name,
        dateOfBirth: value.date_of_birth,
        gender: value.gender,
        idType: value.id_type,
        idNumber: value.id_number,
        businessName: value.business_name,
        registrationNumber: value.registration_number,
        registeredBusinessAddress: value.registered_business_address,
        representativeFirstName: value.representative_first_name,
        representativeLastName: value.representative_last_name,
        representativeRole: value.representative_role
      });

      return res.status(200).json({
        message: "Seller KYC draft saved successfully.",
        data: {
          id: kyc.id,
          account_type: kyc.accountType,
          status: kyc.status,
          email: kyc.email,
          phone_number: kyc.phone,
          address: kyc.address,
          city: kyc.city,
          state: kyc.state,
          country: kyc.country,
          bank_name: kyc.bankName,
          bank_account_number: kyc.bankAccountNumber,
          bank_account_name: kyc.bankAccountName,
          full_name: kyc.fullName,
          date_of_birth: kyc.dateOfBirth?.toISOString() ?? null,
          gender: kyc.gender,
          id_type: kyc.idType,
          id_number: kyc.idNumber,
          business_name: kyc.businessName,
          registration_number: kyc.registrationNumber,
          registered_business_address: kyc.registeredBusinessAddress,
          representative_first_name: kyc.representativeFirstName,
          representative_last_name: kyc.representativeLastName,
          representative_role: kyc.representativeRole,
          documents: kyc.documents.map((document) => ({
            id: document.id,
            document_type: document.documentType,
            mime_type: document.mimeType,
            original_file_name: document.originalFileName,
            storage_path: document.storagePath
          }))
        }
      });
    } catch (caughtError) {
      if (caughtError instanceof SellerKycError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message,
          errors: caughtError.details
        });
      }

      return res.status(500).json({
        message: "Unable to save seller KYC draft."
      });
    }
  });

  sellerKycRouter.post("/documents", async (req, res) => {
    const { error, value } = uploadSellerKycDocumentSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({
        message: "Validation failed.",
        errors: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message
        }))
      });
    }

    const authUser = res.locals.authUser as AuthenticatedUser;

    try {
      const document = await uploadSellerKycDocument.execute({
        userId: authUser.sub,
        documentType: value.document_type,
        fileName: value.file_name,
        mimeType: value.mime_type,
        fileContents: parseBase64File(value.file_base64)
      });

      return res.status(201).json({
        message: "Seller KYC document uploaded successfully.",
        data: {
          id: document.id,
          document_type: document.documentType,
          mime_type: document.mimeType,
          original_file_name: document.originalFileName,
          storage_path: document.storagePath,
          created_at: document.createdAt.toISOString(),
          updated_at: document.updatedAt.toISOString()
        }
      });
    } catch (caughtError) {
      if (caughtError instanceof SellerKycError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message,
          errors: caughtError.details
        });
      }

      if (caughtError instanceof Error) {
        return res.status(400).json({
          message: caughtError.message
        });
      }

      return res.status(500).json({
        message: "Unable to upload seller KYC document."
      });
    }
  });

  sellerKycRouter.post("/submit", async (req, res) => {
    const { error } = submitSellerKycSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return res.status(400).json({
        message: "Validation failed.",
        errors: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message
        }))
      });
    }

    const authUser = res.locals.authUser as AuthenticatedUser;

    try {
      const result = await submitSellerKyc.execute({
        userId: authUser.sub
      });

      return res.status(200).json({
        message: "Seller KYC submitted successfully.",
        data: {
          id: result.id,
          status: result.status,
          submitted_at: result.submittedAt.toISOString()
        }
      });
    } catch (caughtError) {
      if (caughtError instanceof SellerKycError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message,
          errors: caughtError.details
        });
      }

      return res.status(500).json({
        message: "Unable to submit seller KYC."
      });
    }
  });

  return sellerKycRouter;
}
