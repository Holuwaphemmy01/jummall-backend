import type { FreeShippingRuleRepository } from "../../ports/shipping/free-shipping-rule-repository";
import type {
  FreeShippingRuleRecord,
  FreeShippingRuleType
} from "../../ports/shipping/shipping-models";
import { normalizeFreeShippingRuleInput } from "./free-shipping-rule-helpers";
import { ShippingConfigurationError } from "./shipping-configuration-error";

export interface UpdateFreeShippingRuleInput {
  ruleId: string;
  name?: string;
  type?: FreeShippingRuleType;
  couponCode?: string | null;
  minimumOrderSubtotal?: number | null;
}

export interface UpdateFreeShippingRuleUseCase {
  execute(input: UpdateFreeShippingRuleInput): Promise<FreeShippingRuleRecord>;
}

export class UpdateFreeShippingRule implements UpdateFreeShippingRuleUseCase {
  constructor(
    private readonly freeShippingRuleRepository: FreeShippingRuleRepository
  ) {}

  async execute(
    input: UpdateFreeShippingRuleInput
  ): Promise<FreeShippingRuleRecord> {
    if (
      input.name === undefined &&
      input.type === undefined &&
      input.couponCode === undefined &&
      input.minimumOrderSubtotal === undefined
    ) {
      throw new ShippingConfigurationError(
        "At least one free shipping rule field must be provided.",
        400
      );
    }

    const existingRule = await this.freeShippingRuleRepository.findById(input.ruleId);

    if (!existingRule) {
      throw new ShippingConfigurationError("Free shipping rule not found.", 404);
    }

    const nextType = input.type ?? existingRule.type;
    const normalizedInput = normalizeFreeShippingRuleInput({
      name: input.name ?? existingRule.name,
      type: nextType,
      couponCode:
        nextType === "coupon"
          ? input.couponCode ?? existingRule.couponCode
          : null,
      minimumOrderSubtotal:
        nextType === "threshold"
          ? input.minimumOrderSubtotal ?? existingRule.minimumOrderSubtotal
          : null
    });

    if (normalizedInput.type === "coupon") {
      const existingRuleForCoupon =
        await this.freeShippingRuleRepository.findByCouponCode(
          normalizedInput.couponCode as string
        );

      if (existingRuleForCoupon && existingRuleForCoupon.id !== input.ruleId) {
        throw new ShippingConfigurationError(
          "A free shipping rule already exists for this coupon code.",
          409,
          "coupon_code"
        );
      }
    }

    if (
      normalizedInput.type === "threshold" &&
      existingRule.status === "active"
    ) {
      const activeThresholdRule =
        await this.freeShippingRuleRepository.findActiveThresholdRule();

      if (activeThresholdRule && activeThresholdRule.id !== input.ruleId) {
        throw new ShippingConfigurationError(
          "An active threshold free shipping rule already exists.",
          409,
          "type"
        );
      }
    }

    const updatedRule = await this.freeShippingRuleRepository.update({
      ruleId: input.ruleId,
      name: normalizedInput.name,
      type: normalizedInput.type,
      couponCode: normalizedInput.couponCode,
      minimumOrderSubtotal: normalizedInput.minimumOrderSubtotal
    });

    if (!updatedRule) {
      throw new ShippingConfigurationError("Free shipping rule not found.", 404);
    }

    return updatedRule;
  }
}
