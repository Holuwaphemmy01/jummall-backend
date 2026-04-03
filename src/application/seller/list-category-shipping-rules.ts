import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type { CategoryShippingRuleDetailRecord } from "../../ports/shipping/shipping-models";
import type { CategoryShippingRuleRepository } from "../../ports/shipping/category-shipping-rule-repository";
import type { ShippingSettingsRepository } from "../../ports/shipping/shipping-settings-repository";
import { ensureSellerShippingAccess } from "./shipping-configuration-helpers";

export interface ListSellerCategoryShippingRulesInput {
  sellerId: string;
}

export interface ListSellerCategoryShippingRulesUseCase {
  execute(
    input: ListSellerCategoryShippingRulesInput
  ): Promise<CategoryShippingRuleDetailRecord[]>;
}

export class ListSellerCategoryShippingRules
  implements ListSellerCategoryShippingRulesUseCase
{
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly shippingSettingsRepository: ShippingSettingsRepository,
    private readonly categoryShippingRuleRepository: CategoryShippingRuleRepository
  ) {}

  async execute(
    input: ListSellerCategoryShippingRulesInput
  ): Promise<CategoryShippingRuleDetailRecord[]> {
    await ensureSellerShippingAccess(
      input.sellerId,
      this.authenticationRepository,
      this.shippingSettingsRepository
    );

    return this.categoryShippingRuleRepository.findAllVendor(input.sellerId);
  }
}
