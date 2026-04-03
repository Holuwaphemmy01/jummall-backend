import type {
  CategoryShippingRuleDetailRecord,
  ShippingSubtotalBandInput,
  ShippingMethodType,
  ShippingRuleStatus
} from "./shipping-models";

export interface CreatePlatformCategoryShippingRuleInput {
  categoryId: string;
  methodType: ShippingMethodType;
  value: number;
  subtotalBands?: ShippingSubtotalBandInput[];
}

export interface CreateVendorCategoryShippingRuleInput {
  ownerId: string;
  categoryId: string;
  methodType: ShippingMethodType;
  value: number;
  subtotalBands?: ShippingSubtotalBandInput[];
}

export interface UpdatePlatformCategoryShippingRuleInput {
  ruleId: string;
  categoryId?: string;
  methodType?: ShippingMethodType;
  value?: number;
  subtotalBands?: ShippingSubtotalBandInput[];
}

export interface UpdateVendorCategoryShippingRuleInput {
  ownerId: string;
  ruleId: string;
  categoryId?: string;
  methodType?: ShippingMethodType;
  value?: number;
  subtotalBands?: ShippingSubtotalBandInput[];
}

export interface UpdatePlatformCategoryShippingRuleStatusInput {
  ruleId: string;
  status: ShippingRuleStatus;
}

export interface UpdateVendorCategoryShippingRuleStatusInput {
  ownerId: string;
  ruleId: string;
  status: ShippingRuleStatus;
}

export interface CategoryShippingRuleRepository {
  createPlatform(
    input: CreatePlatformCategoryShippingRuleInput
  ): Promise<CategoryShippingRuleDetailRecord>;
  createVendor(
    input: CreateVendorCategoryShippingRuleInput
  ): Promise<CategoryShippingRuleDetailRecord>;
  findAllPlatform(): Promise<CategoryShippingRuleDetailRecord[]>;
  findAllVendor(ownerId: string): Promise<CategoryShippingRuleDetailRecord[]>;
  findPlatformById(ruleId: string): Promise<CategoryShippingRuleDetailRecord | null>;
  findVendorById(
    ownerId: string,
    ruleId: string
  ): Promise<CategoryShippingRuleDetailRecord | null>;
  findPlatformByCategoryId(
    categoryId: string
  ): Promise<CategoryShippingRuleDetailRecord | null>;
  findVendorByCategoryId(
    ownerId: string,
    categoryId: string
  ): Promise<CategoryShippingRuleDetailRecord | null>;
  updatePlatform(
    input: UpdatePlatformCategoryShippingRuleInput
  ): Promise<CategoryShippingRuleDetailRecord | null>;
  updateVendor(
    input: UpdateVendorCategoryShippingRuleInput
  ): Promise<CategoryShippingRuleDetailRecord | null>;
  updatePlatformStatus(
    input: UpdatePlatformCategoryShippingRuleStatusInput
  ): Promise<CategoryShippingRuleDetailRecord | null>;
  updateVendorStatus(
    input: UpdateVendorCategoryShippingRuleStatusInput
  ): Promise<CategoryShippingRuleDetailRecord | null>;
}
