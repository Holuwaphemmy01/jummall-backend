import { Router } from "express";

import type { ListAvailableProductBrandsUseCase } from "../../../application/seller/list-available-product-brands";
import type { ListAvailableProductCategoriesUseCase } from "../../../application/seller/list-available-product-categories";
import type { RegisterSellerUseCase } from "../../../application/seller/register-seller";
import { RegisterSellerError } from "../../../application/seller/register-seller";
import type { UploadProductUseCase } from "../../../application/seller/upload-product";
import { UploadProductError } from "../../../application/seller/upload-product";
import { parseBase64File } from "../files/parse-base64-file";
import type { AuthenticatedUser } from "../middleware/create-auth-middleware";
import { registerSellerSchema } from "../validation/register-seller-schema";
import { uploadProductSchema } from "../validation/upload-product-schema";

interface SellerRouterDependencies {
  registerSeller: RegisterSellerUseCase;
}

interface SellerProductRouterDependencies {
  uploadProduct: UploadProductUseCase;
}

interface SellerBrandRouterDependencies {
  listAvailableProductBrands: ListAvailableProductBrandsUseCase;
}

interface SellerCategoryRouterDependencies {
  listAvailableProductCategories: ListAvailableProductCategoriesUseCase;
}

export default function createSellerRouter({
  registerSeller
}: SellerRouterDependencies) {
  const sellerRouter = Router();

  sellerRouter.post("/register", async (req, res) => {
    const { error, value } = registerSellerSchema.validate(req.body, {
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
      const seller = await registerSeller.execute({
        firstName: value.first_name,
        lastName: value.last_name,
        username: value.username,
        email: value.email,
        phone: value.phone_number,
        password: value.password,
        confirmPassword: value.confirm_password,
        accountType: value.account_type
      });

      return res.status(201).json({
        message: "Seller registered successfully.",
        data: {
          id: seller.id,
          first_name: seller.firstName,
          last_name: seller.lastName,
          username: seller.username,
          email: seller.email,
          phone_number: seller.phone,
          role: seller.role,
          account_status: seller.accountStatus,
          account_type: seller.accountType,
          kyc_status: seller.kycStatus,
          created_at: seller.createdAt.toISOString(),
          updated_at: seller.updatedAt.toISOString()
        }
      });
    } catch (error) {
      if (error instanceof RegisterSellerError) {
        return res.status(error.statusCode).json({
          message: error.message,
          field: error.field
        });
      }

      return res.status(500).json({
        message: "Unable to register seller."
      });
    }
  });

  return sellerRouter;
}

export function createProtectedSellerProductRouter({
  uploadProduct
}: SellerProductRouterDependencies) {
  const sellerProductRouter = Router();

  sellerProductRouter.post("/", async (req, res) => {
    const { error, value } = uploadProductSchema.validate(req.body, {
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
      const product = await uploadProduct.execute({
        sellerId: authUser.sub,
        categoryId: value.category_id,
        brandId: value.brand_id,
        name: value.name,
        description: value.description,
        sku: value.sku,
        price: value.price,
        quantity: value.quantity,
        currency: value.currency,
        condition: value.condition,
        weightKg: value.weight_kg,
        images: value.images.map(
          (image: {
            file_name: string;
            mime_type: string;
            file_base64: string;
          }) => ({
            fileName: image.file_name,
            mimeType: image.mime_type,
            fileContents: parseBase64File(image.file_base64)
          })
        )
      });

      return res.status(201).json({
        message: "Product uploaded successfully and is pending review.",
        data: {
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
        }
      });
    } catch (caughtError) {
      if (caughtError instanceof UploadProductError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message,
          field: caughtError.field
        });
      }

      if (caughtError instanceof Error) {
        return res.status(400).json({
          message: caughtError.message
        });
      }

      return res.status(500).json({
        message: "Unable to upload product."
      });
    }
  });

  return sellerProductRouter;
}

export function createProtectedSellerBrandRouter({
  listAvailableProductBrands
}: SellerBrandRouterDependencies) {
  const sellerBrandRouter = Router();

  sellerBrandRouter.get("/", async (_req, res) => {
    try {
      const brands = await listAvailableProductBrands.execute();

      return res.status(200).json({
        message: "Product brands fetched successfully.",
        data: brands.map((brand) => ({
          id: brand.id,
          name: brand.name,
          description: brand.description,
          created_at: brand.createdAt.toISOString(),
          updated_at: brand.updatedAt.toISOString()
        }))
      });
    } catch {
      return res.status(500).json({
        message: "Unable to fetch product brands."
      });
    }
  });

  return sellerBrandRouter;
}

export function createProtectedSellerCategoryRouter({
  listAvailableProductCategories
}: SellerCategoryRouterDependencies) {
  const sellerCategoryRouter = Router();

  sellerCategoryRouter.get("/", async (_req, res) => {
    try {
      const categories = await listAvailableProductCategories.execute();

      return res.status(200).json({
        message: "Product categories fetched successfully.",
        data: categories.map((category) => ({
          id: category.id,
          name: category.name,
          description: category.description,
          deduction_percentage: category.deductionPercentage,
          created_at: category.createdAt.toISOString(),
          updated_at: category.updatedAt.toISOString()
        }))
      });
    } catch {
      return res.status(500).json({
        message: "Unable to fetch product categories."
      });
    }
  });

  return sellerCategoryRouter;
}
