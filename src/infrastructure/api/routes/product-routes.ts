import { Router } from "express";

import type { ListApprovedProductsUseCase } from "../../../application/product/list-approved-products";
import { ListApprovedProductsError } from "../../../application/product/list-approved-products";
import type { ListApprovedProductsByCategoryUseCase } from "../../../application/product/list-approved-products-by-category";
import { ListApprovedProductsByCategoryError } from "../../../application/product/list-approved-products-by-category";
import { listCategoryProductsSchema } from "../validation/list-category-products-schema";
import { listProductsSchema } from "../validation/list-products-schema";

interface ProductRouterDependencies {
  listApprovedProducts: ListApprovedProductsUseCase;
  listApprovedProductsByCategory: ListApprovedProductsByCategoryUseCase;
}

export default function createProductRouter({
  listApprovedProducts,
  listApprovedProductsByCategory
}: ProductRouterDependencies) {
  const productRouter = Router();

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
          images: product.images.map((image) => ({
            id: image.id,
            storage_path: image.storagePath,
            mime_type: image.mimeType,
            original_file_name: image.originalFileName,
            position: image.position
          }))
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
          images: product.images.map((image) => ({
            id: image.id,
            storage_path: image.storagePath,
            mime_type: image.mimeType,
            original_file_name: image.originalFileName,
            position: image.position
          }))
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

  return productRouter;
}
