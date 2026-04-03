import { ProductBrandError } from "./product-brand-errors";

export interface ProductBrandImageUploadInput {
  fileName: string;
  mimeType: string;
  fileContents: Buffer;
}

const ALLOWED_PRODUCT_BRAND_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp"
]);

export function validateProductBrandImage(image: ProductBrandImageUploadInput) {
  if (!ALLOWED_PRODUCT_BRAND_IMAGE_MIME_TYPES.has(image.mimeType)) {
    throw new ProductBrandError(
      "Unsupported product brand image type.",
      400,
      "image.mime_type"
    );
  }
}
