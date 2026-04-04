import { Router } from "express";

import type { CreateSellerCategoryShippingRuleUseCase } from "../../../application/seller/create-category-shipping-rule";
import type { CreateSellerShippingZoneUseCase } from "../../../application/seller/create-shipping-zone";
import type { CreateSellerShippingZoneRuleUseCase } from "../../../application/seller/create-shipping-zone-rule";
import type { GetSellerCategoryShippingRuleUseCase } from "../../../application/seller/get-category-shipping-rule";
import type { GetSellerShippingZoneUseCase } from "../../../application/seller/get-shipping-zone";
import type { GetSellerShippingZoneRuleUseCase } from "../../../application/seller/get-shipping-zone-rule";
import type { ListAvailableProductBrandsUseCase } from "../../../application/seller/list-available-product-brands";
import type { ListAvailableProductCategoriesUseCase } from "../../../application/seller/list-available-product-categories";
import type { ListSellerCategoryShippingRulesUseCase } from "../../../application/seller/list-category-shipping-rules";
import type { ListSellerProductsUseCase } from "../../../application/seller/list-seller-products";
import { ListSellerProductsError } from "../../../application/seller/list-seller-products";
import type { ListSellerShippingZoneRulesUseCase } from "../../../application/seller/list-shipping-zone-rules";
import type { ListSellerShippingZonesUseCase } from "../../../application/seller/list-shipping-zones";
import type { RegisterSellerUseCase } from "../../../application/seller/register-seller";
import { RegisterSellerError } from "../../../application/seller/register-seller";
import type { SetSellerCategoryShippingRuleStatusUseCase } from "../../../application/seller/set-category-shipping-rule-status";
import type { SetSellerShippingZoneStatusUseCase } from "../../../application/seller/set-shipping-zone-status";
import type { SetSellerShippingZoneRuleStatusUseCase } from "../../../application/seller/set-shipping-zone-rule-status";
import { SellerShippingConfigurationError } from "../../../application/seller/shipping-configuration-error";
import type { UpdateSellerCategoryShippingRuleUseCase } from "../../../application/seller/update-category-shipping-rule";
import type { UpdateSellerShippingZoneUseCase } from "../../../application/seller/update-shipping-zone";
import type { UpdateSellerShippingZoneRuleUseCase } from "../../../application/seller/update-shipping-zone-rule";
import type { UploadProductUseCase } from "../../../application/seller/upload-product";
import { UploadProductError } from "../../../application/seller/upload-product";
import { parseBase64File } from "../files/parse-base64-file";
import type { AuthenticatedUser } from "../middleware/create-auth-middleware";
import {
  buildProductBrandImagePublicUrl,
  buildProductCategoryImagePublicUrl
} from "../../storage/build-public-storage-url";
import { toProductImageResponse } from "../responses/product-image-response";
import { createCategoryShippingRuleSchema } from "../validation/create-category-shipping-rule-schema";
import { registerSellerSchema } from "../validation/register-seller-schema";
import { createShippingZoneRuleSchema } from "../validation/create-shipping-zone-rule-schema";
import { createShippingZoneSchema } from "../validation/create-shipping-zone-schema";
import { updateCategoryShippingRuleSchema } from "../validation/update-category-shipping-rule-schema";
import { updateShippingZoneRuleSchema } from "../validation/update-shipping-zone-rule-schema";
import { updateShippingZoneSchema } from "../validation/update-shipping-zone-schema";
import { uploadProductSchema } from "../validation/upload-product-schema";

interface SellerRouterDependencies {
  registerSeller: RegisterSellerUseCase;
}

interface SellerProductRouterDependencies {
  uploadProduct: UploadProductUseCase;
}

interface SellerProductListRouterDependencies {
  listSellerProducts: ListSellerProductsUseCase;
}

interface SellerBrandRouterDependencies {
  listAvailableProductBrands: ListAvailableProductBrandsUseCase;
}

interface SellerCategoryRouterDependencies {
  listAvailableProductCategories: ListAvailableProductCategoriesUseCase;
}

