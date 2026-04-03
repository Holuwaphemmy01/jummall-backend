import type {
  ShippingSubtotalBandInput,
  ShippingMethodType,
  ShippingRuleStatus,
  ShippingZoneRuleDetailRecord
} from "./shipping-models";

export interface CreatePlatformShippingZoneRuleInput {
  zoneId: string;
  methodType: ShippingMethodType;
  value: number;
  subtotalBands?: ShippingSubtotalBandInput[];
}

export interface CreateVendorShippingZoneRuleInput {
  ownerId: string;
  zoneId: string;
  methodType: ShippingMethodType;
  value: number;
  subtotalBands?: ShippingSubtotalBandInput[];
}

export interface UpdatePlatformShippingZoneRuleInput {
  ruleId: string;
  zoneId?: string;
  methodType?: ShippingMethodType;
  value?: number;
  subtotalBands?: ShippingSubtotalBandInput[];
}

export interface UpdateVendorShippingZoneRuleInput {
  ownerId: string;
  ruleId: string;
  zoneId?: string;
  methodType?: ShippingMethodType;
  value?: number;
  subtotalBands?: ShippingSubtotalBandInput[];
}

export interface UpdatePlatformShippingZoneRuleStatusInput {
  ruleId: string;
  status: ShippingRuleStatus;
}

export interface UpdateVendorShippingZoneRuleStatusInput {
  ownerId: string;
  ruleId: string;
  status: ShippingRuleStatus;
}

export interface ShippingZoneRuleRepository {
  createPlatform(
    input: CreatePlatformShippingZoneRuleInput
  ): Promise<ShippingZoneRuleDetailRecord>;
  createVendor(
    input: CreateVendorShippingZoneRuleInput
  ): Promise<ShippingZoneRuleDetailRecord>;
  findAllPlatform(): Promise<ShippingZoneRuleDetailRecord[]>;
  findAllVendor(ownerId: string): Promise<ShippingZoneRuleDetailRecord[]>;
  findPlatformById(ruleId: string): Promise<ShippingZoneRuleDetailRecord | null>;
  findVendorById(
    ownerId: string,
    ruleId: string
  ): Promise<ShippingZoneRuleDetailRecord | null>;
  findPlatformByZoneId(
    zoneId: string
  ): Promise<ShippingZoneRuleDetailRecord | null>;
  findVendorByZoneId(
    ownerId: string,
    zoneId: string
  ): Promise<ShippingZoneRuleDetailRecord | null>;
  updatePlatform(
    input: UpdatePlatformShippingZoneRuleInput
  ): Promise<ShippingZoneRuleDetailRecord | null>;
  updateVendor(
    input: UpdateVendorShippingZoneRuleInput
  ): Promise<ShippingZoneRuleDetailRecord | null>;
  updatePlatformStatus(
    input: UpdatePlatformShippingZoneRuleStatusInput
  ): Promise<ShippingZoneRuleDetailRecord | null>;
  updateVendorStatus(
    input: UpdateVendorShippingZoneRuleStatusInput
  ): Promise<ShippingZoneRuleDetailRecord | null>;
}
