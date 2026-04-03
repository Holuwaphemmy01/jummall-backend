import type { ShippingZoneRuleDetailRecord } from "../../ports/shipping/shipping-models";
import type { ShippingZoneRuleRepository } from "../../ports/shipping/shipping-zone-rule-repository";

export interface ListShippingZoneRulesUseCase {
  execute(): Promise<ShippingZoneRuleDetailRecord[]>;
}

export class ListShippingZoneRules implements ListShippingZoneRulesUseCase {
  constructor(
    private readonly shippingZoneRuleRepository: ShippingZoneRuleRepository
  ) {}

  async execute(): Promise<ShippingZoneRuleDetailRecord[]> {
    return this.shippingZoneRuleRepository.findAllPlatform();
  }
}
