import type { RawShippingSubtotalBandInput } from "../shipping/subtotal-band-helpers";
import type { ProductCategoryRepository } from "../../ports/product-category-repository";
import type { CategoryShippingRuleDetailRecord } from "../../ports/shipping/shipping-models";
import type { CategoryShippingRuleRepository } from "../../ports/shipping/category-shipping-rule-repository";
import {
  assertValidShippingRuleValue,
  normalizeShippingSubtotalBands
} from "./shipping-configuration-helpers";
import { ShippingConfigurationError } from "./shipping-configuration-error";

export interface CreateCategoryShippingRuleInput {
  categoryId: string;
  methodType: "fixed_rate" | "percentage_based";
  value: number;
  subtotalBands?: RawShippingSubtotalBandInput[];
}

export interface CreateCategoryShippingRuleUseCase {
  execute(
    input: CreateCategoryShippingRuleInput
  ): Promise<CategoryShippingRuleDetailRecord>;
}

export class CreateCategoryShippingRule
  implements CreateCategoryShippingRuleUseCase
{
  constructor(
    private readonly categoryShippingRuleRepository: CategoryShippingRuleRepository,
    private readonly productCategoryRepository: ProductCategoryRepository
  ) {}

  async execute(
    input: CreateCategoryShippingRuleInput
  ): Promise<CategoryShippingRuleDetailRecord> {
    const category = await this.productCategoryRepository.findById(
      input.categoryId
    );

    if (!category) {
      throw new ShippingConfigurationError(
        "Product category not found.",
        404,
        "category_id"
      );
    }

    const existingRule =
      await this.categoryShippingRuleRepository.findPlatformByCategoryId(
        input.categoryId
      );

    if (existingRule) {
      throw new ShippingConfigurationError(
        "A platform category shipping rule already exists for this category.",
        409,
        "category_id"
      );
    }

    assertValidShippingRuleValue(input.methodType, input.value);
    const subtotalBands = normalizeShippingSubtotalBands(input.subtotalBands);

    return this.categoryShippingRuleRepository.createPlatform({
      ...input,
      subtotalBands
    });
  }
}
