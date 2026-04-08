import { afterEach, describe, expect, it, jest } from "@jest/globals";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import { ProductBrandError } from "../../../src/application/admin/product-brand-errors";
import createAdminRouter from "../../../src/infrastructure/api/routes/admin-routes";
import createProductRouter from "../../../src/infrastructure/api/routes/product-routes";
import { createProtectedSellerBrandRouter } from "../../../src/infrastructure/api/routes/seller-routes";
import type { ProductBrandRecord } from "../../../src/ports/product-brand-repository";

function makeBrand(
  overrides: Partial<ProductBrandRecord> = {}
): ProductBrandRecord {
  return {
    id: "brand-id",
    name: "Apple",
    description: "Consumer electronics brand",
    image: {
      storagePath: "product-brands/apple/apple.jpg",
      mimeType: "image/jpeg",
      originalFileName: "apple.jpg"
    },
    createdAt: new Date("2026-04-03T00:00:00.000Z"),
    updatedAt: new Date("2026-04-03T00:00:00.000Z"),
    ...overrides
  };
}

function createUnusedUseCase() {
  return {
    execute: jest.fn(async () => {
      throw new Error("Unexpected use case call.");
    })
  };
}

function createAdminRouterDependencies(overrides: Record<string, unknown>) {
  return {
    approveProductPendingReview: createUnusedUseCase(),
    approveSellerKyc: createUnusedUseCase(),
    createCategoryShippingRule: createUnusedUseCase(),
    createFreeShippingRule: createUnusedUseCase(),
    createSlider: createUnusedUseCase(),
    createProductBrand: createUnusedUseCase(),
    createProductCategory: createUnusedUseCase(),
    createShippingZone: createUnusedUseCase(),
    createShippingZoneRule: createUnusedUseCase(),
    getCategoryShippingRule: createUnusedUseCase(),
    getFreeShippingRule: createUnusedUseCase(),
    getSlider: createUnusedUseCase(),
    getProductBrand: createUnusedUseCase(),
    getProductPendingReviewDetail: createUnusedUseCase(),
    getCompletedSellerKyc: createUnusedUseCase(),
    getOrderDetail: createUnusedUseCase(),
    getProductCategory: createUnusedUseCase(),
    getShippingZone: createUnusedUseCase(),
    getShippingZoneRule: createUnusedUseCase(),
    getShippingSettings: createUnusedUseCase(),
    listCompletedSellerKyc: createUnusedUseCase(),
    listFreeShippingRules: createUnusedUseCase(),
    listSliders: createUnusedUseCase(),
    listOrders: createUnusedUseCase(),
    listCategoryShippingRules: createUnusedUseCase(),
    listProductBrands: createUnusedUseCase(),
    listProductsPendingReview: createUnusedUseCase(),
    listProductCategories: createUnusedUseCase(),
    listShippingZoneRules: createUnusedUseCase(),
    listShippingZones: createUnusedUseCase(),
    rejectProductPendingReview: createUnusedUseCase(),
    setCategoryShippingRuleStatus: createUnusedUseCase(),
    setFreeShippingRuleStatus: createUnusedUseCase(),
    setSliderStatus: createUnusedUseCase(),
    setShippingZoneRuleStatus: createUnusedUseCase(),
    setShippingZoneStatus: createUnusedUseCase(),
    updateCategoryShippingRule: createUnusedUseCase(),
    updateFreeShippingRule: createUnusedUseCase(),
    updateShippingZone: createUnusedUseCase(),
    updateShippingZoneRule: createUnusedUseCase(),
    updateShippingSettings: createUnusedUseCase(),
    updateOrderItemDeliveryStatus: createUnusedUseCase(),
    updateSlider: createUnusedUseCase(),
    updateProductBrand: createUnusedUseCase(),
    updateProductCategory: createUnusedUseCase(),
    ...overrides
  } as Parameters<typeof createAdminRouter>[0];
}

async function createServer(
  appBuilder: (app: express.Express) => void
): Promise<{ server: Server; baseUrl: string }> {
  const app = express();
  app.use(express.json());
  appBuilder(app);

  const server = await new Promise<Server>((resolve) => {
    const createdServer = app.listen(0, () => resolve(createdServer));
  });
  const address = server.address() as AddressInfo;

  return {
    server,
    baseUrl: `http://127.0.0.1:${address.port}`
  };
}

