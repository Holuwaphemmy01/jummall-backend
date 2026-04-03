import type {
  ShippingZoneDetailRecord,
  ShippingZoneStatus
} from "../../ports/shipping/shipping-models";
import type { ShippingZoneRepository } from "../../ports/shipping/shipping-zone-repository";
import { ShippingConfigurationError } from "./shipping-configuration-error";

export interface SetShippingZoneStatusInput {
  zoneId: string;
  status: ShippingZoneStatus;
}

export interface SetShippingZoneStatusUseCase {
  execute(input: SetShippingZoneStatusInput): Promise<ShippingZoneDetailRecord>;
}

export class SetShippingZoneStatus implements SetShippingZoneStatusUseCase {
  constructor(private readonly shippingZoneRepository: ShippingZoneRepository) {}

  async execute(
    input: SetShippingZoneStatusInput
  ): Promise<ShippingZoneDetailRecord> {
    const updatedZone = await this.shippingZoneRepository.updatePlatformStatus(
      input
    );

    if (!updatedZone) {
      throw new ShippingConfigurationError("Shipping zone not found.", 404);
    }

    return updatedZone;
  }
}
