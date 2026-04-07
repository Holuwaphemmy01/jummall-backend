import { afterEach, describe, expect, it, jest } from "@jest/globals";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import { ProductCategoryError } from "../../../src/application/admin/product-category-errors";
import createAdminRouter from "../../../src/infrastructure/api/routes/admin-routes";
import { createProtectedSellerCategoryRouter } from "../../../src/infrastructure/api/routes/seller-routes";
import type { ProductCategoryRecord } from "../../../src/ports/product-category-repository";

function makeCategory(
  overrides: Partial<ProductCategoryRecord> = {}
): ProductCategoryRecord {
  return {
    id: "category-id",
    name: "Electronics",
    description: "Phones, gadgets, and accessories",
    deductionPercentage: 12.5,
    image: {
      storagePath: "product-categories/electronics/electronics.jpg",
      mimeType: "image/jpeg",
      originalFileName: "electronics.jpg"
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
    createProductBrand: createUnusedUseCase(),
    createProductCategory: createUnusedUseCase(),
    createShippingZone: createUnusedUseCase(),
    createShippingZoneRule: createUnusedUseCase(),
    getCategoryShippingRule: createUnusedUseCase(),
    getFreeShippingRule: createUnusedUseCase(),
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
    setShippingZoneRuleStatus: createUnusedUseCase(),
    setShippingZoneStatus: createUnusedUseCase(),
    updateCategoryShippingRule: createUnusedUseCase(),
    updateFreeShippingRule: createUnusedUseCase(),
    updateShippingZone: createUnusedUseCase(),
    updateShippingZoneRule: createUnusedUseCase(),
    updateShippingSettings: createUnusedUseCase(),
    updateOrderItemDeliveryStatus: createUnusedUseCase(),
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

describe("product category routes", () => {
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

  it("returns public image urls for category responses", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";

    const createProductCategory = {
      execute: jest.fn(async () => makeCategory())
    };
    const { server, baseUrl } = await createServer((app) => {
      app.use(
        "/admin",
        createAdminRouter(
          createAdminRouterDependencies({
            createProductCategory
          })
        )
      );
    });
    openServers.push(server);

    const response = await fetch(`${baseUrl}/admin/product-categories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: "Electronics",
        description: "Phones, gadgets, and accessories",
        deduction_percentage: 12.5,
        image: {
          file_name: "electronics.jpg",
          mime_type: "image/jpeg",
          file_base64: `data:image/jpeg;base64,${Buffer.from("image").toString("base64")}`
        }
      })
    });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.data.image).toEqual({
      storage_path: "product-categories/electronics/electronics.jpg",
      public_url:
        "https://example.supabase.co/storage/v1/object/public/product-category-images/product-categories/electronics/electronics.jpg",
      mime_type: "image/jpeg",
      original_file_name: "electronics.jpg"
    });
  });

  it("requires image in the admin create product category payload", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";

    const { server, baseUrl } = await createServer((app) => {
      app.use(
        "/admin",
        createAdminRouter(
          createAdminRouterDependencies({
            createProductCategory: {
              execute: jest.fn()
            }
          })
        )
      );
    });
    openServers.push(server);

    const response = await fetch(`${baseUrl}/admin/product-categories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: "Electronics",
        description: "Phones, gadgets, and accessories",
        deduction_percentage: 12.5
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

  it("returns image data when an admin creates a category", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";

    const createProductCategory = {
      execute: jest.fn(async () => makeCategory())
    };
    const { server, baseUrl } = await createServer((app) => {
      app.use(
        "/admin",
        createAdminRouter(
          createAdminRouterDependencies({
            createProductCategory
          })
        )
      );
    });
    openServers.push(server);

    const response = await fetch(`${baseUrl}/admin/product-categories`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: "Electronics",
        description: "Phones, gadgets, and accessories",
        deduction_percentage: 12.5,
        image: {
          file_name: "electronics.jpg",
          mime_type: "image/jpeg",
          file_base64: `data:image/jpeg;base64,${Buffer.from("image").toString("base64")}`
        }
      })
    });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(createProductCategory.execute as jest.Mock).toHaveBeenCalledWith({
      name: "Electronics",
      description: "Phones, gadgets, and accessories",
      deductionPercentage: 12.5,
      image: {
        fileName: "electronics.jpg",
        mimeType: "image/jpeg",
        fileContents: Buffer.from("image")
      }
    });
    expect(body).toEqual({
      message: "Product category created successfully.",
      data: {
        id: "category-id",
        name: "Electronics",
        description: "Phones, gadgets, and accessories",
        deduction_percentage: 12.5,
        image: {
          storage_path: "product-categories/electronics/electronics.jpg",
          public_url:
            "https://example.supabase.co/storage/v1/object/public/product-category-images/product-categories/electronics/electronics.jpg",
          mime_type: "image/jpeg",
          original_file_name: "electronics.jpg"
        },
        created_at: "2026-04-03T00:00:00.000Z",
        updated_at: "2026-04-03T00:00:00.000Z"
      }
    });
  });

  it("returns updated image data when an admin patches a category image", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";

    const updateProductCategory = {
      execute: jest.fn(async () =>
        makeCategory({
          image: {
            storagePath:
              "product-categories/electronics/electronics-banner.png",
            mimeType: "image/png",
            originalFileName: "electronics-banner.png"
          }
        })
      )
    };
    const { server, baseUrl } = await createServer((app) => {
      app.use(
        "/admin",
        createAdminRouter(
          createAdminRouterDependencies({
            updateProductCategory
          })
        )
      );
    });
    openServers.push(server);

    const response = await fetch(`${baseUrl}/admin/product-categories/category-id`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        image: {
          file_name: "electronics-banner.png",
          mime_type: "image/png",
          file_base64: `data:image/png;base64,${Buffer.from("new-image").toString("base64")}`
        }
      })
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(updateProductCategory.execute as jest.Mock).toHaveBeenCalledWith({
      categoryId: "category-id",
      name: undefined,
      description: undefined,
      deductionPercentage: undefined,
      image: {
        fileName: "electronics-banner.png",
        mimeType: "image/png",
        fileContents: Buffer.from("new-image")
      }
    });
    expect(body).toEqual({
      message: "Product category updated successfully.",
      data: {
        id: "category-id",
        name: "Electronics",
        description: "Phones, gadgets, and accessories",
        deduction_percentage: 12.5,
        image: {
          storage_path:
            "product-categories/electronics/electronics-banner.png",
          public_url:
            "https://example.supabase.co/storage/v1/object/public/product-category-images/product-categories/electronics/electronics-banner.png",
          mime_type: "image/png",
          original_file_name: "electronics-banner.png"
        },
        created_at: "2026-04-03T00:00:00.000Z",
        updated_at: "2026-04-03T00:00:00.000Z"
      }
    });
  });

  it("returns image data in the seller category list", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";

    const listAvailableProductCategories = {
      execute: jest.fn(async () => [makeCategory()])
    };
    const { server, baseUrl } = await createServer((app) => {
      app.use(
        "/sellers/product-categories",
        createProtectedSellerCategoryRouter({
          listAvailableProductCategories
        })
      );
    });
    openServers.push(server);

    const response = await fetch(`${baseUrl}/sellers/product-categories`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      message: "Product categories fetched successfully.",
      data: [
        {
          id: "category-id",
          name: "Electronics",
          description: "Phones, gadgets, and accessories",
          deduction_percentage: 12.5,
          image: {
            storage_path: "product-categories/electronics/electronics.jpg",
            public_url:
              "https://example.supabase.co/storage/v1/object/public/product-category-images/product-categories/electronics/electronics.jpg",
            mime_type: "image/jpeg",
            original_file_name: "electronics.jpg"
          },
          created_at: "2026-04-03T00:00:00.000Z",
          updated_at: "2026-04-03T00:00:00.000Z"
        }
      ]
    });
  });

  it("maps category image parse failures to a product-category validation response", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";

    const updateProductCategory = {
      execute: jest.fn()
    };
    const { server, baseUrl } = await createServer((app) => {
      app.use(
        "/admin",
        createAdminRouter(
          createAdminRouterDependencies({
            updateProductCategory
          })
        )
      );
    });
    openServers.push(server);

    const response = await fetch(`${baseUrl}/admin/product-categories/category-id`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        image: {
          file_name: "electronics-banner.png",
          mime_type: "image/png",
          file_base64: "data:image/png;base64,"
        }
      })
    });
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      message: "Invalid product category image content.",
      field: "image.file_base64"
    });
    expect(updateProductCategory.execute).not.toHaveBeenCalled();
  });
});
