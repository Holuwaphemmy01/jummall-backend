import type { ShippingMethodType, ShippingRuleStatus, ShippingZoneStatus } from "../../ports/shipping/shipping-models";
import type { ShippingZoneStateInput } from "../../ports/shipping/shipping-zone-repository";
import { ShippingConfigurationError } from "./shipping-configuration-error";

export function normalizeShippingZoneStates(
  states: ShippingZoneStateInput[]
): ShippingZoneStateInput[] {
  const seenStates = new Set<string>();

  return states.map((state, stateIndex) => {
    const normalizedStateName = state.stateName.trim();
    const normalizedStateKey = normalizedStateName.toLowerCase();

    if (seenStates.has(normalizedStateKey)) {
      throw new ShippingConfigurationError(
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
        throw new ShippingConfigurationError(
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

export function assertValidShippingRuleValue(
  methodType: ShippingMethodType,
  value: number
) {
  if (methodType === "percentage_based" && value > 100) {
    throw new ShippingConfigurationError(
      "Percentage-based shipping values cannot exceed 100.",
      400,
      "value"
    );
  }
}

export function assertValidShippingZoneStatus(status: string): asserts status is ShippingZoneStatus {
  if (status !== "active" && status !== "inactive") {
    throw new ShippingConfigurationError("Invalid shipping zone status.", 400);
  }
}

export function assertValidShippingRuleStatus(status: string): asserts status is ShippingRuleStatus {
  if (status !== "active" && status !== "inactive") {
    throw new ShippingConfigurationError("Invalid shipping rule status.", 400);
  }
}
