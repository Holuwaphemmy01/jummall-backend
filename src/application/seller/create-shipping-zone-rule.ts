import type { RawShippingSubtotalBandInput } from "../shipping/subtotal-band-helpers";
import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type { ShippingZoneRuleDetailRecord } from "../../ports/shipping/shipping-models";
import type { ShippingSettingsRepository } from "../../ports/shipping/shipping-settings-repository";
import type { ShippingZoneRepository } from "../../ports/shipping/shipping-zone-repository";
import type { ShippingZoneRuleRepository } from "../../ports/shipping/shipping-zone-rule-repository";
import {
  assertSellerZoneExists,
  normalizeSellerShippingSubtotalBands,
  assertValidSellerShippingRuleValue,
  ensureSellerShippingAccess
} from "./shipping-configuration-helpers";
import { SellerShippingConfigurationError } from "./shipping-configuration-error";

export interface CreateSellerShippingZoneRuleInput {
  sellerId: string;
  zoneId: string;
  methodType: "fixed_rate" | "percentage_based";
  value: number;
  subtotalBands?: RawShippingSubtotalBandInput[];
}

export interface CreateSellerShippingZoneRuleUseCase {
  execute(
    input: CreateSellerShippingZoneRuleInput
  ): Promise<ShippingZoneRuleDetailRecord>;
}

export class CreateSellerShippingZoneRule
  implements CreateSellerShippingZoneRuleUseCase
{
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly shippingSettingsRepository: ShippingSettingsRepository,
    private readonly shippingZoneRepository: ShippingZoneRepository,
    private readonly shippingZoneRuleRepository: ShippingZoneRuleRepository
  ) {}

  async execute(
    input: CreateSellerShippingZoneRuleInput
  ): Promise<ShippingZoneRuleDetailRecord> {
    await ensureSellerShippingAccess(
      input.sellerId,
      this.authenticationRepository,
      this.shippingSettingsRepository
    );

    await assertSellerZoneExists(
      input.sellerId,
      input.zoneId,
      (sellerId, zoneId) =>
        this.shippingZoneRepository.findVendorById(sellerId, zoneId)
    );

    const existingRule = await this.shippingZoneRuleRepository.findVendorByZoneId(
      input.sellerId,
      input.zoneId
    );

    if (existingRule) {
      throw new SellerShippingConfigurationError(
        "A seller shipping zone rule already exists for this zone.",
        409,
        "zone_id"
      );
    }

    assertValidSellerShippingRuleValue(input.methodType, input.value);
    const subtotalBands = normalizeSellerShippingSubtotalBands(
      input.subtotalBands
    );

    return this.shippingZoneRuleRepository.createVendor({
      ownerId: input.sellerId,
      zoneId: input.zoneId,
      methodType: input.methodType,
      value: input.value,
      subtotalBands
    });
  }
}
