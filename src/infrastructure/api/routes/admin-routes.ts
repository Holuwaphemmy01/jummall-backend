import { Router } from "express";

import {
  ApproveProductPendingReviewError,
  type ApproveProductPendingReviewUseCase
} from "../../../application/admin/approve-product-pending-review";
import {
  ApproveSellerKycError,
  type ApproveSellerKycUseCase
} from "../../../application/admin/approve-seller-kyc";
import type { CreateProductBrandUseCase } from "../../../application/admin/create-product-brand";
import type { CreateProductCategoryUseCase } from "../../../application/admin/create-product-category";
import type { GetProductBrandUseCase } from "../../../application/admin/get-product-brand";
import {
  GetProductPendingReviewDetailError,
  type GetProductPendingReviewDetailUseCase
} from "../../../application/admin/get-product-pending-review-detail";
import type { GetProductCategoryUseCase } from "../../../application/admin/get-product-category";
import type { GetShippingSettingsUseCase } from "../../../application/admin/get-shipping-settings";
import {
  GetCompletedSellerKycError,
  type GetCompletedSellerKycUseCase
} from "../../../application/admin/get-completed-seller-kyc";
import type { ListCompletedSellerKycUseCase } from "../../../application/admin/list-completed-seller-kyc";
import type { ListProductBrandsUseCase } from "../../../application/admin/list-product-brands";
import type { ListProductsPendingReviewUseCase } from "../../../application/admin/list-products-pending-review";
import type { ListProductCategoriesUseCase } from "../../../application/admin/list-product-categories";
import {
  RejectProductPendingReviewError,
  type RejectProductPendingReviewUseCase
} from "../../../application/admin/reject-product-pending-review";
import { ShippingSettingsError } from "../../../application/admin/shipping-settings-error";
import { ProductBrandError } from "../../../application/admin/product-brand-errors";
import type { UpdateProductBrandUseCase } from "../../../application/admin/update-product-brand";
import type { UpdateProductCategoryUseCase } from "../../../application/admin/update-product-category";
import type { UpdateShippingSettingsUseCase } from "../../../application/admin/update-shipping-settings";
import { approveProductPendingReviewSchema } from "../validation/approve-product-pending-review-schema";
import { createProductBrandSchema } from "../validation/create-product-brand-schema";
import { ProductCategoryError } from "../../../application/admin/product-category-errors";
import { approveSellerKycSchema } from "../validation/approve-seller-kyc-schema";
import { createProductCategorySchema } from "../validation/create-product-category-schema";
import { rejectProductPendingReviewSchema } from "../validation/reject-product-pending-review-schema";
import { updateShippingSettingsSchema } from "../validation/update-shipping-settings-schema";
import { updateProductBrandSchema } from "../validation/update-product-brand-schema";
import { updateProductCategorySchema } from "../validation/update-product-category-schema";

interface AdminRouterDependencies {
  approveProductPendingReview: ApproveProductPendingReviewUseCase;
  approveSellerKyc: ApproveSellerKycUseCase;
  createProductBrand: CreateProductBrandUseCase;
  createProductCategory: CreateProductCategoryUseCase;
  getProductBrand: GetProductBrandUseCase;
  getProductPendingReviewDetail: GetProductPendingReviewDetailUseCase;
  listCompletedSellerKyc: ListCompletedSellerKycUseCase;
  listProductBrands: ListProductBrandsUseCase;
  listProductsPendingReview: ListProductsPendingReviewUseCase;
  listProductCategories: ListProductCategoriesUseCase;
  rejectProductPendingReview: RejectProductPendingReviewUseCase;
  getCompletedSellerKyc: GetCompletedSellerKycUseCase;
  getProductCategory: GetProductCategoryUseCase;
  getShippingSettings: GetShippingSettingsUseCase;
  updateShippingSettings: UpdateShippingSettingsUseCase;
  updateProductBrand: UpdateProductBrandUseCase;
  updateProductCategory: UpdateProductCategoryUseCase;
}

