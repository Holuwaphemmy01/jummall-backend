import type { RawShippingSubtotalBandInput } from "../shipping/subtotal-band-helpers";
import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type { ProductCategoryRepository } from "../../ports/product-category-repository";
import type { CategoryShippingRuleDetailRecord } from "../../ports/shipping/shipping-models";
import type { CategoryShippingRuleRepository } from "../../ports/shipping/category-shipping-rule-repository";
import type { ShippingSettingsRepository } from "../../ports/shipping/shipping-settings-repository";
import {
  assertSellerCategoryExists,
  normalizeSellerShippingSubtotalBands,
  assertValidSellerShippingRuleValue,
  ensureSellerShippingAccess
} from "./shipping-configuration-helpers";
import { SellerShippingConfigurationError } from "./shipping-configuration-error";

export interface CreateSellerCategoryShippingRuleInput {
  sellerId: string;
  categoryId: string;
  methodType: "fixed_rate" | "percentage_based";
  value: number;
  subtotalBands?: RawShippingSubtotalBandInput[];
}

export interface CreateSellerCategoryShippingRuleUseCase {
  execute(
    input: CreateSellerCategoryShippingRuleInput
  ): Promise<CategoryShippingRuleDetailRecord>;
}

export class CreateSellerCategoryShippingRule
  implements CreateSellerCategoryShippingRuleUseCase
{
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly shippingSettingsRepository: ShippingSettingsRepository,
    private readonly productCategoryRepository: ProductCategoryRepository,
    private readonly categoryShippingRuleRepository: CategoryShippingRuleRepository
  ) {}

  async execute(
    input: CreateSellerCategoryShippingRuleInput
  ): Promise<CategoryShippingRuleDetailRecord> {
    await ensureSellerShippingAccess(
      input.sellerId,
      this.authenticationRepository,
      this.shippingSettingsRepository
    );

    await assertSellerCategoryExists(
      input.categoryId,
      this.productCategoryRepository
    );

    const existingRule =
      await this.categoryShippingRuleRepository.findVendorByCategoryId(
        input.sellerId,
        input.categoryId
      );

    if (existingRule) {
      throw new SellerShippingConfigurationError(
        "A seller category shipping rule already exists for this category.",
        409,
        "category_id"
      );
    }

    assertValidSellerShippingRuleValue(input.methodType, input.value);
    const subtotalBands = normalizeSellerShippingSubtotalBands(
      input.subtotalBands
    );

    return this.categoryShippingRuleRepository.createVendor({
      ownerId: input.sellerId,
      categoryId: input.categoryId,
      methodType: input.methodType,
      value: input.value,
      subtotalBands
    });
  }
}
