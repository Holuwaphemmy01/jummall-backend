import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type { ShippingZoneRuleDetailRecord } from "../../ports/shipping/shipping-models";
import type { ShippingSettingsRepository } from "../../ports/shipping/shipping-settings-repository";
import type { ShippingZoneRuleRepository } from "../../ports/shipping/shipping-zone-rule-repository";
import { ensureSellerShippingAccess } from "./shipping-configuration-helpers";
import { SellerShippingConfigurationError } from "./shipping-configuration-error";

export interface GetSellerShippingZoneRuleInput {
  sellerId: string;
  ruleId: string;
}

export interface GetSellerShippingZoneRuleUseCase {
  execute(
    input: GetSellerShippingZoneRuleInput
  ): Promise<ShippingZoneRuleDetailRecord>;
}

export class GetSellerShippingZoneRule
  implements GetSellerShippingZoneRuleUseCase
{
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly shippingSettingsRepository: ShippingSettingsRepository,
    private readonly shippingZoneRuleRepository: ShippingZoneRuleRepository
  ) {}

  async execute(
    input: GetSellerShippingZoneRuleInput
  ): Promise<ShippingZoneRuleDetailRecord> {
    await ensureSellerShippingAccess(
      input.sellerId,
      this.authenticationRepository,
      this.shippingSettingsRepository
    );

    const rule = await this.shippingZoneRuleRepository.findVendorById(
      input.sellerId,
      input.ruleId
    );

    if (!rule) {
      throw new SellerShippingConfigurationError(
        "Shipping zone rule not found.",
        404
      );
    }

    return rule;
  }
}
