import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type { ShippingZoneDetailRecord } from "../../ports/shipping/shipping-models";
import type { ShippingSettingsRepository } from "../../ports/shipping/shipping-settings-repository";
import type { ShippingZoneRepository } from "../../ports/shipping/shipping-zone-repository";
import {
  assertSellerZoneExists,
  ensureSellerShippingAccess
} from "./shipping-configuration-helpers";

export interface GetSellerShippingZoneInput {
  sellerId: string;
  zoneId: string;
}

export interface GetSellerShippingZoneUseCase {
  execute(input: GetSellerShippingZoneInput): Promise<ShippingZoneDetailRecord>;
}

export class GetSellerShippingZone implements GetSellerShippingZoneUseCase {
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly shippingSettingsRepository: ShippingSettingsRepository,
    private readonly shippingZoneRepository: ShippingZoneRepository
  ) {}

  async execute(
    input: GetSellerShippingZoneInput
  ): Promise<ShippingZoneDetailRecord> {
    await ensureSellerShippingAccess(
      input.sellerId,
      this.authenticationRepository,
      this.shippingSettingsRepository
    );

    return assertSellerZoneExists(
      input.sellerId,
      input.zoneId,
      (sellerId, zoneId) =>
        this.shippingZoneRepository.findVendorById(sellerId, zoneId)
    );
  }
}
