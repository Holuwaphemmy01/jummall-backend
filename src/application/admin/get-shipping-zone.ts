import type { ShippingZoneDetailRecord } from "../../ports/shipping/shipping-models";
import type { ShippingZoneRepository } from "../../ports/shipping/shipping-zone-repository";
import { ShippingConfigurationError } from "./shipping-configuration-error";

export interface GetShippingZoneInput {
  zoneId: string;
}

export interface GetShippingZoneUseCase {
  execute(input: GetShippingZoneInput): Promise<ShippingZoneDetailRecord>;
}

export class GetShippingZone implements GetShippingZoneUseCase {
  constructor(private readonly shippingZoneRepository: ShippingZoneRepository) {}

  async execute(input: GetShippingZoneInput): Promise<ShippingZoneDetailRecord> {
    const zone = await this.shippingZoneRepository.findPlatformById(
      input.zoneId
    );

    if (!zone) {
      throw new ShippingConfigurationError("Shipping zone not found.", 404);
    }

    return zone;
  }
}
