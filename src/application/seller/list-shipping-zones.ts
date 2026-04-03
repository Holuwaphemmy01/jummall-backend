import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type { ShippingZoneDetailRecord } from "../../ports/shipping/shipping-models";
import type { ShippingSettingsRepository } from "../../ports/shipping/shipping-settings-repository";
import type { ShippingZoneRepository } from "../../ports/shipping/shipping-zone-repository";
import { ensureSellerShippingAccess } from "./shipping-configuration-helpers";

export interface ListSellerShippingZonesInput {
  sellerId: string;
}

export interface ListSellerShippingZonesUseCase {
  execute(input: ListSellerShippingZonesInput): Promise<ShippingZoneDetailRecord[]>;
}

export class ListSellerShippingZones implements ListSellerShippingZonesUseCase {
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly shippingSettingsRepository: ShippingSettingsRepository,
    private readonly shippingZoneRepository: ShippingZoneRepository
  ) {}

  async execute(
    input: ListSellerShippingZonesInput
  ): Promise<ShippingZoneDetailRecord[]> {
    await ensureSellerShippingAccess(
      input.sellerId,
      this.authenticationRepository,
      this.shippingSettingsRepository
    );

    return this.shippingZoneRepository.findAllVendor(input.sellerId);
  }
}
