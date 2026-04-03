import { describe, expect, it } from "@jest/globals";

import { CreateSellerShippingZone } from "../../../src/application/seller/create-shipping-zone";
import { GetSellerShippingZone } from "../../../src/application/seller/get-shipping-zone";
import { ListSellerShippingZones } from "../../../src/application/seller/list-shipping-zones";
import { SetSellerShippingZoneStatus } from "../../../src/application/seller/set-shipping-zone-status";
import { SellerShippingConfigurationError } from "../../../src/application/seller/shipping-configuration-error";
import { UpdateSellerShippingZone } from "../../../src/application/seller/update-shipping-zone";
import type {
  AuthenticationRepository,
  AuthUser
} from "../../../src/ports/authentication-repository";
import type {
  ShippingSettingsRecord,
  ShippingSettingsRepository
} from "../../../src/ports/shipping/shipping-settings-repository";
import type {
  CreatePlatformShippingZoneInput,
  CreateVendorShippingZoneInput,
  FindMatchingPlatformShippingZonesInput,
  FindMatchingVendorShippingZonesInput,
  ShippingZoneRepository,
  UpdatePlatformShippingZoneInput,
  UpdatePlatformShippingZoneStatusInput,
  UpdateVendorShippingZoneInput,
  UpdateVendorShippingZoneStatusInput
} from "../../../src/ports/shipping/shipping-zone-repository";
import type { ShippingZoneDetailRecord } from "../../../src/ports/shipping/shipping-models";

class AuthenticationRepositoryDouble implements AuthenticationRepository {
  constructor(private readonly user: AuthUser | null = makeSeller()) {}

  async findByEmail(): Promise<AuthUser | null> {
    return null;
  }

  async findById(): Promise<AuthUser | null> {
    return this.user;
  }

  async updatePassword(): Promise<void> {}
}

class ShippingSettingsRepositoryDouble implements ShippingSettingsRepository {
  constructor(
    private readonly settings: ShippingSettingsRecord | null = makeSettings("VENDOR")
  ) {}

  async get(): Promise<ShippingSettingsRecord | null> {
    return this.settings;
  }

  async update() {
    return this.settings;
  }
}

class ShippingZoneRepositoryDouble implements ShippingZoneRepository {
  private vendorZones: ShippingZoneDetailRecord[] = [
    makeZone({ id: "zone-1", ownerId: "seller-id", name: "Lagos Seller Zone" })
  ];

  async createPlatform(
    _input: CreatePlatformShippingZoneInput
  ): Promise<ShippingZoneDetailRecord> {
    throw new Error("Not implemented.");
  }

  async createVendor(
    input: CreateVendorShippingZoneInput
  ): Promise<ShippingZoneDetailRecord> {
    const zone = makeZone({
      id: `zone-${this.vendorZones.length + 1}`,
      ownerId: input.ownerId,
      name: input.name,
      states: input.states.map((state, index) => ({
        id: `state-${index + 1}`,
        zoneId: `zone-${this.vendorZones.length + 1}`,
        stateName: state.stateName,
        cities: state.cities.map((cityName, cityIndex) => ({
          id: `city-${index + 1}-${cityIndex + 1}`,
          zoneStateId: `state-${index + 1}`,
          cityName
        }))
      }))
    });

    this.vendorZones.push(zone);
    return zone;
  }

  async findAllPlatform(): Promise<ShippingZoneDetailRecord[]> {
    return [];
  }

  async findAllVendor(ownerId: string): Promise<ShippingZoneDetailRecord[]> {
    return this.vendorZones.filter((zone) => zone.ownerId === ownerId);
  }

  async findMatchingActivePlatform(
    _input: FindMatchingPlatformShippingZonesInput
  ): Promise<ShippingZoneDetailRecord[]> {
    return [];
  }

  async findMatchingActiveVendor(
    input: FindMatchingVendorShippingZonesInput
  ): Promise<ShippingZoneDetailRecord[]> {
    return this.vendorZones.filter((zone) => zone.ownerId === input.ownerId);
  }

  async findPlatformById(): Promise<ShippingZoneDetailRecord | null> {
    return null;
  }