interface SellerShippingRouterDependencies {
  createCategoryShippingRule: CreateSellerCategoryShippingRuleUseCase;
  createShippingZone: CreateSellerShippingZoneUseCase;
  createShippingZoneRule: CreateSellerShippingZoneRuleUseCase;
  getCategoryShippingRule: GetSellerCategoryShippingRuleUseCase;
  getShippingZone: GetSellerShippingZoneUseCase;
  getShippingZoneRule: GetSellerShippingZoneRuleUseCase;
  listCategoryShippingRules: ListSellerCategoryShippingRulesUseCase;
  listShippingZoneRules: ListSellerShippingZoneRulesUseCase;
  listShippingZones: ListSellerShippingZonesUseCase;
  setCategoryShippingRuleStatus: SetSellerCategoryShippingRuleStatusUseCase;
  setShippingZoneStatus: SetSellerShippingZoneStatusUseCase;
  setShippingZoneRuleStatus: SetSellerShippingZoneRuleStatusUseCase;
  updateCategoryShippingRule: UpdateSellerCategoryShippingRuleUseCase;
  updateShippingZone: UpdateSellerShippingZoneUseCase;
  updateShippingZoneRule: UpdateSellerShippingZoneRuleUseCase;
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
          images: product.images.map((image) =>
            toProductImageResponse(image, { includeTimestamps: true })
          ),
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

export function createProtectedSellerProductListRouter({
  listSellerProducts
}: SellerProductListRouterDependencies) {
  const sellerProductListRouter = Router();

  sellerProductListRouter.get("/", async (_req, res) => {
    const authUser = res.locals.authUser as AuthenticatedUser;

    try {
      const products = await listSellerProducts.execute({
        sellerId: authUser.sub
      });

      return res.status(200).json({
        message: "Seller products retrieved successfully.",
        data: products.map((product) => ({
          id: product.id,
          seller_id: product.sellerId,
          category_id: product.categoryId,
          category_name: product.categoryName,
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
          images: product.images.map((image) =>
            toProductImageResponse(image, { includeTimestamps: true })
          ),
          created_at: product.createdAt.toISOString(),
          updated_at: product.updatedAt.toISOString()
        }))
      });
    } catch (caughtError) {
      if (caughtError instanceof ListSellerProductsError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message,
          field: caughtError.field
        });
      }

      return res.status(500).json({
        message: "Unable to fetch seller products."
      });
    }
  });

  return sellerProductListRouter;
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
          image: brand.image
            ? {
                storage_path: brand.image.storagePath,
                public_url: buildProductBrandImagePublicUrl(
                  brand.image.storagePath
                ),
                mime_type: brand.image.mimeType,
                original_file_name: brand.image.originalFileName
              }
            : null,
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
          image: category.image
            ? {
                storage_path: category.image.storagePath,
                public_url: buildProductCategoryImagePublicUrl(
                  category.image.storagePath
                ),
                mime_type: category.image.mimeType,
                original_file_name: category.image.originalFileName
              }
            : null,
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

