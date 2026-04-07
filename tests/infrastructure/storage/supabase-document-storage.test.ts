import { afterEach, beforeEach, describe, expect, it, jest } from "@jest/globals";

import { SupabaseDocumentStorage } from "../../../src/infrastructure/storage/supabase-document-storage";

describe("SupabaseDocumentStorage", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    const fetchMock = jest.fn<typeof fetch>();
    fetchMock.mockResolvedValue({
      ok: true,
      text: async () => ""
    } as Response);
    global.fetch = fetchMock;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("uploads seller KYC documents to the configured KYC bucket", async () => {
    const storage = new SupabaseDocumentStorage(
      "https://example.supabase.co",
      "service-role-key",
      "seller-kyc-documents",
      "product-images",
      "product-category-images",
      "product-brand-images",
      "slider-images"
    );

    const result = await storage.uploadSellerKycDocument({
      userId: "seller-id",
      documentType: "proof_of_address",
      fileName: "utility-bill.jpg",
      mimeType: "image/jpeg",
      fileContents: Buffer.from("proof")
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        "/storage/v1/object/seller-kyc-documents/seller-kyc/seller-id/proof_of_address/"
      ),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "image/jpeg"
        })
      })
    );
    expect(result.storagePath).toContain("seller-kyc/seller-id/proof_of_address/");
  });

  it("uploads product images to the configured product image bucket", async () => {
    const storage = new SupabaseDocumentStorage(
      "https://example.supabase.co",
      "service-role-key",
      "seller-kyc-documents",
      "product-images",
      "product-category-images",
      "product-brand-images",
      "slider-images"
    );

    const result = await storage.uploadProductImage({
      sellerId: "seller-id",
      fileName: "front.jpg",
      mimeType: "image/jpeg",
      fileContents: Buffer.from("image")
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        "/storage/v1/object/product-images/products/seller-id/"
      ),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "image/jpeg"
        })
      })
    );
    expect(result.storagePath).toContain("products/seller-id/");
    expect(result.storagePath).toContain("front.jpg");
  });

  it("uploads product category images to the configured category image bucket", async () => {
    const storage = new SupabaseDocumentStorage(
      "https://example.supabase.co",
      "service-role-key",
      "seller-kyc-documents",
      "product-images",
      "product-category-images",
      "product-brand-images",
      "slider-images"
    );

    const result = await storage.uploadProductCategoryImage({
      categoryName: "Electronics",
      fileName: "electronics.jpg",
      mimeType: "image/jpeg",
      fileContents: Buffer.from("category-image")
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        "/storage/v1/object/product-category-images/product-categories/electronics/"
      ),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "image/jpeg"
        })
      })
    );
    expect(result.storagePath).toContain("product-categories/electronics/");
    expect(result.storagePath).toContain("electronics.jpg");
  });

  it("uploads product brand images to the configured brand image bucket", async () => {
    const storage = new SupabaseDocumentStorage(
      "https://example.supabase.co",
      "service-role-key",
      "seller-kyc-documents",
      "product-images",
      "product-category-images",
      "product-brand-images",
      "slider-images"
    );

    const result = await storage.uploadProductBrandImage({
      brandName: "Apple",
      fileName: "apple.jpg",
      mimeType: "image/jpeg",
      fileContents: Buffer.from("brand-image")
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        "/storage/v1/object/product-brand-images/product-brands/apple/"
      ),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "image/jpeg"
        })
      })
    );
    expect(result.storagePath).toContain("product-brands/apple/");
    expect(result.storagePath).toContain("apple.jpg");
  });

  it("uploads slider images to the configured slider image bucket", async () => {
    const storage = new SupabaseDocumentStorage(
      "https://example.supabase.co",
      "service-role-key",
      "seller-kyc-documents",
      "product-images",
      "product-category-images",
      "product-brand-images",
      "slider-images"
    );

    const result = await storage.uploadSliderImage({
      sliderTitle: "Mega Sale",
      fileName: "banner.jpg",
      mimeType: "image/jpeg",
      fileContents: Buffer.from("slider-image")
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/storage/v1/object/slider-images/sliders/mega-sale/"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "image/jpeg"
        })
      })
    );
    expect(result.storagePath).toContain("sliders/mega-sale/");
    expect(result.storagePath).toContain("banner.jpg");
  });
});
