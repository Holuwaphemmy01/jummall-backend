import type { ShippingZoneDetailRecord } from "../../ports/shipping/shipping-models";
import type {
  ShippingZoneRepository,
  ShippingZoneStateInput
} from "../../ports/shipping/shipping-zone-repository";
import { normalizeShippingZoneStates } from "./shipping-configuration-helpers";
import { ShippingConfigurationError } from "./shipping-configuration-error";

export interface UpdateShippingZoneInput {
  zoneId: string;
  name?: string;
  states?: ShippingZoneStateInput[];
}

export interface UpdateShippingZoneUseCase {
  execute(input: UpdateShippingZoneInput): Promise<ShippingZoneDetailRecord>;
}

export class UpdateShippingZone implements UpdateShippingZoneUseCase {
  constructor(private readonly shippingZoneRepository: ShippingZoneRepository) {}

  async execute(
    input: UpdateShippingZoneInput
  ): Promise<ShippingZoneDetailRecord> {
    if (input.name === undefined && input.states === undefined) {
      throw new ShippingConfigurationError(
        "At least one shipping zone field must be provided.",
        400
      );
    }

    const existingZone = await this.shippingZoneRepository.findPlatformById(
      input.zoneId
    );

    if (!existingZone) {
      throw new ShippingConfigurationError("Shipping zone not found.", 404);
    }

    if (
      input.name &&
      input.name.trim().toLowerCase() !== existingZone.name.toLowerCase()
    ) {
      const zoneWithSameName =
        await this.shippingZoneRepository.findPlatformByName(input.name);

      if (zoneWithSameName) {
        throw new ShippingConfigurationError(
          "Shipping zone name already exists.",
          409,
          "name"
        );
      }
    }

    const updatedZone = await this.shippingZoneRepository.updatePlatform({
      zoneId: input.zoneId,
      name: input.name?.trim(),
      states: input.states
        ? normalizeShippingZoneStates(input.states)
        : undefined
    });

    if (!updatedZone) {
      throw new ShippingConfigurationError("Shipping zone not found.", 404);
    }

    return updatedZone;
  }
}