export function createProtectedSellerShippingRouter({
  createCategoryShippingRule,
  createShippingZone,
  createShippingZoneRule,
  getCategoryShippingRule,
  getShippingZone,
  getShippingZoneRule,
  listCategoryShippingRules,
  listShippingZoneRules,
  listShippingZones,
  setCategoryShippingRuleStatus,
  setShippingZoneStatus,
  setShippingZoneRuleStatus,
  updateCategoryShippingRule,
  updateShippingZone,
  updateShippingZoneRule
}: SellerShippingRouterDependencies) {
  const sellerShippingRouter = Router();

  sellerShippingRouter.post("/zones", async (req, res) => {
    const { error, value } = createShippingZoneSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return validationFailure(res, error);
    }

    const authUser = res.locals.authUser as AuthenticatedUser;

    try {
      const zone = await createShippingZone.execute({
        sellerId: authUser.sub,
        name: value.name,
        states: value.states.map(
          (state: { state_name: string; cities?: string[] }) => ({
            stateName: state.state_name,
            cities: state.cities ?? []
          })
        )
      });

      return res.status(201).json({
        message: "Seller shipping zone created successfully.",
        data: thisShippingZoneResponse(zone)
      });
    } catch (caughtError) {
      return handleSellerShippingError(
        res,
        caughtError,
        "Unable to create seller shipping zone."
      );
    }
  });

  sellerShippingRouter.get("/zones", async (_req, res) => {
    const authUser = res.locals.authUser as AuthenticatedUser;

    try {
      const zones = await listShippingZones.execute({
        sellerId: authUser.sub
      });

      return res.status(200).json({
        message: "Seller shipping zones fetched successfully.",
        data: zones.map((zone) => thisShippingZoneResponse(zone))
      });
    } catch (caughtError) {
      return handleSellerShippingError(
        res,
        caughtError,
        "Unable to fetch seller shipping zones."
      );
    }
  });

  sellerShippingRouter.get("/zones/:zoneId", async (req, res) => {
    const authUser = res.locals.authUser as AuthenticatedUser;

    try {
      const zone = await getShippingZone.execute({
        sellerId: authUser.sub,
        zoneId: req.params.zoneId
      });

      return res.status(200).json({
        message: "Seller shipping zone fetched successfully.",
        data: thisShippingZoneResponse(zone)
      });
    } catch (caughtError) {
      return handleSellerShippingError(
        res,
        caughtError,
        "Unable to fetch seller shipping zone."
      );
    }
  });

  sellerShippingRouter.patch("/zones/:zoneId", async (req, res) => {
    const { error, value } = updateShippingZoneSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return validationFailure(res, error);
    }

    const authUser = res.locals.authUser as AuthenticatedUser;

    try {
      const zone = await updateShippingZone.execute({
        sellerId: authUser.sub,
        zoneId: req.params.zoneId,
        name: value.name,
        states: value.states?.map(
          (state: { state_name: string; cities?: string[] }) => ({
            stateName: state.state_name,
            cities: state.cities ?? []
          })
        )
      });

      return res.status(200).json({
        message: "Seller shipping zone updated successfully.",
        data: thisShippingZoneResponse(zone)
      });
    } catch (caughtError) {
      return handleSellerShippingError(
        res,
        caughtError,
        "Unable to update seller shipping zone."
      );
    }
  });

  sellerShippingRouter.post("/zones/:zoneId/activate", async (req, res) => {
    const authUser = res.locals.authUser as AuthenticatedUser;

    try {
      const zone = await setShippingZoneStatus.execute({
        sellerId: authUser.sub,
        zoneId: req.params.zoneId,
        status: "active"
      });

      return res.status(200).json({
        message: "Seller shipping zone activated successfully.",
        data: thisShippingZoneResponse(zone)
      });
    } catch (caughtError) {
      return handleSellerShippingError(
        res,
        caughtError,
        "Unable to activate seller shipping zone."
      );
    }
  });

  sellerShippingRouter.post("/zones/:zoneId/deactivate", async (req, res) => {
    const authUser = res.locals.authUser as AuthenticatedUser;

    try {
      const zone = await setShippingZoneStatus.execute({
        sellerId: authUser.sub,
        zoneId: req.params.zoneId,
        status: "inactive"
      });

      return res.status(200).json({
        message: "Seller shipping zone deactivated successfully.",
        data: thisShippingZoneResponse(zone)
      });
    } catch (caughtError) {
      return handleSellerShippingError(
        res,
        caughtError,
        "Unable to deactivate seller shipping zone."
      );
    }
  });

  sellerShippingRouter.post("/zone-rules", async (req, res) => {
    const { error, value } = createShippingZoneRuleSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return validationFailure(res, error);
    }

    const authUser = res.locals.authUser as AuthenticatedUser;

    try {
      const rule = await createShippingZoneRule.execute({
        sellerId: authUser.sub,
        zoneId: value.zone_id,
        methodType: value.method_type,
        value: value.value,
        subtotalBands: value.subtotal_bands?.map(
          (band: {
            min_subtotal: number;
            max_subtotal?: number | null;
            method_type: "fixed_rate" | "percentage_based";
            value: number;
          }) => ({
            minSubtotal: band.min_subtotal,
            maxSubtotal: band.max_subtotal ?? null,
            methodType: band.method_type,
            value: band.value
          })
        )
      });

      return res.status(201).json({
        message: "Seller shipping zone rule created successfully.",
        data: thisShippingZoneRuleResponse(rule)
      });
    } catch (caughtError) {
      return handleSellerShippingError(
        res,
        caughtError,
        "Unable to create seller shipping zone rule."
      );
    }
  });

  sellerShippingRouter.get("/zone-rules", async (_req, res) => {
    const authUser = res.locals.authUser as AuthenticatedUser;

    try {
      const rules = await listShippingZoneRules.execute({
        sellerId: authUser.sub
      });

      return res.status(200).json({
        message: "Seller shipping zone rules fetched successfully.",
        data: rules.map((rule) => thisShippingZoneRuleResponse(rule))
      });
    } catch (caughtError) {
      return handleSellerShippingError(
        res,
        caughtError,
        "Unable to fetch seller shipping zone rules."
      );
    }
  });

  sellerShippingRouter.get("/zone-rules/:ruleId", async (req, res) => {
    const authUser = res.locals.authUser as AuthenticatedUser;

    try {
      const rule = await getShippingZoneRule.execute({
        sellerId: authUser.sub,
        ruleId: req.params.ruleId
      });

      return res.status(200).json({
        message: "Seller shipping zone rule fetched successfully.",
        data: thisShippingZoneRuleResponse(rule)
      });
    } catch (caughtError) {
      return handleSellerShippingError(
        res,
        caughtError,
        "Unable to fetch seller shipping zone rule."
      );
    }
  });

  sellerShippingRouter.patch("/zone-rules/:ruleId", async (req, res) => {
    const { error, value } = updateShippingZoneRuleSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return validationFailure(res, error);
    }

    const authUser = res.locals.authUser as AuthenticatedUser;

    try {
      const rule = await updateShippingZoneRule.execute({
        sellerId: authUser.sub,
        ruleId: req.params.ruleId,
        zoneId: value.zone_id,
        methodType: value.method_type,
        value: value.value,
        subtotalBands: value.subtotal_bands?.map(
          (band: {
            min_subtotal: number;
            max_subtotal?: number | null;
            method_type: "fixed_rate" | "percentage_based";
            value: number;
          }) => ({
            minSubtotal: band.min_subtotal,
            maxSubtotal: band.max_subtotal ?? null,
            methodType: band.method_type,
            value: band.value
          })
        )
      });

      return res.status(200).json({
        message: "Seller shipping zone rule updated successfully.",
        data: thisShippingZoneRuleResponse(rule)
      });
    } catch (caughtError) {
      return handleSellerShippingError(
        res,
        caughtError,
        "Unable to update seller shipping zone rule."
      );
    }
  });

  sellerShippingRouter.post("/zone-rules/:ruleId/activate", async (req, res) => {
    const authUser = res.locals.authUser as AuthenticatedUser;

    try {
      const rule = await setShippingZoneRuleStatus.execute({
        sellerId: authUser.sub,
        ruleId: req.params.ruleId,
        status: "active"
      });

      return res.status(200).json({
        message: "Seller shipping zone rule activated successfully.",
        data: thisShippingZoneRuleResponse(rule)
      });
    } catch (caughtError) {
      return handleSellerShippingError(
        res,
        caughtError,
        "Unable to activate seller shipping zone rule."
      );
    }
  });

  sellerShippingRouter.post(
    "/zone-rules/:ruleId/deactivate",
    async (req, res) => {
      const authUser = res.locals.authUser as AuthenticatedUser;

      try {
        const rule = await setShippingZoneRuleStatus.execute({
          sellerId: authUser.sub,
          ruleId: req.params.ruleId,
          status: "inactive"
        });

        return res.status(200).json({
          message: "Seller shipping zone rule deactivated successfully.",
          data: thisShippingZoneRuleResponse(rule)
        });
      } catch (caughtError) {
        return handleSellerShippingError(
          res,
          caughtError,
          "Unable to deactivate seller shipping zone rule."
        );
      }
    }
  );

  sellerShippingRouter.post("/category-rules", async (req, res) => {
    const { error, value } = createCategoryShippingRuleSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      return validationFailure(res, error);
    }

    const authUser = res.locals.authUser as AuthenticatedUser;

    try {
      const rule = await createCategoryShippingRule.execute({
        sellerId: authUser.sub,
        categoryId: value.category_id,
        methodType: value.method_type,
        value: value.value,
        subtotalBands: value.subtotal_bands?.map(
          (band: {
            min_subtotal: number;
            max_subtotal?: number | null;
            method_type: "fixed_rate" | "percentage_based";
            value: number;
          }) => ({
            minSubtotal: band.min_subtotal,
            maxSubtotal: band.max_subtotal ?? null,
            methodType: band.method_type,
            value: band.value
          })
        )
      });

      return res.status(201).json({
        message: "Seller category shipping rule created successfully.",
        data: thisCategoryShippingRuleResponse(rule)
      });
    } catch (caughtError) {
      return handleSellerShippingError(
        res,
        caughtError,
        "Unable to create seller category shipping rule."
      );
    }
  });

  sellerShippingRouter.get("/category-rules", async (_req, res) => {
    const authUser = res.locals.authUser as AuthenticatedUser;

    try {
      const rules = await listCategoryShippingRules.execute({
        sellerId: authUser.sub
      });

      return res.status(200).json({
        message: "Seller category shipping rules fetched successfully.",
        data: rules.map((rule) => thisCategoryShippingRuleResponse(rule))
      });
    } catch (caughtError) {
      return handleSellerShippingError(
        res,
        caughtError,
        "Unable to fetch seller category shipping rules."
      );
    }
  });

  sellerShippingRouter.get("/category-rules/:ruleId", async (req, res) => {
    const authUser = res.locals.authUser as AuthenticatedUser;

    try {
      const rule = await getCategoryShippingRule.execute({
        sellerId: authUser.sub,
        ruleId: req.params.ruleId
      });

      return res.status(200).json({
        message: "Seller category shipping rule fetched successfully.",
        data: thisCategoryShippingRuleResponse(rule)
      });
    } catch (caughtError) {
      return handleSellerShippingError(
        res,
        caughtError,
        "Unable to fetch seller category shipping rule."
      );
    }
  });

  sellerShippingRouter.patch("/category-rules/:ruleId", async (req, res) => {
    const { error, value } = updateCategoryShippingRuleSchema.validate(
      req.body,
      {
        abortEarly: false,
        stripUnknown: true
      }
    );

    if (error) {
      return validationFailure(res, error);
    }

    const authUser = res.locals.authUser as AuthenticatedUser;

    try {
      const rule = await updateCategoryShippingRule.execute({
        sellerId: authUser.sub,
        ruleId: req.params.ruleId,
        categoryId: value.category_id,
        methodType: value.method_type,
        value: value.value,
        subtotalBands: value.subtotal_bands?.map(
          (band: {
            min_subtotal: number;
            max_subtotal?: number | null;
            method_type: "fixed_rate" | "percentage_based";
            value: number;
          }) => ({
            minSubtotal: band.min_subtotal,
            maxSubtotal: band.max_subtotal ?? null,
            methodType: band.method_type,
            value: band.value
          })
        )
      });

      return res.status(200).json({
        message: "Seller category shipping rule updated successfully.",
        data: thisCategoryShippingRuleResponse(rule)
      });
    } catch (caughtError) {
      return handleSellerShippingError(
        res,
        caughtError,
        "Unable to update seller category shipping rule."
      );
    }
  });

  sellerShippingRouter.post(
    "/category-rules/:ruleId/activate",
    async (req, res) => {
      const authUser = res.locals.authUser as AuthenticatedUser;

      try {
        const rule = await setCategoryShippingRuleStatus.execute({
          sellerId: authUser.sub,
          ruleId: req.params.ruleId,
          status: "active"
        });

        return res.status(200).json({
          message: "Seller category shipping rule activated successfully.",
          data: thisCategoryShippingRuleResponse(rule)
        });
      } catch (caughtError) {
        return handleSellerShippingError(
          res,
          caughtError,
          "Unable to activate seller category shipping rule."
        );
      }
    }
  );

  sellerShippingRouter.post(
    "/category-rules/:ruleId/deactivate",
    async (req, res) => {
      const authUser = res.locals.authUser as AuthenticatedUser;

      try {
        const rule = await setCategoryShippingRuleStatus.execute({
          sellerId: authUser.sub,
          ruleId: req.params.ruleId,
          status: "inactive"
        });

        return res.status(200).json({
          message: "Seller category shipping rule deactivated successfully.",
          data: thisCategoryShippingRuleResponse(rule)
        });
      } catch (caughtError) {
        return handleSellerShippingError(
          res,
          caughtError,
          "Unable to deactivate seller category shipping rule."
        );
      }
    }
  );

  return sellerShippingRouter;
}

