export function buildSupabasePublicObjectUrl(
  bucketName: string,
  storagePath: string,
  supabaseUrl: string = process.env.SUPABASE_URL ?? ""
) {
  const trimmedSupabaseUrl = supabaseUrl.trim().replace(/\/$/, "");
  const trimmedBucketName = bucketName.trim().replace(/^\/+|\/+$/g, "");
  const trimmedStoragePath = storagePath.trim().replace(/^\/+/, "");

  if (!trimmedSupabaseUrl || !trimmedBucketName || !trimmedStoragePath) {
    return null;
  }

  return `${trimmedSupabaseUrl}/storage/v1/object/public/${trimmedBucketName}/${trimmedStoragePath}`;
}

export function buildProductCategoryImagePublicUrl(storagePath: string) {
  return buildSupabasePublicObjectUrl(
    process.env.SUPABASE_PRODUCT_CATEGORY_IMAGE_BUCKET ??
      "product-category-images",
    storagePath
  );
}

export function buildProductBrandImagePublicUrl(storagePath: string) {
  return buildSupabasePublicObjectUrl(
    process.env.SUPABASE_PRODUCT_BRAND_IMAGE_BUCKET ?? "product-brand-images",
    storagePath
  );
}
