import type { RawShippingSubtotalBandInput } from "../shipping/subtotal-band-helpers";
import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type { ProductCategoryRepository } from "../../ports/product-category-repository";
import type {
  CategoryShippingRuleDetailRecord,
  ShippingMethodType
} from "../../ports/shipping/shipping-models";
import type { CategoryShippingRuleRepository } from "../../ports/shipping/category-shipping-rule-repository";
import type { ShippingSettingsRepository } from "../../ports/shipping/shipping-settings-repository";
import {
  assertSellerCategoryExists,
  normalizeSellerShippingSubtotalBands,
  assertValidSellerShippingRuleValue,
  ensureSellerShippingAccess
} from "./shipping-configuration-helpers";
import { SellerShippingConfigurationError } from "./shipping-configuration-error";

export interface UpdateSellerCategoryShippingRuleInput {
  sellerId: string;
  ruleId: string;
  categoryId?: string;
  methodType?: ShippingMethodType;
  value?: number;
  subtotalBands?: RawShippingSubtotalBandInput[];
}

export interface UpdateSellerCategoryShippingRuleUseCase {
  execute(
    input: UpdateSellerCategoryShippingRuleInput
  ): Promise<CategoryShippingRuleDetailRecord>;
}

export class UpdateSellerCategoryShippingRule
  implements UpdateSellerCategoryShippingRuleUseCase
{
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly shippingSettingsRepository: ShippingSettingsRepository,
    private readonly productCategoryRepository: ProductCategoryRepository,
    private readonly categoryShippingRuleRepository: CategoryShippingRuleRepository
  ) {}

  async execute(
    input: UpdateSellerCategoryShippingRuleInput
  ): Promise<CategoryShippingRuleDetailRecord> {
    if (
      input.categoryId === undefined &&
      input.methodType === undefined &&
      input.value === undefined &&
      input.subtotalBands === undefined
    ) {
      throw new SellerShippingConfigurationError(
        "At least one category shipping rule field must be provided.",
        400
      );
    }

    await ensureSellerShippingAccess(
      input.sellerId,
      this.authenticationRepository,
      this.shippingSettingsRepository
    );

    const existingRule = await this.categoryShippingRuleRepository.findVendorById(
      input.sellerId,
      input.ruleId
    );

    if (!existingRule) {
      throw new SellerShippingConfigurationError(
        "Category shipping rule not found.",
        404
      );
    }

    const nextCategoryId = input.categoryId ?? existingRule.categoryId;

    await assertSellerCategoryExists(
      nextCategoryId,
      this.productCategoryRepository
    );

    if (nextCategoryId !== existingRule.categoryId) {
      const existingRuleForCategory =
        await this.categoryShippingRuleRepository.findVendorByCategoryId(
          input.sellerId,
          nextCategoryId
        );

      if (existingRuleForCategory) {
        throw new SellerShippingConfigurationError(
          "A seller category shipping rule already exists for this category.",
          409,
          "category_id"
        );
      }
    }

    const nextMethodType = input.methodType ?? existingRule.methodType;
    const nextValue = input.value ?? existingRule.value;

    assertValidSellerShippingRuleValue(nextMethodType, nextValue);
    const subtotalBands = normalizeSellerShippingSubtotalBands(
      input.subtotalBands
    );

    const updatedRule = await this.categoryShippingRuleRepository.updateVendor({
      ownerId: input.sellerId,
      ruleId: input.ruleId,
      categoryId: input.categoryId,
      methodType: input.methodType,
      value: input.value,
      subtotalBands
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
