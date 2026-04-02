import { describe, expect, it, jest } from "@jest/globals";

import { ShippingSettingsError } from "../../../src/application/admin/shipping-settings-error";
import { UpdateShippingSettings } from "../../../src/application/admin/update-shipping-settings";
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
    .mockImplementation(async (input) => ({
      id: "shipping-settings",
      shippingMode: input.shippingMode ?? "PLATFORM",
      categoryShippingMode: input.categoryShippingMode ?? "HIGHEST",
      vendorFallbackPolicy: input.vendorFallbackPolicy ?? "BLOCK_CHECKOUT",
      createdAt: new Date("2026-04-02T00:00:00.000Z"),
      updatedAt: new Date("2026-04-02T01:00:00.000Z")
    }));
}

describe("UpdateShippingSettings", () => {
  it("updates the provided shipping settings fields", async () => {
    const repository = new ShippingSettingsRepositoryDouble();
    const updateShippingSettings = new UpdateShippingSettings(repository);

    const result = await updateShippingSettings.execute({
      shippingMode: "VENDOR",
      categoryShippingMode: "ADDITIVE",
      vendorFallbackPolicy: "USE_PLATFORM_RULES"
    });

    expect(repository.get).toHaveBeenCalled();
    expect(repository.update).toHaveBeenCalledWith({
      shippingMode: "VENDOR",
      categoryShippingMode: "ADDITIVE",
      vendorFallbackPolicy: "USE_PLATFORM_RULES"
    });
    expect(result).toMatchObject({
      shippingMode: "VENDOR",
      categoryShippingMode: "ADDITIVE",
      vendorFallbackPolicy: "USE_PLATFORM_RULES"
    });
  });

  it("throws when no shipping settings field is provided", async () => {
    const updateShippingSettings = new UpdateShippingSettings(
      new ShippingSettingsRepositoryDouble()
    );

    await expect(updateShippingSettings.execute({})).rejects.toBeInstanceOf(
      ShippingSettingsError
    );
  });

  it("throws when the shipping settings row is missing before update", async () => {
    const repository = new ShippingSettingsRepositoryDouble();
    const updateShippingSettings = new UpdateShippingSettings(repository);

    repository.get.mockResolvedValue(null);

    await expect(
      updateShippingSettings.execute({
        shippingMode: "VENDOR"
      })
    ).rejects.toBeInstanceOf(ShippingSettingsError);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it("throws when the shipping settings row disappears during update", async () => {
    const repository = new ShippingSettingsRepositoryDouble();
    const updateShippingSettings = new UpdateShippingSettings(repository);

    repository.update.mockResolvedValue(null);

    await expect(
      updateShippingSettings.execute({
        shippingMode: "VENDOR"
      })
    ).rejects.toBeInstanceOf(ShippingSettingsError);
  });
});
