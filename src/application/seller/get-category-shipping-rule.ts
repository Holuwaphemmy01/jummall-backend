import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type { CategoryShippingRuleDetailRecord } from "../../ports/shipping/shipping-models";
import type { CategoryShippingRuleRepository } from "../../ports/shipping/category-shipping-rule-repository";
import type { ShippingSettingsRepository } from "../../ports/shipping/shipping-settings-repository";
import { ensureSellerShippingAccess } from "./shipping-configuration-helpers";
import { SellerShippingConfigurationError } from "./shipping-configuration-error";

export interface GetSellerCategoryShippingRuleInput {
  sellerId: string;
  ruleId: string;
}

export interface GetSellerCategoryShippingRuleUseCase {
  execute(
    input: GetSellerCategoryShippingRuleInput
  ): Promise<CategoryShippingRuleDetailRecord>;
}

export class GetSellerCategoryShippingRule
  implements GetSellerCategoryShippingRuleUseCase
{
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly shippingSettingsRepository: ShippingSettingsRepository,
    private readonly categoryShippingRuleRepository: CategoryShippingRuleRepository
  ) {}

  async execute(
    input: GetSellerCategoryShippingRuleInput
  ): Promise<CategoryShippingRuleDetailRecord> {
    await ensureSellerShippingAccess(
      input.sellerId,
      this.authenticationRepository,
      this.shippingSettingsRepository
    );

    const rule = await this.categoryShippingRuleRepository.findVendorById(
      input.sellerId,
      input.ruleId
    );

    if (!rule) {
      throw new SellerShippingConfigurationError(
        "Category shipping rule not found.",
        404
      );
    }

    return rule;
  }
}