  async findVendorById(
    ownerId: string,
    zoneId: string
  ): Promise<ShippingZoneDetailRecord | null> {
    return (
      this.vendorZones.find(
        (zone) => zone.ownerId === ownerId && zone.id === zoneId
      ) ?? null
    );
  }

  async findPlatformByName(): Promise<ShippingZoneDetailRecord | null> {
    return null;
  }

  async findVendorByName(
    ownerId: string,
    name: string
  ): Promise<ShippingZoneDetailRecord | null> {
    return (
      this.vendorZones.find(
        (zone) =>
          zone.ownerId === ownerId &&
          zone.name.toLowerCase() === name.toLowerCase()
      ) ?? null
    );
  }

  async updatePlatform(
    _input: UpdatePlatformShippingZoneInput
  ): Promise<ShippingZoneDetailRecord | null> {
    return null;
  }

  async updateVendor(
    input: UpdateVendorShippingZoneInput
  ): Promise<ShippingZoneDetailRecord | null> {
    const zone = await this.findVendorById(input.ownerId, input.zoneId);

    if (!zone) {
      return null;
    }

    zone.name = input.name ?? zone.name;
    zone.states =
      input.states?.map((state, index) => ({
        id: `updated-state-${index + 1}`,
        zoneId: zone.id,
        stateName: state.stateName,
        cities: state.cities.map((cityName, cityIndex) => ({
          id: `updated-city-${index + 1}-${cityIndex + 1}`,
          zoneStateId: `updated-state-${index + 1}`,
          cityName
        }))
      })) ?? zone.states;
    zone.updatedAt = new Date("2026-04-03T01:00:00.000Z");

    return zone;
  }

  async updatePlatformStatus(
    _input: UpdatePlatformShippingZoneStatusInput
  ): Promise<ShippingZoneDetailRecord | null> {
    return null;
  }

  async updateVendorStatus(
    input: UpdateVendorShippingZoneStatusInput
  ): Promise<ShippingZoneDetailRecord | null> {
    const zone = await this.findVendorById(input.ownerId, input.zoneId);

    if (!zone) {
      return null;
    }

    zone.status = input.status;
    zone.updatedAt = new Date("2026-04-03T02:00:00.000Z");

    return zone;
  }
}

