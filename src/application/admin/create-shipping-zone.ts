import type { ShippingZoneDetailRecord } from "../../ports/shipping/shipping-models";
import type {
  ShippingZoneRepository,
  ShippingZoneStateInput
} from "../../ports/shipping/shipping-zone-repository";
import { normalizeShippingZoneStates } from "./shipping-configuration-helpers";
import { ShippingConfigurationError } from "./shipping-configuration-error";

export interface CreateShippingZoneInput {
  name: string;
  states: ShippingZoneStateInput[];
}

export interface CreateShippingZoneUseCase {
  execute(input: CreateShippingZoneInput): Promise<ShippingZoneDetailRecord>;
}

export class CreateShippingZone implements CreateShippingZoneUseCase {
  constructor(private readonly shippingZoneRepository: ShippingZoneRepository) {}

  async execute(
    input: CreateShippingZoneInput
  ): Promise<ShippingZoneDetailRecord> {
    const existingZone = await this.shippingZoneRepository.findPlatformByName(
      input.name
    );

    if (existingZone) {
      throw new ShippingConfigurationError(
        "Shipping zone name already exists.",
        409,
        "name"
      );
    }

    return this.shippingZoneRepository.createPlatform({
      name: input.name.trim(),
      states: normalizeShippingZoneStates(input.states)
    });
  }
}
