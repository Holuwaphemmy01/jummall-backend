import { describe, expect, it, jest } from "@jest/globals";

import { GetShippingSettings } from "../../../src/application/admin/get-shipping-settings";
import { ShippingSettingsError } from "../../../src/application/admin/shipping-settings-error";
import type {
  ShippingSettingsRecord,
  ShippingSettingsRepository,
  UpdateShippingSettingsInput
} from "../../../src/ports/shipping/shipping-settings-repository";

class ShippingSettingsRepositoryDouble implements ShippingSettingsRepository {
  get = jest.fn<() => Promise<ShippingSettingsRecord | null>>().mockResolvedValue({
    id: "shipping-settings",
    shippingMode: "PLATFORM",
    categoryShippingMode: "HIGHEST",
    vendorFallbackPolicy: "BLOCK_CHECKOUT",
    createdAt: new Date("2026-04-02T00:00:00.000Z"),
    updatedAt: new Date("2026-04-02T00:00:00.000Z")
  });

  update = jest
    .fn<(input: UpdateShippingSettingsInput) => Promise<ShippingSettingsRecord | null>>()
    .mockResolvedValue(null);
}

describe("GetShippingSettings", () => {
  it("returns the current shipping settings", async () => {
    const repository = new ShippingSettingsRepositoryDouble();
    const getShippingSettings = new GetShippingSettings(repository);

    const result = await getShippingSettings.execute();

    expect(repository.get).toHaveBeenCalled();
    expect(result).toMatchObject({
      shippingMode: "PLATFORM",
      categoryShippingMode: "HIGHEST",
      vendorFallbackPolicy: "BLOCK_CHECKOUT"
    });
  });

  it("throws when shipping settings are missing", async () => {
    const repository = new ShippingSettingsRepositoryDouble();
    const getShippingSettings = new GetShippingSettings(repository);

    repository.get.mockResolvedValue(null);

    await expect(getShippingSettings.execute()).rejects.toBeInstanceOf(
      ShippingSettingsError
    );
  });
});
