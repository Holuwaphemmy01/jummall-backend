import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type {
  ShippingRuleStatus,
  ShippingZoneRuleDetailRecord
} from "../../ports/shipping/shipping-models";
import type { ShippingSettingsRepository } from "../../ports/shipping/shipping-settings-repository";
import type { ShippingZoneRuleRepository } from "../../ports/shipping/shipping-zone-rule-repository";
import { ensureSellerShippingAccess } from "./shipping-configuration-helpers";
import { SellerShippingConfigurationError } from "./shipping-configuration-error";

export interface SetSellerShippingZoneRuleStatusInput {
  sellerId: string;
  ruleId: string;
  status: ShippingRuleStatus;
}

export interface SetSellerShippingZoneRuleStatusUseCase {
  execute(
    input: SetSellerShippingZoneRuleStatusInput
  ): Promise<ShippingZoneRuleDetailRecord>;
}

export class SetSellerShippingZoneRuleStatus
  implements SetSellerShippingZoneRuleStatusUseCase
{
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly shippingSettingsRepository: ShippingSettingsRepository,
    private readonly shippingZoneRuleRepository: ShippingZoneRuleRepository
  ) {}

  async execute(
    input: SetSellerShippingZoneRuleStatusInput
  ): Promise<ShippingZoneRuleDetailRecord> {
    await ensureSellerShippingAccess(
      input.sellerId,
      this.authenticationRepository,
      this.shippingSettingsRepository
    );

    const updatedRule = await this.shippingZoneRuleRepository.updateVendorStatus({
      ownerId: input.sellerId,
      ruleId: input.ruleId,
      status: input.status
    });

    if (!updatedRule) {
      throw new SellerShippingConfigurationError(
        "Shipping zone rule not found.",
        404
      );
    }

    return updatedRule;
  }
}
