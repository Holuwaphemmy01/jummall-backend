import type {
  ShippingZoneDetailRecord,
  ShippingZoneStatus
} from "./shipping-models";

export interface ShippingZoneStateInput {
  stateName: string;
  cities: string[];
}

export interface CreatePlatformShippingZoneInput {
  name: string;
  states: ShippingZoneStateInput[];
}

export interface UpdatePlatformShippingZoneInput {
  zoneId: string;
  name?: string;
  states?: ShippingZoneStateInput[];
}

export interface UpdatePlatformShippingZoneStatusInput {
  zoneId: string;
  status: ShippingZoneStatus;
}

export interface ShippingZoneRepository {
  createPlatform(input: CreatePlatformShippingZoneInput): Promise<ShippingZoneDetailRecord>;
  findAllPlatform(): Promise<ShippingZoneDetailRecord[]>;
  findPlatformById(zoneId: string): Promise<ShippingZoneDetailRecord | null>;
  findPlatformByName(name: string): Promise<ShippingZoneDetailRecord | null>;
  updatePlatform(
    input: UpdatePlatformShippingZoneInput
  ): Promise<ShippingZoneDetailRecord | null>;
  updatePlatformStatus(
    input: UpdatePlatformShippingZoneStatusInput
  ): Promise<ShippingZoneDetailRecord | null>;
}
