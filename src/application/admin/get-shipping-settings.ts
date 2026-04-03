import type {
  ShippingSettingsRecord,
  ShippingSettingsRepository
} from "../../ports/shipping/shipping-settings-repository";
import { ShippingSettingsError } from "./shipping-settings-error";

export interface GetShippingSettingsUseCase {
  execute(): Promise<ShippingSettingsRecord>;
}

export class GetShippingSettings implements GetShippingSettingsUseCase {
  constructor(
    private readonly shippingSettingsRepository: ShippingSettingsRepository
  ) {}

  async execute(): Promise<ShippingSettingsRecord> {
    const settings = await this.shippingSettingsRepository.get();

    if (!settings) {
      throw new ShippingSettingsError("Shipping settings not found.", 404);
    }

    return settings;
  }
}
