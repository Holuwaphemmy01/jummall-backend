import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type { ProductCategoryRepository } from "../../ports/product-category-repository";
import { normalizeAndValidateSubtotalBands, type RawShippingSubtotalBandInput } from "../shipping/subtotal-band-helpers";
import type {
  ShippingMethodType,
  ShippingSubtotalBandInput,
  ShippingZoneDetailRecord
} from "../../ports/shipping/shipping-models";
import type { ShippingSettingsRepository } from "../../ports/shipping/shipping-settings-repository";
import type { ShippingZoneStateInput } from "../../ports/shipping/shipping-zone-repository";
import { SellerShippingConfigurationError } from "./shipping-configuration-error";

export async function ensureSellerShippingAccess(
  sellerId: string,
  authenticationRepository: AuthenticationRepository,
  shippingSettingsRepository: ShippingSettingsRepository
) {
  const seller = await authenticationRepository.findById(sellerId);

  if (!seller) {
    throw new SellerShippingConfigurationError(
      "Seller account not found.",
      404,
      "seller_id"
    );
  }

  if (seller.role !== "seller") {
    throw new SellerShippingConfigurationError(
      "Only sellers can manage shipping configuration.",
      403,
      "seller_id"
    );
  }

  const shippingSettings = await shippingSettingsRepository.get();

  if (!shippingSettings) {
    throw new SellerShippingConfigurationError(
      "Shipping settings not found.",
      404
    );
  }

  if (shippingSettings.shippingMode !== "VENDOR") {
    throw new SellerShippingConfigurationError(
      "Vendor shipping is currently disabled by admin.",
      403,
      "shipping_mode"
    );
  }
}

export function normalizeSellerShippingZoneStates(
  states: ShippingZoneStateInput[]
): ShippingZoneStateInput[] {
  const seenStates = new Set<string>();

  return states.map((state, stateIndex) => {
    const normalizedStateName = state.stateName.trim();
    const normalizedStateKey = normalizedStateName.toLowerCase();

    if (seenStates.has(normalizedStateKey)) {
      throw new SellerShippingConfigurationError(
        "Shipping zone states must be unique.",
        400,
        `states.${stateIndex}.state_name`
      );
    }

    seenStates.add(normalizedStateKey);

    const seenCities = new Set<string>();
    const normalizedCities = state.cities.map((cityName, cityIndex) => {
      const normalizedCityName = cityName.trim();
      const normalizedCityKey = normalizedCityName.toLowerCase();

      if (seenCities.has(normalizedCityKey)) {
        throw new SellerShippingConfigurationError(
          "Cities within the same state must be unique.",
          400,
          `states.${stateIndex}.cities.${cityIndex}`
        );
      }

      seenCities.add(normalizedCityKey);

      return normalizedCityName;
    });

    return {
      stateName: normalizedStateName,
      cities: normalizedCities
    };
  });
}

export function assertValidSellerShippingRuleValue(
  methodType: ShippingMethodType,
  value: number
) {
  if (methodType === "percentage_based" && value > 100) {
    throw new SellerShippingConfigurationError(
      "Percentage-based shipping values cannot exceed 100.",
      400,
      "value"
    );
  }
}

export function normalizeSellerShippingSubtotalBands(
  subtotalBands: RawShippingSubtotalBandInput[] | undefined
): ShippingSubtotalBandInput[] | undefined {
  const result = normalizeAndValidateSubtotalBands(subtotalBands);

  if (result.issue) {
    throw new SellerShippingConfigurationError(
      result.issue.message,
      400,
      result.issue.field
    );
  }

  return result.subtotalBands;
}

export async function assertSellerCategoryExists(
  categoryId: string,
  productCategoryRepository: ProductCategoryRepository
) {
  const category = await productCategoryRepository.findById(categoryId);

  if (!category) {
    throw new SellerShippingConfigurationError(
      "Product category not found.",
      404,
      "category_id"
    );
  }

  return category;
}

export async function assertSellerZoneExists(
  ownerId: string,
  zoneId: string,
  findVendorZone: (
    sellerId: string,
    candidateZoneId: string
  ) => Promise<ShippingZoneDetailRecord | null>
) {
  const zone = await findVendorZone(ownerId, zoneId);

  if (!zone) {
    throw new SellerShippingConfigurationError(
      "Shipping zone not found.",
      404,
      "zone_id"
    );
  }

  return zone;
}
