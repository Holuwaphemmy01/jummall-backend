import { Router } from "express";

import {
  ApproveSellerKycError,
  type ApproveSellerKycUseCase
} from "../../../application/admin/approve-seller-kyc";
import {
  GetProductCategoryUseCase
} from "../../../application/admin/get-product-category";
import {
  GetCompletedSellerKycError,
  type GetCompletedSellerKycUseCase
} from "../../../application/admin/get-completed-seller-kyc";
import type { CreateProductCategoryUseCase } from "../../../application/admin/create-product-category";
import type { ListCompletedSellerKycUseCase } from "../../../application/admin/list-completed-seller-kyc";
import type { ListProductCategoriesUseCase } from "../../../application/admin/list-product-categories";
import type { UpdateProductCategoryUseCase } from "../../../application/admin/update-product-category";
import { ProductCategoryError } from "../../../application/admin/product-category-errors";
import { approveSellerKycSchema } from "../validation/approve-seller-kyc-schema";
import { createProductCategorySchema } from "../validation/create-product-category-schema";
import { updateProductCategorySchema } from "../validation/update-product-category-schema";

interface AdminRouterDependencies {
  approveSellerKyc: ApproveSellerKycUseCase;
  createProductCategory: CreateProductCategoryUseCase;
  listCompletedSellerKyc: ListCompletedSellerKycUseCase;
  listProductCategories: ListProductCategoriesUseCase;
  getCompletedSellerKyc: GetCompletedSellerKycUseCase;
  getProductCategory: GetProductCategoryUseCase;
  updateProductCategory: UpdateProductCategoryUseCase;
}

export default function createAdminRouter({
  approveSellerKyc,
  createProductCategory,
  listCompletedSellerKyc,
  listProductCategories,
  getCompletedSellerKyc,
  getProductCategory,
  updateProductCategory
}: AdminRouterDependencies) {
  const adminRouter = Router();

  adminRouter.post("/product-categories", async (req, res) => {
    const { error, value } = createProductCategorySchema.validate(req.body, {
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

    try {
      const category = await createProductCategory.execute({
        name: value.name,
        description: value.description,
        deductionPercentage: value.deduction_percentage
      });

      return res.status(201).json({
        message: "Product category created successfully.",
        data: thisCategoryResponse(category)
      });
    } catch (caughtError) {
      if (caughtError instanceof ProductCategoryError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message,
          field: caughtError.field
        });
      }

      return res.status(500).json({
        message: "Unable to create product category."
      });
    }
  });

  adminRouter.get("/product-categories", async (_req, res) => {
    try {
      const categories = await listProductCategories.execute();

      return res.status(200).json({
        message: "Product categories fetched successfully.",
        data: categories.map((category) => thisCategoryResponse(category))
      });
    } catch {
      return res.status(500).json({
        message: "Unable to fetch product categories."
      });
    }
  });

  adminRouter.get("/product-categories/:categoryId", async (req, res) => {
    try {
      const category = await getProductCategory.execute({
        categoryId: req.params.categoryId
      });

      return res.status(200).json({
        message: "Product category fetched successfully.",
        data: thisCategoryResponse(category)
      });
    } catch (caughtError) {
      if (caughtError instanceof ProductCategoryError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message
        });
      }

      return res.status(500).json({
        message: "Unable to fetch product category."
      });
    }
  });

  adminRouter.patch("/product-categories/:categoryId", async (req, res) => {
    const { error, value } = updateProductCategorySchema.validate(req.body, {
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

    try {
      const category = await updateProductCategory.execute({
        categoryId: req.params.categoryId,
        name: value.name,
        description: value.description,
        deductionPercentage: value.deduction_percentage
      });

      return res.status(200).json({
        message: "Product category updated successfully.",
        data: thisCategoryResponse(category)
      });
    } catch (caughtError) {
      if (caughtError instanceof ProductCategoryError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message,
          field: caughtError.field
        });
      }

      return res.status(500).json({
        message: "Unable to update product category."
      });
    }
  });

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

  adminRouter.post("/kyc/:kycId/approve", async (req, res) => {
    const { error, value } = approveSellerKycSchema.validate(req.body, {
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

    try {
      const approvedSubmission = await approveSellerKyc.execute({
        kycId: req.params.kycId,
        reviewNote: value.review_note
      });

      return res.status(200).json({
        message: "Seller KYC approved successfully.",
        data: {
          id: approvedSubmission.id,
          status: approvedSubmission.status,
          reviewed_at: approvedSubmission.reviewedAt?.toISOString() ?? null,
          review_note: approvedSubmission.reviewNote
        }
      });
    } catch (caughtError) {
      if (caughtError instanceof ApproveSellerKycError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message
        });
      }

      return res.status(500).json({
        message: "Unable to approve seller KYC submission."
      });
    }
  });

  return adminRouter;
}

function thisCategoryResponse(category: {
  id: string;
  name: string;
  description: string;
  deductionPercentage: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: category.id,
    name: category.name,
    description: category.description,
    deduction_percentage: category.deductionPercentage,
    created_at: category.createdAt.toISOString(),
    updated_at: category.updatedAt.toISOString()
  };
}