async function closeServer(server: Server) {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

describe("product brand routes", () => {
  const openServers: Server[] = [];
  const originalSupabaseUrl = process.env.SUPABASE_URL;

  afterEach(async () => {
    while (openServers.length > 0) {
      const server = openServers.pop();

      if (server) {
        await closeServer(server);
      }
    }

    if (originalSupabaseUrl === undefined) {
      delete process.env.SUPABASE_URL;
    } else {
      process.env.SUPABASE_URL = originalSupabaseUrl;
    }
  });

  it("requires image in the admin create product brand payload", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";

    const { server, baseUrl } = await createServer((app) => {
      app.use(
        "/admin",
        createAdminRouter(
          createAdminRouterDependencies({
            createProductBrand: {
              execute: jest.fn()
            }
          })
        )
      );
    });
    openServers.push(server);

    const response = await fetch(`${baseUrl}/admin/product-brands`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: "Apple",
        description: "Consumer electronics brand"
      })
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      message: "Validation failed.",
      errors: expect.arrayContaining([
        expect.objectContaining({
          field: "image"
        })
      ])
    });
  });

  it("returns image data when an admin creates a brand", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";

    const createProductBrand = {
      execute: jest.fn(async () => makeBrand())
    };
    const { server, baseUrl } = await createServer((app) => {
      app.use(
        "/admin",
        createAdminRouter(
          createAdminRouterDependencies({
            createProductBrand
          })
        )
      );
    });
    openServers.push(server);

    const response = await fetch(`${baseUrl}/admin/product-brands`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: "Apple",
        description: "Consumer electronics brand",
        image: {
          file_name: "apple.jpg",
          mime_type: "image/jpeg",
          file_base64: `data:image/jpeg;base64,${Buffer.from("image").toString("base64")}`
        }
      })
    });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(createProductBrand.execute as jest.Mock).toHaveBeenCalledWith({
      name: "Apple",
      description: "Consumer electronics brand",
      image: {
        fileName: "apple.jpg",
        mimeType: "image/jpeg",
        fileContents: Buffer.from("image")
      }
    });
    expect(body).toEqual({
      message: "Product brand created successfully.",
      data: {
        id: "brand-id",
        name: "Apple",
        description: "Consumer electronics brand",
        image: {
          storage_path: "product-brands/apple/apple.jpg",
          public_url:
            "https://example.supabase.co/storage/v1/object/public/product-brand-images/product-brands/apple/apple.jpg",
          mime_type: "image/jpeg",
          original_file_name: "apple.jpg"
        },
        created_at: "2026-04-03T00:00:00.000Z",
        updated_at: "2026-04-03T00:00:00.000Z"
      }
    });
  });

  it("returns image data when an admin lists brands", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";

    const listProductBrands = {
      execute: jest.fn(async () => [makeBrand()])
    };
    const { server, baseUrl } = await createServer((app) => {
      app.use(
        "/admin",
        createAdminRouter(
          createAdminRouterDependencies({
            listProductBrands
          })
        )
      );
    });
    openServers.push(server);

    const response = await fetch(`${baseUrl}/admin/product-brands`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data[0].image).toEqual({
      storage_path: "product-brands/apple/apple.jpg",
      public_url:
        "https://example.supabase.co/storage/v1/object/public/product-brand-images/product-brands/apple/apple.jpg",
      mime_type: "image/jpeg",
      original_file_name: "apple.jpg"
    });
  });

  it("returns image data when an admin fetches one brand", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";

    const getProductBrand = {
      execute: jest.fn(async () => makeBrand())
    };
    const { server, baseUrl } = await createServer((app) => {
      app.use(
        "/admin",
        createAdminRouter(
          createAdminRouterDependencies({
            getProductBrand
          })
        )
      );
    });
    openServers.push(server);

    const response = await fetch(`${baseUrl}/admin/product-brands/brand-id`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.image).toEqual({
      storage_path: "product-brands/apple/apple.jpg",
      public_url:
        "https://example.supabase.co/storage/v1/object/public/product-brand-images/product-brands/apple/apple.jpg",
      mime_type: "image/jpeg",
      original_file_name: "apple.jpg"
    });
  });

  it("returns updated image data when an admin patches a brand image", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";

    const updateProductBrand = {
      execute: jest.fn(async () =>
        makeBrand({
          image: {
            storagePath: "product-brands/apple/apple-banner.png",
            mimeType: "image/png",
            originalFileName: "apple-banner.png"
          }
        })
      )
    };
    const { server, baseUrl } = await createServer((app) => {
      app.use(
        "/admin",
        createAdminRouter(
          createAdminRouterDependencies({
            updateProductBrand
          })
        )
      );
    });
    openServers.push(server);

    const response = await fetch(`${baseUrl}/admin/product-brands/brand-id`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        image: {
          file_name: "apple-banner.png",
          mime_type: "image/png",
          file_base64: `data:image/png;base64,${Buffer.from("image").toString("base64")}`
        }
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(updateProductBrand.execute as jest.Mock).toHaveBeenCalledWith({
      brandId: "brand-id",
      name: undefined,
      description: undefined,
      image: {
        fileName: "apple-banner.png",
        mimeType: "image/png",
        fileContents: Buffer.from("image")
      }
    });
    expect(body.data.image).toEqual({
      storage_path: "product-brands/apple/apple-banner.png",
      public_url:
        "https://example.supabase.co/storage/v1/object/public/product-brand-images/product-brands/apple/apple-banner.png",
      mime_type: "image/png",
      original_file_name: "apple-banner.png"
    });
  });

  it("returns image data in the seller brand list", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";

    const listAvailableProductBrands = {
      execute: jest.fn(async () => [makeBrand()])
    };
    const { server, baseUrl } = await createServer((app) => {
      app.use(
        "/sellers/product-brands",
        createProtectedSellerBrandRouter({
          listAvailableProductBrands
        })
      );
    });
    openServers.push(server);

    const response = await fetch(`${baseUrl}/sellers/product-brands`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      message: "Product brands fetched successfully.",
      data: [
        {
          id: "brand-id",
          name: "Apple",
          description: "Consumer electronics brand",
          image: {
            storage_path: "product-brands/apple/apple.jpg",
            public_url:
              "https://example.supabase.co/storage/v1/object/public/product-brand-images/product-brands/apple/apple.jpg",
            mime_type: "image/jpeg",
            original_file_name: "apple.jpg"
          },
          created_at: "2026-04-03T00:00:00.000Z",
          updated_at: "2026-04-03T00:00:00.000Z"
        }
      ]
    });
  });

  it("returns a slim public brand list for the product catalog", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";

    const listCatalogProductBrands = {
      execute: jest.fn(async () => [makeBrand()])
    };
    const { server, baseUrl } = await createServer((app) => {
      app.use(
        "/products",
        createProductRouter({
          getApprovedProductDetail: createUnusedUseCase() as never,
          listCatalogProductBrands: listCatalogProductBrands as never,
          listCatalogProductCategories: createUnusedUseCase() as never,
          listActiveSliders: createUnusedUseCase() as never,
          listApprovedProducts: createUnusedUseCase() as never,
          listApprovedProductsByBrandId: createUnusedUseCase() as never,
          listApprovedProductsByCategory: createUnusedUseCase() as never,
          searchApprovedProductSuggestions: createUnusedUseCase() as never
        })
      );
    });
    openServers.push(server);

    const response = await fetch(`${baseUrl}/products/brands`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      message: "Product brands fetched successfully.",
      data: [
        {
          id: "brand-id",
          name: "Apple",
          description: "Consumer electronics brand",
          image: {
            storage_path: "product-brands/apple/apple.jpg",
            public_url:
              "https://example.supabase.co/storage/v1/object/public/product-brand-images/product-brands/apple/apple.jpg",
            mime_type: "image/jpeg",
            original_file_name: "apple.jpg"
          },
          created_at: "2026-04-03T00:00:00.000Z",
          updated_at: "2026-04-03T00:00:00.000Z"
        }
      ]
    });
  });

  it("returns brand-specific validation errors from the admin brand endpoints", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";

    const updateProductBrand = {
      execute: jest.fn(async () => {
        throw new ProductBrandError(
          "Invalid product brand image content.",
          400,
          "image.file_base64"
        );
      })
    };
    const { server, baseUrl } = await createServer((app) => {
      app.use(
        "/admin",
        createAdminRouter(
          createAdminRouterDependencies({
            updateProductBrand
          })
        )
      );
    });
    openServers.push(server);

    const response = await fetch(`${baseUrl}/admin/product-brands/brand-id`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        image: {
          file_name: "apple-banner.png",
          mime_type: "image/png",
          file_base64: ""
        }
      })
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      message: "Validation failed.",
      errors: expect.arrayContaining([
        expect.objectContaining({
          field: "image.file_base64"
        })
      ])
    });
  });
});
