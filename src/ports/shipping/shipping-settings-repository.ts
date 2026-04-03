export type ShippingMode = "PLATFORM" | "VENDOR";
export type CategoryShippingMode = "HIGHEST" | "ADDITIVE";
export type VendorFallbackPolicy = "USE_PLATFORM_RULES" | "BLOCK_CHECKOUT";

export interface ShippingSettingsRecord {
  id: string;
  shippingMode: ShippingMode;
  categoryShippingMode: CategoryShippingMode;
  vendorFallbackPolicy: VendorFallbackPolicy;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateShippingSettingsInput {
  shippingMode?: ShippingMode;
  categoryShippingMode?: CategoryShippingMode;
  vendorFallbackPolicy?: VendorFallbackPolicy;
}

export interface ShippingSettingsRepository {
  get(): Promise<ShippingSettingsRecord | null>;
  update(
    input: UpdateShippingSettingsInput
  ): Promise<ShippingSettingsRecord | null>;
}