function thisShippingZoneResponse(zone: {
  id: string;
  name: string;
  status: string;
  states: Array<{
    id: string;
    stateName: string;
    cities: Array<{
      id: string;
      cityName: string;
    }>;
  }>;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: zone.id,
    name: zone.name,
    status: zone.status,
    states: zone.states.map((state) => ({
      id: state.id,
      state_name: state.stateName,
      cities: state.cities.map((city) => ({
        id: city.id,
        city_name: city.cityName
      }))
    })),
    created_at: zone.createdAt.toISOString(),
    updated_at: zone.updatedAt.toISOString()
  };
}

function thisShippingZoneRuleResponse(rule: {
  id: string;
  zoneId: string;
  zoneName: string;
  methodType: string;
  value: number;
  status: string;
  subtotalBands: Array<{
    id: string;
    minSubtotal: number;
    maxSubtotal: number | null;
    methodType: string;
    value: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: rule.id,
    zone_id: rule.zoneId,
    zone_name: rule.zoneName,
    method_type: rule.methodType,
    value: rule.value,
    status: rule.status,
    subtotal_bands: rule.subtotalBands.map((band) => ({
      id: band.id,
      min_subtotal: band.minSubtotal,
      max_subtotal: band.maxSubtotal,
      method_type: band.methodType,
      value: band.value,
      created_at: band.createdAt.toISOString(),
      updated_at: band.updatedAt.toISOString()
    })),
    created_at: rule.createdAt.toISOString(),
    updated_at: rule.updatedAt.toISOString()
  };
}

function thisCategoryShippingRuleResponse(rule: {
  id: string;
  categoryId: string;
  categoryName: string;
  methodType: string;
  value: number;
  status: string;
  subtotalBands: Array<{
    id: string;
    minSubtotal: number;
    maxSubtotal: number | null;
    methodType: string;
    value: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: rule.id,
    category_id: rule.categoryId,
    category_name: rule.categoryName,
    method_type: rule.methodType,
    value: rule.value,
    status: rule.status,
    subtotal_bands: rule.subtotalBands.map((band) => ({
      id: band.id,
      min_subtotal: band.minSubtotal,
      max_subtotal: band.maxSubtotal,
      method_type: band.methodType,
      value: band.value,
      created_at: band.createdAt.toISOString(),
      updated_at: band.updatedAt.toISOString()
    })),
    created_at: rule.createdAt.toISOString(),
    updated_at: rule.updatedAt.toISOString()
  };
}

function validationFailure(
  res: {
    status: (statusCode: number) => {
      json: (body: unknown) => unknown;
    };
  },
  error: {
    details: Array<{
      path: Array<string | number>;
      message: string;
    }>;
  }
) {
  return res.status(400).json({
    message: "Validation failed.",
    errors: error.details.map((detail) => ({
      field: detail.path.join("."),
      message: detail.message
    }))
  });
}

function handleSellerShippingError(
  res: {
    status: (statusCode: number) => {
      json: (body: unknown) => unknown;
    };
  },
  caughtError: unknown,
  defaultMessage: string
) {
  if (caughtError instanceof SellerShippingConfigurationError) {
    return res.status(caughtError.statusCode).json({
      message: caughtError.message,
      field: caughtError.field
    });
  }

  return res.status(500).json({
    message: defaultMessage
  });
}
