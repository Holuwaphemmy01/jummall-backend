import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type {
  CategoryShippingRuleDetailRecord,
  ShippingRuleStatus
} from "../../ports/shipping/shipping-models";
import type { CategoryShippingRuleRepository } from "../../ports/shipping/category-shipping-rule-repository";
import type { ShippingSettingsRepository } from "../../ports/shipping/shipping-settings-repository";
import { ensureSellerShippingAccess } from "./shipping-configuration-helpers";
import { SellerShippingConfigurationError } from "./shipping-configuration-error";

export interface SetSellerCategoryShippingRuleStatusInput {
  sellerId: string;
  ruleId: string;
  status: ShippingRuleStatus;
}

export interface SetSellerCategoryShippingRuleStatusUseCase {
  execute(
    input: SetSellerCategoryShippingRuleStatusInput
  ): Promise<CategoryShippingRuleDetailRecord>;
}

export class SetSellerCategoryShippingRuleStatus
  implements SetSellerCategoryShippingRuleStatusUseCase
{
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly shippingSettingsRepository: ShippingSettingsRepository,
    private readonly categoryShippingRuleRepository: CategoryShippingRuleRepository
  ) {}

  async execute(
    input: SetSellerCategoryShippingRuleStatusInput
  ): Promise<CategoryShippingRuleDetailRecord> {
    await ensureSellerShippingAccess(
      input.sellerId,
      this.authenticationRepository,
      this.shippingSettingsRepository
    );

    const updatedRule =
      await this.categoryShippingRuleRepository.updateVendorStatus({
        ownerId: input.sellerId,
        ruleId: input.ruleId,
        status: input.status
      });

    if (!updatedRule) {
      throw new SellerShippingConfigurationError(
        "Category shipping rule not found.",
        404
      );
    }

    return updatedRule;
  }
}
