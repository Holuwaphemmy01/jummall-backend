import { Router } from "express";

import type { GetApprovedProductDetailUseCase } from "../../../application/product/get-approved-product-detail";
import type { ListCatalogProductBrandsUseCase } from "../../../application/product/list-catalog-product-brands";
import { GetApprovedProductDetailError } from "../../../application/product/get-approved-product-detail";
import type { ListCatalogProductCategoriesUseCase } from "../../../application/product/list-catalog-product-categories";
import type { ListApprovedProductsUseCase } from "../../../application/product/list-approved-products";
import { ListApprovedProductsError } from "../../../application/product/list-approved-products";
import type { ListApprovedProductsByBrandIdUseCase } from "../../../application/product/list-approved-products-by-brand-id";
import { ListApprovedProductsByBrandIdError } from "../../../application/product/list-approved-products-by-brand-id";
import type { ListApprovedProductsByCategoryUseCase } from "../../../application/product/list-approved-products-by-category";
import { ListApprovedProductsByCategoryError } from "../../../application/product/list-approved-products-by-category";
import type { SearchApprovedProductSuggestionsUseCase } from "../../../application/product/search-approved-product-suggestions";
import { SearchApprovedProductSuggestionsError } from "../../../application/product/search-approved-product-suggestions";
import type { ListActiveSlidersUseCase } from "../../../application/slider/list-active-sliders";
import {
  buildProductBrandImagePublicUrl,
  buildProductCategoryImagePublicUrl
} from "../../storage/build-public-storage-url";
import {
  toPrimaryProductImageResponse,
  toProductImageResponse
} from "../responses/product-image-response";
import { toSliderResponse } from "../responses/slider-response";
import { listCategoryProductsSchema } from "../validation/list-category-products-schema";
import { listProductsSchema } from "../validation/list-products-schema";
import { searchProductsSchema } from "../validation/search-products-schema";

interface ProductRouterDependencies {
  getApprovedProductDetail: GetApprovedProductDetailUseCase;
  listCatalogProductBrands: ListCatalogProductBrandsUseCase;
  listCatalogProductCategories: ListCatalogProductCategoriesUseCase;
  listApprovedProducts: ListApprovedProductsUseCase;
  listApprovedProductsByBrandId: ListApprovedProductsByBrandIdUseCase;
  listApprovedProductsByCategory: ListApprovedProductsByCategoryUseCase;
  listActiveSliders: ListActiveSlidersUseCase;
  searchApprovedProductSuggestions: SearchApprovedProductSuggestionsUseCase;
}

