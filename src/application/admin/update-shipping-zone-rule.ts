import type {
  ShippingMethodType,
  ShippingZoneRuleDetailRecord
} from "../../ports/shipping/shipping-models";
import type { ShippingZoneRepository } from "../../ports/shipping/shipping-zone-repository";
import type { ShippingZoneRuleRepository } from "../../ports/shipping/shipping-zone-rule-repository";
import { assertValidShippingRuleValue } from "./shipping-configuration-helpers";
import { ShippingConfigurationError } from "./shipping-configuration-error";

export interface UpdateShippingZoneRuleInput {
  ruleId: string;
  zoneId?: string;
  methodType?: ShippingMethodType;
  value?: number;
}

export interface UpdateShippingZoneRuleUseCase {
  execute(input: UpdateShippingZoneRuleInput): Promise<ShippingZoneRuleDetailRecord>;
}

export class UpdateShippingZoneRule implements UpdateShippingZoneRuleUseCase {
  constructor(
    private readonly shippingZoneRuleRepository: ShippingZoneRuleRepository,
    private readonly shippingZoneRepository: ShippingZoneRepository
  ) {}

  async execute(
    input: UpdateShippingZoneRuleInput
  ): Promise<ShippingZoneRuleDetailRecord> {
    if (
      input.zoneId === undefined &&
      input.methodType === undefined &&
      input.value === undefined
    ) {
      throw new ShippingConfigurationError(
        "At least one shipping zone rule field must be provided.",
        400
      );
    }

    const existingRule = await this.shippingZoneRuleRepository.findPlatformById(
      input.ruleId
    );

    if (!existingRule) {
      throw new ShippingConfigurationError("Shipping zone rule not found.", 404);
    }

    const nextZoneId = input.zoneId ?? existingRule.zoneId;

    const zone = await this.shippingZoneRepository.findPlatformById(nextZoneId);

    if (!zone) {
      throw new ShippingConfigurationError("Shipping zone not found.", 404, "zone_id");
    }

    if (nextZoneId !== existingRule.zoneId) {
      const ruleForZone =
        await this.shippingZoneRuleRepository.findPlatformByZoneId(nextZoneId);

      if (ruleForZone) {
        throw new ShippingConfigurationError(
          "A platform shipping zone rule already exists for this zone.",
          409,
          "zone_id"
        );
      }
    }

    const nextMethodType = input.methodType ?? existingRule.methodType;
    const nextValue = input.value ?? existingRule.value;

    assertValidShippingRuleValue(nextMethodType, nextValue);

    const updatedRule = await this.shippingZoneRuleRepository.updatePlatform({
      ruleId: input.ruleId,
      zoneId: input.zoneId,
      methodType: input.methodType,
      value: input.value
    });

    if (!updatedRule) {
      throw new ShippingConfigurationError("Shipping zone rule not found.", 404);
    }

    return updatedRule;
  }
}
