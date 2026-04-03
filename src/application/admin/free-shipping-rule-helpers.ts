import type { FreeShippingRuleType } from "../../ports/shipping/shipping-models";
import { ShippingConfigurationError } from "./shipping-configuration-error";

export interface NormalizeFreeShippingRuleInput {
  name: string;
  type: FreeShippingRuleType;
  couponCode?: string | null;
  minimumOrderSubtotal?: number | null;
}

export function normalizeFreeShippingRuleInput(
  input: NormalizeFreeShippingRuleInput
): {
  name: string;
  type: FreeShippingRuleType;
  couponCode: string | null;
  minimumOrderSubtotal: number | null;
} {
  const name = input.name.trim();
  const normalizedCouponCode = input.couponCode?.trim().toUpperCase() ?? null;
  const minimumOrderSubtotal = input.minimumOrderSubtotal ?? null;

  if (input.type === "coupon") {
    if (!normalizedCouponCode) {
      throw new ShippingConfigurationError(
        "Coupon code is required for coupon free shipping rules.",
        400,
        "coupon_code"
      );
    }

    return {
      name,
      type: input.type,
      couponCode: normalizedCouponCode,
      minimumOrderSubtotal: null
    };
  }

  if (minimumOrderSubtotal === null) {
    throw new ShippingConfigurationError(
      "Minimum order subtotal is required for threshold free shipping rules.",
      400,
      "minimum_order_subtotal"
    );
  }

  return {
    name,
    type: input.type,
    couponCode: null,
    minimumOrderSubtotal
  };
}
