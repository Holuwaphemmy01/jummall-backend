import type {
  ShippingSettingsRecord,
  ShippingSettingsRepository,
  UpdateShippingSettingsInput
} from "../../ports/shipping/shipping-settings-repository";
import { ShippingSettingsError } from "./shipping-settings-error";

export interface UpdateShippingSettingsUseCase {
  execute(input: UpdateShippingSettingsInput): Promise<ShippingSettingsRecord>;
}

export class UpdateShippingSettings
  implements UpdateShippingSettingsUseCase
{
  constructor(
    private readonly shippingSettingsRepository: ShippingSettingsRepository
  ) {}

  async execute(
    input: UpdateShippingSettingsInput
  ): Promise<ShippingSettingsRecord> {
    if (
      input.shippingMode === undefined &&
      input.categoryShippingMode === undefined &&
      input.vendorFallbackPolicy === undefined
    ) {
      throw new ShippingSettingsError(
        "At least one shipping setting must be provided.",
        400
      );
    }

    const existingSettings = await this.shippingSettingsRepository.get();

    if (!existingSettings) {
      throw new ShippingSettingsError("Shipping settings not found.", 404);
    }

    const updatedSettings = await this.shippingSettingsRepository.update(input);

    if (!updatedSettings) {
      throw new ShippingSettingsError("Shipping settings not found.", 404);
    }

    return updatedSettings;
  }
}
