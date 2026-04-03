import type { FreeShippingRuleRepository } from "../../ports/shipping/free-shipping-rule-repository";
import type {
  FreeShippingRuleRecord,
  FreeShippingRuleType
} from "../../ports/shipping/shipping-models";
import { normalizeFreeShippingRuleInput } from "./free-shipping-rule-helpers";
import { ShippingConfigurationError } from "./shipping-configuration-error";

export interface CreateFreeShippingRuleInput {
  name: string;
  type: FreeShippingRuleType;
  couponCode?: string | null;
  minimumOrderSubtotal?: number | null;
}

export interface CreateFreeShippingRuleUseCase {
  execute(input: CreateFreeShippingRuleInput): Promise<FreeShippingRuleRecord>;
}

export class CreateFreeShippingRule implements CreateFreeShippingRuleUseCase {
  constructor(
    private readonly freeShippingRuleRepository: FreeShippingRuleRepository
  ) {}

  async execute(
    input: CreateFreeShippingRuleInput
  ): Promise<FreeShippingRuleRecord> {
    const normalizedInput = normalizeFreeShippingRuleInput(input);

    if (normalizedInput.type === "coupon") {
      const existingRule = await this.freeShippingRuleRepository.findByCouponCode(
        normalizedInput.couponCode as string
      );

      if (existingRule) {
        throw new ShippingConfigurationError(
          "A free shipping rule already exists for this coupon code.",
          409,
          "coupon_code"
        );
      }
    }

    if (normalizedInput.type === "threshold") {
      const activeThresholdRule =
        await this.freeShippingRuleRepository.findActiveThresholdRule();

      if (activeThresholdRule) {
        throw new ShippingConfigurationError(
          "An active threshold free shipping rule already exists.",
          409,
          "type"
        );
      }
    }

    return this.freeShippingRuleRepository.create(normalizedInput);
  }
}
