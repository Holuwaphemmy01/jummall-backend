import type { RawShippingSubtotalBandInput } from "../shipping/subtotal-band-helpers";
import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type {
  ShippingMethodType,
  ShippingZoneRuleDetailRecord
} from "../../ports/shipping/shipping-models";
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

export interface UpdateSellerShippingZoneRuleInput {
  sellerId: string;
  ruleId: string;
  zoneId?: string;
  methodType?: ShippingMethodType;
  value?: number;
  subtotalBands?: RawShippingSubtotalBandInput[];
}

export interface UpdateSellerShippingZoneRuleUseCase {
  execute(
    input: UpdateSellerShippingZoneRuleInput
  ): Promise<ShippingZoneRuleDetailRecord>;
}

export class UpdateSellerShippingZoneRule
  implements UpdateSellerShippingZoneRuleUseCase
{
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly shippingSettingsRepository: ShippingSettingsRepository,
    private readonly shippingZoneRepository: ShippingZoneRepository,
    private readonly shippingZoneRuleRepository: ShippingZoneRuleRepository
  ) {}

  async execute(
    input: UpdateSellerShippingZoneRuleInput
  ): Promise<ShippingZoneRuleDetailRecord> {
    if (
      input.zoneId === undefined &&
      input.methodType === undefined &&
      input.value === undefined &&
      input.subtotalBands === undefined
    ) {
      throw new SellerShippingConfigurationError(
        "At least one shipping zone rule field must be provided.",
        400
      );
    }

    await ensureSellerShippingAccess(
      input.sellerId,
      this.authenticationRepository,
      this.shippingSettingsRepository
    );

    const existingRule = await this.shippingZoneRuleRepository.findVendorById(
      input.sellerId,
      input.ruleId
    );

    if (!existingRule) {
      throw new SellerShippingConfigurationError(
        "Shipping zone rule not found.",
        404
      );
    }

    const nextZoneId = input.zoneId ?? existingRule.zoneId;

    await assertSellerZoneExists(
      input.sellerId,
      nextZoneId,
      (sellerId, zoneId) =>
        this.shippingZoneRepository.findVendorById(sellerId, zoneId)
    );

    if (nextZoneId !== existingRule.zoneId) {
      const existingRuleForZone =
        await this.shippingZoneRuleRepository.findVendorByZoneId(
          input.sellerId,
          nextZoneId
        );

      if (existingRuleForZone) {
        throw new SellerShippingConfigurationError(
          "A seller shipping zone rule already exists for this zone.",
          409,
          "zone_id"
        );
      }
    }

    const nextMethodType = input.methodType ?? existingRule.methodType;
    const nextValue = input.value ?? existingRule.value;

    assertValidSellerShippingRuleValue(nextMethodType, nextValue);
    const subtotalBands = normalizeSellerShippingSubtotalBands(
      input.subtotalBands
    );

    const updatedRule = await this.shippingZoneRuleRepository.updateVendor({
      ownerId: input.sellerId,
      ruleId: input.ruleId,
      zoneId: input.zoneId,
      methodType: input.methodType,
      value: input.value,
      subtotalBands
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
