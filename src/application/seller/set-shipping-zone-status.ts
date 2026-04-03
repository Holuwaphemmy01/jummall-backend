import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type {
  ShippingZoneDetailRecord,
  ShippingZoneStatus
} from "../../ports/shipping/shipping-models";
import type { ShippingSettingsRepository } from "../../ports/shipping/shipping-settings-repository";
import type { ShippingZoneRepository } from "../../ports/shipping/shipping-zone-repository";
import { ensureSellerShippingAccess } from "./shipping-configuration-helpers";
import { SellerShippingConfigurationError } from "./shipping-configuration-error";

export interface SetSellerShippingZoneStatusInput {
  sellerId: string;
  zoneId: string;
  status: ShippingZoneStatus;
}

export interface SetSellerShippingZoneStatusUseCase {
  execute(
    input: SetSellerShippingZoneStatusInput
  ): Promise<ShippingZoneDetailRecord>;
}

export class SetSellerShippingZoneStatus
  implements SetSellerShippingZoneStatusUseCase
{
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly shippingSettingsRepository: ShippingSettingsRepository,
    private readonly shippingZoneRepository: ShippingZoneRepository
  ) {}

  async execute(
    input: SetSellerShippingZoneStatusInput
  ): Promise<ShippingZoneDetailRecord> {
    await ensureSellerShippingAccess(
      input.sellerId,
      this.authenticationRepository,
      this.shippingSettingsRepository
    );

    const updatedZone = await this.shippingZoneRepository.updateVendorStatus({
      ownerId: input.sellerId,
      zoneId: input.zoneId,
      status: input.status
    });

    if (!updatedZone) {
      throw new SellerShippingConfigurationError("Shipping zone not found.", 404);
    }

    return updatedZone;
  }
}
