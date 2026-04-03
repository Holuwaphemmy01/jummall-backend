import type {
  FreeShippingRuleRecord,
  FreeShippingRuleStatus,
  FreeShippingRuleType
} from "./shipping-models";

export interface CreateFreeShippingRuleInput {
  name: string;
  type: FreeShippingRuleType;
  couponCode: string | null;
  minimumOrderSubtotal: number | null;
}

export interface UpdateFreeShippingRuleInput {
  ruleId: string;
  name?: string;
  type?: FreeShippingRuleType;
  couponCode?: string | null;
  minimumOrderSubtotal?: number | null;
}

export interface UpdateFreeShippingRuleStatusInput {
  ruleId: string;
  status: FreeShippingRuleStatus;
}

export interface FreeShippingRuleRepository {
  create(input: CreateFreeShippingRuleInput): Promise<FreeShippingRuleRecord>;
  findAll(): Promise<FreeShippingRuleRecord[]>;
  findById(ruleId: string): Promise<FreeShippingRuleRecord | null>;
  findByCouponCode(couponCode: string): Promise<FreeShippingRuleRecord | null>;
  findActiveByCouponCode(couponCode: string): Promise<FreeShippingRuleRecord | null>;
  findActiveThresholdRule(): Promise<FreeShippingRuleRecord | null>;
  update(input: UpdateFreeShippingRuleInput): Promise<FreeShippingRuleRecord | null>;
  updateStatus(
    input: UpdateFreeShippingRuleStatusInput
  ): Promise<FreeShippingRuleRecord | null>;
}
