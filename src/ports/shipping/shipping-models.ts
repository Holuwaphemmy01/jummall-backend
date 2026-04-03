export type ShippingOwnerType = "platform" | "vendor";
export type ShippingZoneStatus = "active" | "inactive";
export type ShippingRuleStatus = "active" | "inactive";
export type ShippingMethodType = "fixed_rate" | "percentage_based";

export interface ShippingSubtotalBandInput {
  minSubtotal: number;
  maxSubtotal: number | null;
  methodType: ShippingMethodType;
  value: number;
}

export interface ShippingSubtotalBandRecord extends ShippingSubtotalBandInput {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShippingZoneRecord {
  id: string;
  ownerType: ShippingOwnerType;
  ownerId: string | null;
  name: string;
  status: ShippingZoneStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShippingZoneStateRecord {
  id: string;
  zoneId: string;
  stateName: string;
}

export interface ShippingZoneCityRecord {
  id: string;
  zoneStateId: string;
  cityName: string;
}

export interface ShippingZoneStateDetailRecord extends ShippingZoneStateRecord {
  cities: ShippingZoneCityRecord[];
}

export interface ShippingZoneDetailRecord extends ShippingZoneRecord {
  states: ShippingZoneStateDetailRecord[];
}

export interface ShippingZoneRuleRecord {
  id: string;
  zoneId: string;
  ownerType: ShippingOwnerType;
  ownerId: string | null;
  methodType: ShippingMethodType;
  value: number;
  status: ShippingRuleStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShippingZoneRuleDetailRecord extends ShippingZoneRuleRecord {
  zoneName: string;
  subtotalBands: ShippingSubtotalBandRecord[];
}

export interface CategoryShippingRuleRecord {
  id: string;
  categoryId: string;
  ownerType: ShippingOwnerType;
  ownerId: string | null;
  methodType: ShippingMethodType;
  value: number;
  status: ShippingRuleStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryShippingRuleDetailRecord
  extends CategoryShippingRuleRecord
{
  categoryName: string;
  subtotalBands: ShippingSubtotalBandRecord[];
}
