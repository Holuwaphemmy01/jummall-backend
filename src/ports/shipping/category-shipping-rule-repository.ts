import type {
  CategoryShippingRuleDetailRecord,
  ShippingMethodType,
  ShippingRuleStatus
} from "./shipping-models";

export interface CreatePlatformCategoryShippingRuleInput {
  categoryId: string;
  methodType: ShippingMethodType;
  value: number;
}

export interface UpdatePlatformCategoryShippingRuleInput {
  ruleId: string;
  categoryId?: string;
  methodType?: ShippingMethodType;
  value?: number;
}

export interface UpdatePlatformCategoryShippingRuleStatusInput {
  ruleId: string;
  status: ShippingRuleStatus;
}

export interface CategoryShippingRuleRepository {
  createPlatform(
    input: CreatePlatformCategoryShippingRuleInput
  ): Promise<CategoryShippingRuleDetailRecord>;
  findAllPlatform(): Promise<CategoryShippingRuleDetailRecord[]>;
  findPlatformById(ruleId: string): Promise<CategoryShippingRuleDetailRecord | null>;
  findPlatformByCategoryId(
    categoryId: string
  ): Promise<CategoryShippingRuleDetailRecord | null>;
  updatePlatform(
    input: UpdatePlatformCategoryShippingRuleInput
  ): Promise<CategoryShippingRuleDetailRecord | null>;
  updatePlatformStatus(
    input: UpdatePlatformCategoryShippingRuleStatusInput
  ): Promise<CategoryShippingRuleDetailRecord | null>;
}