export default function createProductRouter({
  getApprovedProductDetail,
  listCatalogProductBrands,
  listCatalogProductCategories,
  listApprovedProducts,
  listApprovedProductsByBrandId,
  listApprovedProductsByCategory,
  listActiveSliders,
  searchApprovedProductSuggestions
}: ProductRouterDependencies) {
  const productRouter = Router();

  productRouter.get("/brands", async (_req, res) => {
    try {
      const brands = await listCatalogProductBrands.execute();

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

  productRouter.get("/categories", async (_req, res) => {
    try {
      const categories = await listCatalogProductCategories.execute();

      return res.status(200).json({
        message: "Product categories fetched successfully.",
        data: categories.map((category) => ({
          id: category.id,
          name: category.name,
          description: category.description,
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

  productRouter.get("/sliders", async (_req, res) => {
    try {
      const sliders = await listActiveSliders.execute();

      return res.status(200).json({
        message: "Sliders fetched successfully.",
        data: sliders.map((slider) => toSliderResponse(slider))
      });
    } catch {
      return res.status(500).json({
        message: "Unable to fetch sliders."
      });
    }
  });

  productRouter.get("/", async (req, res) => {
    const { error, value } = listProductsSchema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
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
      const result = await listApprovedProducts.execute({
        page: value.page,
        limit: value.limit,
        categoryId: value.category_id,
        brandId: value.brand_id,
        minPrice: value.min_price,
        maxPrice: value.max_price,
        search: value.search
      });

      return res.status(200).json({
        message: "Products fetched successfully.",
        data: result.items.map((product) => ({
          id: product.id,
          category_id: product.categoryId,
          brand_id: product.brandId,
          brand_name: product.brandName,
          name: product.name,
          description: product.description,
          price: product.price,
          quantity: product.quantity,
          currency: product.currency,
          condition: product.condition,
          weight_kg: product.weightKg,
          status: product.status,
          images: product.images.map((image) => toProductImageResponse(image))
        })),
        meta: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          total_pages: Math.ceil(result.total / result.limit)
        }
      });
    } catch (caughtError) {
      if (caughtError instanceof ListApprovedProductsError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message,
          field: caughtError.field
        });
      }

      return res.status(500).json({
        message: "Unable to fetch products."
      });
    }
  });

  productRouter.get("/categories/:categoryId", async (req, res) => {
    const { error, value } = listCategoryProductsSchema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
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
      const result = await listApprovedProductsByCategory.execute({
        categoryId: req.params.categoryId,
        page: value.page,
        limit: value.limit
      });

      return res.status(200).json({
        message: "Products fetched successfully.",
        data: result.items.map((product) => ({
          id: product.id,
          category_id: product.categoryId,
          brand_id: product.brandId,
          brand_name: product.brandName,
          name: product.name,
          description: product.description,
          price: product.price,
          quantity: product.quantity,
          currency: product.currency,
          condition: product.condition,
          weight_kg: product.weightKg,
          status: product.status,
          images: product.images.map((image) => toProductImageResponse(image))
        })),
        meta: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          total_pages: Math.ceil(result.total / result.limit)
        }
      });
    } catch (caughtError) {
      if (caughtError instanceof ListApprovedProductsByCategoryError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message,
          field: caughtError.field
        });
      }

      return res.status(500).json({
        message: "Unable to fetch products by category."
      });
    }
  });

  productRouter.get("/brands/:brandId", async (req, res) => {
    const { error, value } = listCategoryProductsSchema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
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
      const result = await listApprovedProductsByBrandId.execute({
        brandId: req.params.brandId,
        page: value.page,
        limit: value.limit
      });

      return res.status(200).json({
        message: "Products fetched successfully.",
        data: result.items.map((product) => ({
          id: product.id,
          category_id: product.categoryId,
          brand_id: product.brandId,
          brand_name: product.brandName,
          name: product.name,
          description: product.description,
          price: product.price,
          quantity: product.quantity,
          currency: product.currency,
          condition: product.condition,
          weight_kg: product.weightKg,
          status: product.status,
          images: product.images.map((image) => toProductImageResponse(image))
        })),
        meta: {
          page: result.page,
          limit: result.limit,
          total: result.total,
          total_pages: Math.ceil(result.total / result.limit)
        }
      });
    } catch (caughtError) {
      if (caughtError instanceof ListApprovedProductsByBrandIdError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message,
          field: caughtError.field
        });
      }

      return res.status(500).json({
        message: "Unable to fetch products by brand."
      });
    }
  });

  productRouter.get("/search", async (req, res) => {
    const { error, value } = searchProductsSchema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      convert: true
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
      const products = await searchApprovedProductSuggestions.execute({
        query: value.query,
        limit: value.limit
      });

      return res.status(200).json({
        message: "Product suggestions fetched successfully.",
        data: products.map((product) => ({
          ...toPrimaryProductImageResponse(product.images),
          id: product.id,
          category_id: product.categoryId,
          brand_id: product.brandId,
          brand_name: product.brandName,
          name: product.name,
          price: product.price,
          currency: product.currency,
          condition: product.condition
        }))
      });
    } catch (caughtError) {
      if (caughtError instanceof SearchApprovedProductSuggestionsError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message,
          field: caughtError.field
        });
      }

      return res.status(500).json({
        message: "Unable to fetch product suggestions."
      });
    }
  });

  productRouter.get("/:productId", async (req, res) => {
    try {
      const product = await getApprovedProductDetail.execute({
        productId: req.params.productId
      });

      return res.status(200).json({
        message: "Product fetched successfully.",
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
          images: product.images.map((image) => toProductImageResponse(image)),
          created_at: product.createdAt.toISOString(),
          updated_at: product.updatedAt.toISOString()
        }
      });
    } catch (caughtError) {
      if (caughtError instanceof GetApprovedProductDetailError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message,
          field: caughtError.field
        });
      }

      return res.status(500).json({
        message: "Unable to fetch product."
      });
    }
  });

  return productRouter;
}
