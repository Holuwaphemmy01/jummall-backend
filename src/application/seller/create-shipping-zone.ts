import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type { ShippingZoneDetailRecord } from "../../ports/shipping/shipping-models";
import type { ShippingSettingsRepository } from "../../ports/shipping/shipping-settings-repository";
import type {
  ShippingZoneRepository,
  ShippingZoneStateInput
} from "../../ports/shipping/shipping-zone-repository";
import {
  ensureSellerShippingAccess,
  normalizeSellerShippingZoneStates
} from "./shipping-configuration-helpers";
import { SellerShippingConfigurationError } from "./shipping-configuration-error";

export interface CreateSellerShippingZoneInput {
  sellerId: string;
  name: string;
  states: ShippingZoneStateInput[];
}

export interface CreateSellerShippingZoneUseCase {
  execute(input: CreateSellerShippingZoneInput): Promise<ShippingZoneDetailRecord>;
}

export class CreateSellerShippingZone
  implements CreateSellerShippingZoneUseCase
{
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly shippingSettingsRepository: ShippingSettingsRepository,
    private readonly shippingZoneRepository: ShippingZoneRepository
  ) {}

  async execute(
    input: CreateSellerShippingZoneInput
  ): Promise<ShippingZoneDetailRecord> {
    await ensureSellerShippingAccess(
      input.sellerId,
      this.authenticationRepository,
      this.shippingSettingsRepository
    );

    const existingZone = await this.shippingZoneRepository.findVendorByName(
      input.sellerId,
      input.name
    );

    if (existingZone) {
      throw new SellerShippingConfigurationError(
        "Shipping zone name already exists.",
        409,
        "name"
      );
    }

    return this.shippingZoneRepository.createVendor({
      ownerId: input.sellerId,
      name: input.name.trim(),
      states: normalizeSellerShippingZoneStates(input.states)
    });
  }
}
