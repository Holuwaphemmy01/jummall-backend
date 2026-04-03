import type { ShippingZoneRuleDetailRecord } from "../../ports/shipping/shipping-models";
import type { ShippingZoneRepository } from "../../ports/shipping/shipping-zone-repository";
import type {
  ShippingZoneRuleRepository
} from "../../ports/shipping/shipping-zone-rule-repository";
import { assertValidShippingRuleValue } from "./shipping-configuration-helpers";
import { ShippingConfigurationError } from "./shipping-configuration-error";

export interface CreateShippingZoneRuleInput {
  zoneId: string;
  methodType: "fixed_rate" | "percentage_based";
  value: number;
}

export interface CreateShippingZoneRuleUseCase {
  execute(input: CreateShippingZoneRuleInput): Promise<ShippingZoneRuleDetailRecord>;
}

export class CreateShippingZoneRule implements CreateShippingZoneRuleUseCase {
  constructor(
    private readonly shippingZoneRuleRepository: ShippingZoneRuleRepository,
    private readonly shippingZoneRepository: ShippingZoneRepository
  ) {}

  async execute(
    input: CreateShippingZoneRuleInput
  ): Promise<ShippingZoneRuleDetailRecord> {
    const zone = await this.shippingZoneRepository.findPlatformById(input.zoneId);

    if (!zone) {
      throw new ShippingConfigurationError("Shipping zone not found.", 404, "zone_id");
    }

    const existingRule =
      await this.shippingZoneRuleRepository.findPlatformByZoneId(input.zoneId);

    if (existingRule) {
      throw new ShippingConfigurationError(
        "A platform shipping zone rule already exists for this zone.",
        409,
        "zone_id"
      );
    }

    assertValidShippingRuleValue(input.methodType, input.value);

    return this.shippingZoneRuleRepository.createPlatform(input);
  }
}
