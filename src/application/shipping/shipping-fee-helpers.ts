import type { CategoryShippingMode } from "../../ports/shipping/shipping-settings-repository";
import type {
  ShippingMethodType,
  ShippingSubtotalBandInput,
  ShippingSubtotalBandRecord
} from "../../ports/shipping/shipping-models";

type ShippingSubtotalBandLike =
  | ShippingSubtotalBandInput
  | ShippingSubtotalBandRecord;

export interface ShippingFeeRuleLike {
  methodType: ShippingMethodType;
  value: number;
  subtotalBands: ShippingSubtotalBandLike[];
}

export function selectMatchingSubtotalBand<T extends ShippingSubtotalBandLike>(
  subtotalBands: T[],
  subtotal: number
): T | null {
  for (const subtotalBand of subtotalBands) {
    const matchesLowerBound = subtotal >= subtotalBand.minSubtotal;
    const matchesUpperBound =
      subtotalBand.maxSubtotal === null || subtotal < subtotalBand.maxSubtotal;

    if (matchesLowerBound && matchesUpperBound) {
      return subtotalBand;
    }
  }

  return null;
}

export function calculateShippingAmount(
  methodType: ShippingMethodType,
  value: number,
  subtotalBase: number
): number {
  if (methodType === "fixed_rate") {
    return value;
  }

  return Math.round((subtotalBase * value) / 100);
}

export function calculateRuleShippingAmount(
  rule: ShippingFeeRuleLike,
  subtotalBase: number
):
  | {
      amount: number;
      matchedBand: ShippingSubtotalBandLike | null;
    }
  | null {
  if (rule.subtotalBands.length === 0) {
    return {
      amount: calculateShippingAmount(rule.methodType, rule.value, subtotalBase),
      matchedBand: null
    };
  }

  const matchedBand = selectMatchingSubtotalBand(rule.subtotalBands, subtotalBase);

  if (!matchedBand) {
    return null;
  }

  return {
    amount: calculateShippingAmount(
      matchedBand.methodType,
      matchedBand.value,
      subtotalBase
    ),
    matchedBand
  };
}

export function aggregateCategoryFees(
  categoryShippingMode: CategoryShippingMode,
  categoryFees: number[]
): number {
  if (categoryFees.length === 0) {
    return 0;
  }

  if (categoryShippingMode === "HIGHEST") {
    return Math.max(...categoryFees);
  }

  return categoryFees.reduce((sum, fee) => sum + fee, 0);
}
