import { buildProductImagePublicUrl } from "../../storage/build-public-storage-url";

interface ProductImageLike {
  id: string;
  storagePath: string;
  mimeType: string;
  originalFileName: string;
  position: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export function toProductImageResponse(
  image: ProductImageLike,
  options: { includeTimestamps?: boolean } = {}
) {
  const response = {
    id: image.id,
    storage_path: image.storagePath,
    public_url: buildProductImagePublicUrl(image.storagePath),
    mime_type: image.mimeType,
    original_file_name: image.originalFileName,
    position: image.position
  };

  if (!options.includeTimestamps) {
    return response;
  }

  return {
    ...response,
    created_at: image.createdAt?.toISOString(),
    updated_at: image.updatedAt?.toISOString()
  };
}

export function toPrimaryProductImageResponse(
  images: Array<Pick<ProductImageLike, "position" | "storagePath">>
) {
  const primaryImage =
    images.find((image) => image.position === 0) ?? images[0] ?? null;
  const primaryImageStoragePath = primaryImage?.storagePath ?? null;

  return {
    primaryImage: primaryImageStoragePath,
    primaryImagePublicUrl: primaryImageStoragePath
      ? buildProductImagePublicUrl(primaryImageStoragePath)
      : null
  };
}
