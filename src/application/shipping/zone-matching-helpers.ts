import type { ShippingZoneDetailRecord } from "../../ports/shipping/shipping-models";

export type ShippingZoneMatchType = "city" | "state";
export type ShippingZoneMatchFailureReason =
  | "unsupported_location"
  | "ambiguous_location";

export interface ShippingZoneMatchResult {
  zone: ShippingZoneDetailRecord;
  matchType: ShippingZoneMatchType;
}

function determineZoneMatchType(
  zone: ShippingZoneDetailRecord,
  stateName: string,
  cityName: string | null
): ShippingZoneMatchType | null {
  const normalizedStateName = stateName.trim().toLowerCase();
  const normalizedCityName = cityName?.trim().toLowerCase() ?? null;
  let hasStateOnlyMatch = false;

  for (const state of zone.states) {
    if (state.stateName.trim().toLowerCase() !== normalizedStateName) {
      continue;
    }

    if (state.cities.length === 0) {
      hasStateOnlyMatch = true;
      continue;
    }

    if (!normalizedCityName) {
      continue;
    }

    if (
      state.cities.some(
        (city) => city.cityName.trim().toLowerCase() === normalizedCityName
      )
    ) {
      return "city";
    }
  }

  return hasStateOnlyMatch ? "state" : null;
}

export function selectBestZoneMatch(
  zones: ShippingZoneDetailRecord[],
  input: {
    stateName: string;
    cityName?: string | null;
  }
):
  | { match: ShippingZoneMatchResult; failureReason?: undefined }
  | { match?: undefined; failureReason: ShippingZoneMatchFailureReason } {
  const cityName = input.cityName ?? null;
  const matches = zones
    .map((zone) => ({
      zone,
      matchType: determineZoneMatchType(zone, input.stateName, cityName)
    }))
    .filter(
      (
        candidate
      ): candidate is {
        zone: ShippingZoneDetailRecord;
        matchType: ShippingZoneMatchType;
      } => candidate.matchType !== null
    );

  if (matches.length === 0) {
    return { failureReason: "unsupported_location" };
  }

  const cityMatches = matches.filter((match) => match.matchType === "city");

  if (cityMatches.length === 1) {
    return { match: cityMatches[0] };
  }

  if (cityMatches.length > 1) {
    return { failureReason: "ambiguous_location" };
  }

  if (matches.length === 1) {
    return { match: matches[0] };
  }

  return { failureReason: "ambiguous_location" };
}
