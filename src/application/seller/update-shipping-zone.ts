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

export interface UpdateSellerShippingZoneInput {
  sellerId: string;
  zoneId: string;
  name?: string;
  states?: ShippingZoneStateInput[];
}

export interface UpdateSellerShippingZoneUseCase {
  execute(input: UpdateSellerShippingZoneInput): Promise<ShippingZoneDetailRecord>;
}

export class UpdateSellerShippingZone
  implements UpdateSellerShippingZoneUseCase
{
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly shippingSettingsRepository: ShippingSettingsRepository,
    private readonly shippingZoneRepository: ShippingZoneRepository
  ) {}

  async execute(
    input: UpdateSellerShippingZoneInput
  ): Promise<ShippingZoneDetailRecord> {
    if (input.name === undefined && input.states === undefined) {
      throw new SellerShippingConfigurationError(
        "At least one shipping zone field must be provided.",
        400
      );
    }

    await ensureSellerShippingAccess(
      input.sellerId,
      this.authenticationRepository,
      this.shippingSettingsRepository
    );

    const existingZone = await this.shippingZoneRepository.findVendorById(
      input.sellerId,
      input.zoneId
    );

    if (!existingZone) {
      throw new SellerShippingConfigurationError("Shipping zone not found.", 404);
    }

    if (
      input.name &&
      input.name.trim().toLowerCase() !== existingZone.name.toLowerCase()
    ) {
      const zoneWithSameName = await this.shippingZoneRepository.findVendorByName(
        input.sellerId,
        input.name
      );

      if (zoneWithSameName) {
        throw new SellerShippingConfigurationError(
          "Shipping zone name already exists.",
          409,
          "name"
        );
      }
    }

    const updatedZone = await this.shippingZoneRepository.updateVendor({
      ownerId: input.sellerId,
      zoneId: input.zoneId,
      name: input.name?.trim(),
      states: input.states
        ? normalizeSellerShippingZoneStates(input.states)
        : undefined
    });

    if (!updatedZone) {
      throw new SellerShippingConfigurationError("Shipping zone not found.", 404);
    }

    return updatedZone;
  }
}
