import type {
  ShippingMethodType,
  ShippingRuleStatus,
  ShippingZoneRuleDetailRecord
} from "./shipping-models";

export interface CreatePlatformShippingZoneRuleInput {
  zoneId: string;
  methodType: ShippingMethodType;
  value: number;
}

export interface UpdatePlatformShippingZoneRuleInput {
  ruleId: string;
  zoneId?: string;
  methodType?: ShippingMethodType;
  value?: number;
}

export interface UpdatePlatformShippingZoneRuleStatusInput {
  ruleId: string;
  status: ShippingRuleStatus;
}

export interface ShippingZoneRuleRepository {
  createPlatform(
    input: CreatePlatformShippingZoneRuleInput
  ): Promise<ShippingZoneRuleDetailRecord>;
  findAllPlatform(): Promise<ShippingZoneRuleDetailRecord[]>;
  findPlatformById(ruleId: string): Promise<ShippingZoneRuleDetailRecord | null>;
  findPlatformByZoneId(
    zoneId: string
  ): Promise<ShippingZoneRuleDetailRecord | null>;
  updatePlatform(
    input: UpdatePlatformShippingZoneRuleInput
  ): Promise<ShippingZoneRuleDetailRecord | null>;
  updatePlatformStatus(
    input: UpdatePlatformShippingZoneRuleStatusInput
  ): Promise<ShippingZoneRuleDetailRecord | null>;
}
