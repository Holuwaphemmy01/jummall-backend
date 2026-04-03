import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type { ShippingZoneRuleDetailRecord } from "../../ports/shipping/shipping-models";
import type { ShippingSettingsRepository } from "../../ports/shipping/shipping-settings-repository";
import type { ShippingZoneRuleRepository } from "../../ports/shipping/shipping-zone-rule-repository";
import { ensureSellerShippingAccess } from "./shipping-configuration-helpers";

export interface ListSellerShippingZoneRulesInput {
  sellerId: string;
}

export interface ListSellerShippingZoneRulesUseCase {
  execute(
    input: ListSellerShippingZoneRulesInput
  ): Promise<ShippingZoneRuleDetailRecord[]>;
}

export class ListSellerShippingZoneRules
  implements ListSellerShippingZoneRulesUseCase
{
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly shippingSettingsRepository: ShippingSettingsRepository,
    private readonly shippingZoneRuleRepository: ShippingZoneRuleRepository
  ) {}

  async execute(
    input: ListSellerShippingZoneRulesInput
  ): Promise<ShippingZoneRuleDetailRecord[]> {
    await ensureSellerShippingAccess(
      input.sellerId,
      this.authenticationRepository,
      this.shippingSettingsRepository
    );

    return this.shippingZoneRuleRepository.findAllVendor(input.sellerId);
  }
}
