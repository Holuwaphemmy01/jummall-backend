import { describe, expect, it } from "@jest/globals";

import {
  toPrimaryProductImageResponse,
  toProductImageResponse
} from "../../../src/infrastructure/api/responses/product-image-response";

describe("product image response helpers", () => {
  it("adds a public url to product image responses", () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";

    const result = toProductImageResponse({
      id: "image-id",
      storagePath: "products/seller-id/front.jpg",
      mimeType: "image/jpeg",
      originalFileName: "front.jpg",
      position: 0
    });

    expect(result).toEqual({
      id: "image-id",
      storage_path: "products/seller-id/front.jpg",
      public_url:
        "https://example.supabase.co/storage/v1/object/public/product-images/products/seller-id/front.jpg",
      mime_type: "image/jpeg",
      original_file_name: "front.jpg",
      position: 0
    });
  });

  it("prefers position zero when resolving the primary product image", () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";

    const result = toPrimaryProductImageResponse([
      {
        position: 2,
        storagePath: "products/seller-id/second.jpg"
      },
      {
        position: 0,
        storagePath: "products/seller-id/first.jpg"
      }
    ]);

    expect(result).toEqual({
      primaryImage: "products/seller-id/first.jpg",
      primaryImagePublicUrl:
        "https://example.supabase.co/storage/v1/object/public/product-images/products/seller-id/first.jpg"
    });
  });
});
