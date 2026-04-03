import { ProductCategoryError } from "./product-category-errors";

export interface ProductCategoryImageUploadInput {
  fileName: string;
  mimeType: string;
  fileContents: Buffer;
}

const ALLOWED_PRODUCT_CATEGORY_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp"
]);

export function validateProductCategoryImage(
  image: ProductCategoryImageUploadInput
) {
  if (!ALLOWED_PRODUCT_CATEGORY_IMAGE_MIME_TYPES.has(image.mimeType)) {
    throw new ProductCategoryError(
      "Unsupported product category image type.",
      400,
      "image.mime_type"
    );
  }
}