export default function createAdminRouter({
  approveProductPendingReview,
  approveSellerKyc,
  createProductBrand,
  createProductCategory,
  getProductBrand,
  getProductPendingReviewDetail,
  listCompletedSellerKyc,
  listProductBrands,
  listProductsPendingReview,
  listProductCategories,
  rejectProductPendingReview,
  getCompletedSellerKyc,
  getProductCategory,
  getShippingSettings,
  updateShippingSettings,
  updateProductBrand,
  updateProductCategory
}: AdminRouterDependencies) {
  const adminRouter = Router();

  adminRouter.get("/shipping/settings", async (_req, res) => {
    try {
      const settings = await getShippingSettings.execute();

      return res.status(200).json({
        message: "Shipping settings fetched successfully.",
        data: thisShippingSettingsResponse(settings)
      });
    } catch (caughtError) {
      if (caughtError instanceof ShippingSettingsError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message,
          field: caughtError.field
        });
      }

      return res.status(500).json({
        message: "Unable to fetch shipping settings."
      });
    }
  });

  adminRouter.patch("/shipping/settings", async (req, res) => {
    const { error, value } = updateShippingSettingsSchema.validate(req.body, {
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
      const settings = await updateShippingSettings.execute({
        shippingMode: value.shipping_mode,
        categoryShippingMode: value.category_shipping_mode,
        vendorFallbackPolicy: value.vendor_fallback_policy
      });

      return res.status(200).json({
        message: "Shipping settings updated successfully.",
        data: thisShippingSettingsResponse(settings)
      });
    } catch (caughtError) {
      if (caughtError instanceof ShippingSettingsError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message,
          field: caughtError.field
        });
      }

      return res.status(500).json({
        message: "Unable to update shipping settings."
      });
    }
  });

  adminRouter.post("/product-brands", async (req, res) => {
    const { error, value } = createProductBrandSchema.validate(req.body, {
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
      const brand = await createProductBrand.execute({
        name: value.name,
        description: value.description
      });

      return res.status(201).json({
        message: "Product brand created successfully.",
        data: thisBrandResponse(brand)
      });
    } catch (caughtError) {
      if (caughtError instanceof ProductBrandError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message,
          field: caughtError.field
        });
      }

      return res.status(500).json({
        message: "Unable to create product brand."
      });
    }
  });

  adminRouter.get("/product-brands", async (_req, res) => {
    try {
      const brands = await listProductBrands.execute();

      return res.status(200).json({
        message: "Product brands fetched successfully.",
        data: brands.map((brand) => thisBrandResponse(brand))
      });
    } catch {
      return res.status(500).json({
        message: "Unable to fetch product brands."
      });
    }
  });

  adminRouter.get("/product-brands/:brandId", async (req, res) => {
    try {
      const brand = await getProductBrand.execute({
        brandId: req.params.brandId
      });

      return res.status(200).json({
        message: "Product brand fetched successfully.",
        data: thisBrandResponse(brand)
      });
    } catch (caughtError) {
      if (caughtError instanceof ProductBrandError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message
        });
      }

      return res.status(500).json({
        message: "Unable to fetch product brand."
      });
    }
  });

  adminRouter.patch("/product-brands/:brandId", async (req, res) => {
    const { error, value } = updateProductBrandSchema.validate(req.body, {
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
      const brand = await updateProductBrand.execute({
        brandId: req.params.brandId,
        name: value.name,
        description: value.description
      });

      return res.status(200).json({
        message: "Product brand updated successfully.",
        data: thisBrandResponse(brand)
      });
    } catch (caughtError) {
      if (caughtError instanceof ProductBrandError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message,
          field: caughtError.field
        });
      }

      return res.status(500).json({
        message: "Unable to update product brand."
      });
    }
  });

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

  adminRouter.get("/products/pending-review", async (_req, res) => {
    try {
      const productsPendingReview = await listProductsPendingReview.execute();

      return res.status(200).json({
        message: "Products pending review fetched successfully.",
        data: productsPendingReview.map((product) => thisProductResponse(product))
      });
    } catch {
      return res.status(500).json({
        message: "Unable to fetch products pending review."
      });
    }
  });

  adminRouter.get("/products/pending-review/:productId", async (req, res) => {
    try {
      const product = await getProductPendingReviewDetail.execute({
        productId: req.params.productId
      });

      return res.status(200).json({
        message: "Product pending review fetched successfully.",
        data: thisProductResponse(product)
      });
    } catch (caughtError) {
      if (caughtError instanceof GetProductPendingReviewDetailError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message
        });
      }

      return res.status(500).json({
        message: "Unable to fetch product pending review."
      });
    }
  });

  adminRouter.post("/products/:productId/approve", async (req, res) => {
    const { error, value } = approveProductPendingReviewSchema.validate(
      req.body,
      {
        abortEarly: false,
        stripUnknown: true
      }
    );

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
      const approvedProduct = await approveProductPendingReview.execute({
        productId: req.params.productId,
        reviewNote: value.review_note
      });

      return res.status(200).json({
        message: "Product approved successfully.",
        data: thisProductResponse(approvedProduct)
      });
    } catch (caughtError) {
      if (caughtError instanceof ApproveProductPendingReviewError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message
        });
      }

      return res.status(500).json({
        message: "Unable to approve product pending review."
      });
    }
  });

  adminRouter.post("/products/:productId/reject", async (req, res) => {
    const { error, value } = rejectProductPendingReviewSchema.validate(req.body, {
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
      const rejectedProduct = await rejectProductPendingReview.execute({
        productId: req.params.productId,
        reviewNote: value.review_note
      });

      return res.status(200).json({
        message: "Product rejected successfully.",
        data: thisProductResponse(rejectedProduct)
      });
    } catch (caughtError) {
      if (caughtError instanceof RejectProductPendingReviewError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message
        });
      }

      return res.status(500).json({
        message: "Unable to reject product pending review."
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

function thisBrandResponse(brand: {
  id: string;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: brand.id,
    name: brand.name,
    description: brand.description,
    created_at: brand.createdAt.toISOString(),
    updated_at: brand.updatedAt.toISOString()
  };
}

function thisShippingSettingsResponse(settings: {
  id: string;
  shippingMode: string;
  categoryShippingMode: string;
  vendorFallbackPolicy: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: settings.id,
    shipping_mode: settings.shippingMode,
    category_shipping_mode: settings.categoryShippingMode,
    vendor_fallback_policy: settings.vendorFallbackPolicy,
    created_at: settings.createdAt.toISOString(),
    updated_at: settings.updatedAt.toISOString()
  };
}

function thisProductResponse(product: {
  id: string;
  sellerId: string;
  categoryId: string;
  brandId: string | null;
  brandName: string | null;
  name: string;
  description: string;
  sku: string | null;
  price: number;
  quantity: number;
  currency: string;
  condition: string;
  weightKg: number;
  status: string;
  reviewNote: string | null;
  reviewedAt: Date | null;
  images: Array<{
    id: string;
    storagePath: string;
    mimeType: string;
    originalFileName: string;
    position: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: product.id,
    seller_id: product.sellerId,
    category_id: product.categoryId,
    brand_id: product.brandId,
    brand_name: product.brandName,
    name: product.name,
    description: product.description,
    sku: product.sku,
    price: product.price,
    quantity: product.quantity,
    currency: product.currency,
    condition: product.condition,
    weight_kg: product.weightKg,
    status: product.status,
    review_note: product.reviewNote,
    reviewed_at: product.reviewedAt?.toISOString() ?? null,
    images: product.images.map((image) => ({
      id: image.id,
      storage_path: image.storagePath,
      mime_type: image.mimeType,
      original_file_name: image.originalFileName,
      position: image.position,
      created_at: image.createdAt.toISOString(),
      updated_at: image.updatedAt.toISOString()
    })),
    created_at: product.createdAt.toISOString(),
    updated_at: product.updatedAt.toISOString()
  };
}
