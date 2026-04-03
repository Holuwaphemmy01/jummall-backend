import type { ShippingZoneDetailRecord } from "../../ports/shipping/shipping-models";
import type { ShippingZoneRepository } from "../../ports/shipping/shipping-zone-repository";

export interface ListShippingZonesUseCase {
  execute(): Promise<ShippingZoneDetailRecord[]>;
}

export class ListShippingZones implements ListShippingZonesUseCase {
  constructor(private readonly shippingZoneRepository: ShippingZoneRepository) {}

  async execute(): Promise<ShippingZoneDetailRecord[]> {
    return this.shippingZoneRepository.findAllPlatform();
  }
}
