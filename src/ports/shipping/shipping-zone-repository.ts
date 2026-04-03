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

export interface CreateVendorShippingZoneInput {
  ownerId: string;
  name: string;
  states: ShippingZoneStateInput[];
}

export interface UpdatePlatformShippingZoneInput {
  zoneId: string;
  name?: string;
  states?: ShippingZoneStateInput[];
}

export interface UpdateVendorShippingZoneInput {
  ownerId: string;
  zoneId: string;
  name?: string;
  states?: ShippingZoneStateInput[];
}

export interface UpdatePlatformShippingZoneStatusInput {
  zoneId: string;
  status: ShippingZoneStatus;
}

export interface UpdateVendorShippingZoneStatusInput {
  ownerId: string;
  zoneId: string;
  status: ShippingZoneStatus;
}

export interface ShippingZoneRepository {
  createPlatform(input: CreatePlatformShippingZoneInput): Promise<ShippingZoneDetailRecord>;
  createVendor(input: CreateVendorShippingZoneInput): Promise<ShippingZoneDetailRecord>;
  findAllPlatform(): Promise<ShippingZoneDetailRecord[]>;
  findAllVendor(ownerId: string): Promise<ShippingZoneDetailRecord[]>;
  findPlatformById(zoneId: string): Promise<ShippingZoneDetailRecord | null>;
  findVendorById(
    ownerId: string,
    zoneId: string
  ): Promise<ShippingZoneDetailRecord | null>;
  findPlatformByName(name: string): Promise<ShippingZoneDetailRecord | null>;
  findVendorByName(
    ownerId: string,
    name: string
  ): Promise<ShippingZoneDetailRecord | null>;
  updatePlatform(
    input: UpdatePlatformShippingZoneInput
  ): Promise<ShippingZoneDetailRecord | null>;
  updateVendor(
    input: UpdateVendorShippingZoneInput
  ): Promise<ShippingZoneDetailRecord | null>;
  updatePlatformStatus(
    input: UpdatePlatformShippingZoneStatusInput
  ): Promise<ShippingZoneDetailRecord | null>;
  updateVendorStatus(
    input: UpdateVendorShippingZoneStatusInput
  ): Promise<ShippingZoneDetailRecord | null>;
}
