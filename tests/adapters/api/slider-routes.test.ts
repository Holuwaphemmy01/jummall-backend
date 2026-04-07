import { afterEach, describe, expect, it, jest } from "@jest/globals";
import express from "express";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";

import { SliderError } from "../../../src/application/admin/slider-errors";
import createAdminRouter from "../../../src/infrastructure/api/routes/admin-routes";
import createProductRouter from "../../../src/infrastructure/api/routes/product-routes";
import type { SliderRecord } from "../../../src/ports/slider-repository";

function makeSlider(overrides: Partial<SliderRecord> = {}): SliderRecord {
  return {
    id: "slider-id",
    title: "Mega Sale",
    description: "Biggest deals of the week",
    subtitle: "Starting at N250,000",
    buttonLabel: "Shop Now",
    backgroundColor: "rgb(227, 237, 246)",
    isLight: true,
    displayOrder: 1,
    status: "inactive",
    image: {
      storagePath: "sliders/mega-sale/banner.jpg",
      mimeType: "image/jpeg",
      originalFileName: "banner.jpg"
    },
    createdAt: new Date("2026-04-07T00:00:00.000Z"),
    updatedAt: new Date("2026-04-07T00:00:00.000Z"),
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

describe("slider routes", () => {
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

  it("creates a slider through the admin route", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";

    const createSlider = {
      execute: jest.fn(async () => makeSlider())
    };

    const { server, baseUrl } = await createServer((app) => {
      app.use((_req, res, next) => {
        res.locals.authUser = {
          sub: "admin-id",
          role: "admin"
        };
        next();
      });
      app.use(
        "/admin",
        createAdminRouter(
          createAdminRouterDependencies({
            createSlider
          })
        )
      );
    });
    openServers.push(server);

    const response = await fetch(`${baseUrl}/admin/sliders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: "Mega Sale",
        description: "Biggest deals of the week",
        subtitle: "Starting at N250,000",
        button_label: "Shop Now",
        background_color: "rgb(227, 237, 246)",
        is_light: true,
        display_order: 1,
        image: {
          file_name: "banner.jpg",
          mime_type: "image/jpeg",
          file_base64: `data:image/jpeg;base64,${Buffer.from("image").toString("base64")}`
        }
      })
    });
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(createSlider.execute as jest.Mock).toHaveBeenCalledWith({
      title: "Mega Sale",
      description: "Biggest deals of the week",
      subtitle: "Starting at N250,000",
      buttonLabel: "Shop Now",
      backgroundColor: "rgb(227, 237, 246)",
      isLight: true,
      displayOrder: 1,
      image: {
        fileName: "banner.jpg",
        mimeType: "image/jpeg",
        fileContents: Buffer.from("image")
      }
    });
    expect(body.data).toEqual({
      id: "slider-id",
      title: "Mega Sale",
      description: "Biggest deals of the week",
      subtitle: "Starting at N250,000",
      button_label: "Shop Now",
      background_color: "rgb(227, 237, 246)",
      is_light: true,
      display_order: 1,
      status: "inactive",
      image: {
        storage_path: "sliders/mega-sale/banner.jpg",
        public_url:
          "https://example.supabase.co/storage/v1/object/public/slider-images/sliders/mega-sale/banner.jpg",
        mime_type: "image/jpeg",
        original_file_name: "banner.jpg"
      },
      created_at: "2026-04-07T00:00:00.000Z",
      updated_at: "2026-04-07T00:00:00.000Z"
    });
  });

  it("lists, gets, updates, and activates sliders through admin routes", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";

    const listSliders = {
      execute: jest.fn(async () => [makeSlider()])
    };
    const getSlider = {
      execute: jest.fn(async () => makeSlider())
    };
    const updateSlider = {
      execute: jest.fn(async () =>
        makeSlider({
          title: "Weekend Sale",
          subtitle: "Fresh arrivals this weekend",
          buttonLabel: "Explore Deals",
          backgroundColor: "rgb(17, 80, 97)",
          isLight: false,
          displayOrder: 2,
          image: {
            storagePath: "sliders/weekend-sale/weekend.png",
            mimeType: "image/png",
            originalFileName: "weekend.png"
          }
        })
      )
    };
    const setSliderStatus = {
      execute: jest.fn(async () =>
        makeSlider({
          status: "active"
        })
      )
    };

    const { server, baseUrl } = await createServer((app) => {
      app.use((_req, res, next) => {
        res.locals.authUser = {
          sub: "admin-id",
          role: "admin"
        };
        next();
      });
      app.use(
        "/admin",
        createAdminRouter(
          createAdminRouterDependencies({
            listSliders,
            getSlider,
            updateSlider,
            setSliderStatus
          })
        )
      );
    });
    openServers.push(server);

    const listResponse = await fetch(`${baseUrl}/admin/sliders`);
    expect(listResponse.status).toBe(200);

    const getResponse = await fetch(`${baseUrl}/admin/sliders/slider-id`);
    expect(getResponse.status).toBe(200);

    const patchResponse = await fetch(`${baseUrl}/admin/sliders/slider-id`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: "Weekend Sale",
        subtitle: "Fresh arrivals this weekend",
        button_label: "Explore Deals",
        background_color: "rgb(17, 80, 97)",
        is_light: false,
        display_order: 2,
        image: {
          file_name: "weekend.png",
          mime_type: "image/png",
          file_base64: `data:image/png;base64,${Buffer.from("new-image").toString("base64")}`
        }
      })
    });
    const patchBody = await patchResponse.json();

    const activateResponse = await fetch(`${baseUrl}/admin/sliders/slider-id/activate`, {
      method: "POST"
    });
    const activateBody = await activateResponse.json();

    expect(patchResponse.status).toBe(200);
    expect(patchBody.data).toEqual(
      expect.objectContaining({
        title: "Weekend Sale",
        subtitle: "Fresh arrivals this weekend",
        button_label: "Explore Deals",
        background_color: "rgb(17, 80, 97)",
        is_light: false,
        display_order: 2,
        image: expect.objectContaining({
          storage_path: "sliders/weekend-sale/weekend.png"
        })
      })
    );
    expect(activateResponse.status).toBe(200);
    expect(activateBody.data.status).toBe("active");
  });

  it("maps admin slider errors and validation failures", async () => {
    const { server, baseUrl } = await createServer((app) => {
      app.use((_req, res, next) => {
        res.locals.authUser = {
          sub: "admin-id",
          role: "admin"
        };
        next();
      });
      app.use(
        "/admin",
        createAdminRouter(
          createAdminRouterDependencies({
            getSlider: {
              execute: jest.fn(async () => {
                throw new SliderError("Slider not found.", 404, "sliderId");
              })
            }
          })
        )
      );
    });
    openServers.push(server);

    const invalidResponse = await fetch(`${baseUrl}/admin/sliders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        title: "A",
        description: "Short",
        display_order: -1
      })
    });
    expect(invalidResponse.status).toBe(400);

    const getResponse = await fetch(`${baseUrl}/admin/sliders/missing-slider-id`);
    const getBody = await getResponse.json();

    expect(getResponse.status).toBe(404);
    expect(getBody).toEqual({
      message: "Slider not found.",
      field: "sliderId"
    });
  });

  it("returns active sliders through the public slider endpoint", async () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";

    const listActiveSliders = {
      execute: jest.fn(async () => [
        makeSlider({
          status: "active"
        })
      ])
    };

    const { server, baseUrl } = await createServer((app) => {
      app.use(
        "/products",
        createProductRouter({
          getApprovedProductDetail: createUnusedUseCase() as never,
          listActiveSliders: listActiveSliders as never,
          listApprovedProducts: createUnusedUseCase() as never,
          listApprovedProductsByBrandId: createUnusedUseCase() as never,
          listApprovedProductsByCategory: createUnusedUseCase() as never,
          searchApprovedProductSuggestions: createUnusedUseCase() as never
        })
      );
    });
    openServers.push(server);

    const response = await fetch(`${baseUrl}/products/sliders`);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      message: "Sliders fetched successfully.",
      data: [
        {
          id: "slider-id",
          title: "Mega Sale",
          description: "Biggest deals of the week",
          subtitle: "Starting at N250,000",
          button_label: "Shop Now",
          background_color: "rgb(227, 237, 246)",
          is_light: true,
          display_order: 1,
          status: "active",
          image: {
            storage_path: "sliders/mega-sale/banner.jpg",
            public_url:
              "https://example.supabase.co/storage/v1/object/public/slider-images/sliders/mega-sale/banner.jpg",
            mime_type: "image/jpeg",
            original_file_name: "banner.jpg"
          },
          created_at: "2026-04-07T00:00:00.000Z",
          updated_at: "2026-04-07T00:00:00.000Z"
        }
      ]
    });
  });
});