describe("seller shipping zones", () => {
  it("creates a seller shipping zone", async () => {
    const useCase = new CreateSellerShippingZone(
      new AuthenticationRepositoryDouble(),
      new ShippingSettingsRepositoryDouble(),
      new ShippingZoneRepositoryDouble()
    );

    const zone = await useCase.execute({
      sellerId: "seller-id",
      name: "Abuja Seller Zone",
      states: [{ stateName: "FCT", cities: ["Maitama"] }]
    });

    expect(zone.ownerId).toBe("seller-id");
    expect(zone.name).toBe("Abuja Seller Zone");
  });

  it("throws when vendor shipping mode is disabled", async () => {
    const useCase = new CreateSellerShippingZone(
      new AuthenticationRepositoryDouble(),
      new ShippingSettingsRepositoryDouble(makeSettings("PLATFORM")),
      new ShippingZoneRepositoryDouble()
    );

    await expect(
      useCase.execute({
        sellerId: "seller-id",
        name: "Abuja Seller Zone",
        states: [{ stateName: "FCT", cities: [] }]
      })
    ).rejects.toBeInstanceOf(SellerShippingConfigurationError);
  });

  it("throws when the authenticated user is not a seller", async () => {
    const useCase = new CreateSellerShippingZone(
      new AuthenticationRepositoryDouble(makeSeller({ role: "buyer" })),
      new ShippingSettingsRepositoryDouble(),
      new ShippingZoneRepositoryDouble()
    );

    await expect(
      useCase.execute({
        sellerId: "seller-id",
        name: "Abuja Seller Zone",
        states: [{ stateName: "FCT", cities: [] }]
      })
    ).rejects.toBeInstanceOf(SellerShippingConfigurationError);
  });

  it("throws when creating a duplicate seller shipping zone name", async () => {
    const useCase = new CreateSellerShippingZone(
      new AuthenticationRepositoryDouble(),
      new ShippingSettingsRepositoryDouble(),
      new ShippingZoneRepositoryDouble()
    );

    await expect(
      useCase.execute({
        sellerId: "seller-id",
        name: "lagos seller zone",
        states: [{ stateName: "Lagos", cities: [] }]
      })
    ).rejects.toBeInstanceOf(SellerShippingConfigurationError);
  });

  it("lists seller-owned shipping zones", async () => {
    const useCase = new ListSellerShippingZones(
      new AuthenticationRepositoryDouble(),
      new ShippingSettingsRepositoryDouble(),
      new ShippingZoneRepositoryDouble()
    );

    const zones = await useCase.execute({ sellerId: "seller-id" });

    expect(zones).toHaveLength(1);
    expect(zones[0].name).toBe("Lagos Seller Zone");
  });

  it("throws when fetching a missing seller shipping zone", async () => {
    const useCase = new GetSellerShippingZone(
      new AuthenticationRepositoryDouble(),
      new ShippingSettingsRepositoryDouble(),
      new ShippingZoneRepositoryDouble()
    );

    await expect(
      useCase.execute({ sellerId: "seller-id", zoneId: "missing-zone" })
    ).rejects.toBeInstanceOf(SellerShippingConfigurationError);
  });

  it("updates a seller shipping zone", async () => {
    const useCase = new UpdateSellerShippingZone(
      new AuthenticationRepositoryDouble(),
      new ShippingSettingsRepositoryDouble(),
      new ShippingZoneRepositoryDouble()
    );

    const zone = await useCase.execute({
      sellerId: "seller-id",
      zoneId: "zone-1",
      name: "Lagos Mainland Seller Zone",
      states: [{ stateName: "Lagos", cities: ["Yaba"] }]
    });

    expect(zone.name).toBe("Lagos Mainland Seller Zone");
    expect(zone.states[0].cities[0].cityName).toBe("Yaba");
  });

  it("throws when updating a seller shipping zone without any changes", async () => {
    const useCase = new UpdateSellerShippingZone(
      new AuthenticationRepositoryDouble(),
      new ShippingSettingsRepositoryDouble(),
      new ShippingZoneRepositoryDouble()
    );

    await expect(
      useCase.execute({ sellerId: "seller-id", zoneId: "zone-1" })
    ).rejects.toBeInstanceOf(SellerShippingConfigurationError);
  });

  it("updates the seller shipping zone status", async () => {
    const useCase = new SetSellerShippingZoneStatus(
      new AuthenticationRepositoryDouble(),
      new ShippingSettingsRepositoryDouble(),
      new ShippingZoneRepositoryDouble()
    );

    const zone = await useCase.execute({
      sellerId: "seller-id",
      zoneId: "zone-1",
      status: "inactive"
    });

    expect(zone.status).toBe("inactive");
  });
});

function makeSeller(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: "seller-id",
    firstName: "Jane",
    lastName: "Doe",
    username: "jane.doe",
    email: "jane@example.com",
    phone: "+2348012345678",
    passwordHash: "hashed-password",
    role: "seller",
    accountStatus: "verified",
    createdAt: new Date("2026-04-03T00:00:00.000Z"),
    updatedAt: new Date("2026-04-03T00:00:00.000Z"),
    ...overrides
  };
}

function makeSettings(
  shippingMode: ShippingSettingsRecord["shippingMode"]
): ShippingSettingsRecord {
  return {
    id: "shipping-settings",
    shippingMode,
    categoryShippingMode: "HIGHEST",
    vendorFallbackPolicy: "BLOCK_CHECKOUT",
    createdAt: new Date("2026-04-03T00:00:00.000Z"),
    updatedAt: new Date("2026-04-03T00:00:00.000Z")
  };
}

function makeZone(
  overrides: Partial<ShippingZoneDetailRecord> = {}
): ShippingZoneDetailRecord {
  return {
    id: "zone-1",
    ownerType: "vendor",
    ownerId: "seller-id",
    name: "Lagos Seller Zone",
    status: "active",
    createdAt: new Date("2026-04-03T00:00:00.000Z"),
    updatedAt: new Date("2026-04-03T00:00:00.000Z"),
    states: [
      {
        id: "state-1",
        zoneId: "zone-1",
        stateName: "Lagos",
        cities: [
          {
            id: "city-1",
            zoneStateId: "state-1",
            cityName: "Ikeja"
          }
        ]
      }
    ],
    ...overrides
  };
}
