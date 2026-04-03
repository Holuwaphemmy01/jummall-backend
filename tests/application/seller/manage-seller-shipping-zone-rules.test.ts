import { describe, expect, it } from "@jest/globals";

import { CreateSellerShippingZoneRule } from "../../../src/application/seller/create-shipping-zone-rule";
import { GetSellerShippingZoneRule } from "../../../src/application/seller/get-shipping-zone-rule";
import { ListSellerShippingZoneRules } from "../../../src/application/seller/list-shipping-zone-rules";
import { SetSellerShippingZoneRuleStatus } from "../../../src/application/seller/set-shipping-zone-rule-status";
import { SellerShippingConfigurationError } from "../../../src/application/seller/shipping-configuration-error";
import { UpdateSellerShippingZoneRule } from "../../../src/application/seller/update-shipping-zone-rule";
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
  ShippingZoneRepository,
  UpdatePlatformShippingZoneInput,
  UpdatePlatformShippingZoneStatusInput,
  UpdateVendorShippingZoneInput,
  UpdateVendorShippingZoneStatusInput
} from "../../../src/ports/shipping/shipping-zone-repository";
import type {
  CreatePlatformShippingZoneRuleInput,
  CreateVendorShippingZoneRuleInput,
  ShippingZoneRuleRepository,
  UpdatePlatformShippingZoneRuleInput,
  UpdatePlatformShippingZoneRuleStatusInput,
  UpdateVendorShippingZoneRuleInput,
  UpdateVendorShippingZoneRuleStatusInput
} from "../../../src/ports/shipping/shipping-zone-rule-repository";
import type {
  ShippingMethodType,
  ShippingZoneDetailRecord,
  ShippingZoneRuleDetailRecord
} from "../../../src/ports/shipping/shipping-models";

class AuthenticationRepositoryDouble implements AuthenticationRepository {
  async findByEmail(): Promise<AuthUser | null> {
    return null;
  }

  async findById(): Promise<AuthUser | null> {
    return makeSeller();
  }

  async updatePassword(): Promise<void> {}
}

class ShippingSettingsRepositoryDouble implements ShippingSettingsRepository {
  async get(): Promise<ShippingSettingsRecord | null> {
    return makeSettings("VENDOR");
  }

  async update() {
    return makeSettings("VENDOR");
  }
}

class ShippingZoneRepositoryDouble implements ShippingZoneRepository {
  private readonly zones: ShippingZoneDetailRecord[] = [
    makeZone({ id: "zone-1", name: "Lagos Seller Zone" }),
    makeZone({ id: "zone-2", name: "Abuja Seller Zone" })
  ];

  async createPlatform(
    _input: CreatePlatformShippingZoneInput
  ): Promise<ShippingZoneDetailRecord> {
    throw new Error("Not implemented.");
  }

  async createVendor(
    _input: CreateVendorShippingZoneInput
  ): Promise<ShippingZoneDetailRecord> {
    throw new Error("Not implemented.");
  }

  async findAllPlatform(): Promise<ShippingZoneDetailRecord[]> {
    return [];
  }

  async findAllVendor(ownerId: string): Promise<ShippingZoneDetailRecord[]> {
    return this.zones.filter((zone) => zone.ownerId === ownerId);
  }

  async findPlatformById(): Promise<ShippingZoneDetailRecord | null> {
    return null;
  }

  async findVendorById(
    ownerId: string,
    zoneId: string
  ): Promise<ShippingZoneDetailRecord | null> {
    return (
      this.zones.find(
        (zone) => zone.ownerId === ownerId && zone.id === zoneId
      ) ?? null
    );
  }

  async findPlatformByName(): Promise<ShippingZoneDetailRecord | null> {
    return null;
  }

  async findVendorByName(): Promise<ShippingZoneDetailRecord | null> {
    return null;
  }

  async updatePlatform(
    _input: UpdatePlatformShippingZoneInput
  ): Promise<ShippingZoneDetailRecord | null> {
    return null;
  }

  async updateVendor(
    _input: UpdateVendorShippingZoneInput
  ): Promise<ShippingZoneDetailRecord | null> {
    return null;
  }

  async updatePlatformStatus(
    _input: UpdatePlatformShippingZoneStatusInput
  ): Promise<ShippingZoneDetailRecord | null> {
    return null;
  }

  async updateVendorStatus(
    _input: UpdateVendorShippingZoneStatusInput
  ): Promise<ShippingZoneDetailRecord | null> {
    return null;
  }
}

class ShippingZoneRuleRepositoryDouble implements ShippingZoneRuleRepository {
  private readonly rules: ShippingZoneRuleDetailRecord[] = [
    makeRule({ id: "rule-1", zoneId: "zone-1", zoneName: "Lagos Seller Zone" })
  ];

  async createPlatform(
    _input: CreatePlatformShippingZoneRuleInput
  ): Promise<ShippingZoneRuleDetailRecord> {
    throw new Error("Not implemented.");
  }

  async createVendor(
    input: CreateVendorShippingZoneRuleInput
  ): Promise<ShippingZoneRuleDetailRecord> {
    const rule = makeRule({
      id: `rule-${this.rules.length + 1}`,
      ownerId: input.ownerId,
      zoneId: input.zoneId,
      zoneName: input.zoneId === "zone-2" ? "Abuja Seller Zone" : "Lagos Seller Zone",
      methodType: input.methodType,
      value: input.value,
      subtotalBands: (input.subtotalBands ?? []).map((band, index) =>
        makeSubtotalBand({
          id: `band-${this.rules.length + 1}-${index + 1}`,
          ...band
        })
      )
    });

    this.rules.push(rule);
    return rule;
  }

  async findAllPlatform(): Promise<ShippingZoneRuleDetailRecord[]> {
    return [];
  }

  async findAllVendor(ownerId: string): Promise<ShippingZoneRuleDetailRecord[]> {
    return this.rules.filter((rule) => rule.ownerId === ownerId);
  }

  async findPlatformById(): Promise<ShippingZoneRuleDetailRecord | null> {
    return null;
  }

  async findVendorById(
    ownerId: string,
    ruleId: string
  ): Promise<ShippingZoneRuleDetailRecord | null> {
    return (
      this.rules.find((rule) => rule.ownerId === ownerId && rule.id === ruleId) ??
      null
    );
  }

  async findPlatformByZoneId(): Promise<ShippingZoneRuleDetailRecord | null> {
    return null;
  }

  async findVendorByZoneId(
    ownerId: string,
    zoneId: string
  ): Promise<ShippingZoneRuleDetailRecord | null> {
    return (
      this.rules.find(
        (rule) => rule.ownerId === ownerId && rule.zoneId === zoneId
      ) ?? null
    );
  }

  async updatePlatform(
    _input: UpdatePlatformShippingZoneRuleInput
  ): Promise<ShippingZoneRuleDetailRecord | null> {
    return null;
  }

  async updateVendor(
    input: UpdateVendorShippingZoneRuleInput
  ): Promise<ShippingZoneRuleDetailRecord | null> {
    const rule = await this.findVendorById(input.ownerId, input.ruleId);

    if (!rule) {
      return null;
    }

    rule.zoneId = input.zoneId ?? rule.zoneId;
    rule.zoneName = rule.zoneId === "zone-2" ? "Abuja Seller Zone" : "Lagos Seller Zone";
    rule.methodType = input.methodType ?? rule.methodType;
    rule.value = input.value ?? rule.value;
    rule.subtotalBands =
      input.subtotalBands === undefined
        ? rule.subtotalBands
        : input.subtotalBands.map((band, index) =>
            makeSubtotalBand({
              id: `band-${rule.id}-${index + 1}`,
              ...band
            })
          );
    return rule;
  }

  async updatePlatformStatus(
    _input: UpdatePlatformShippingZoneRuleStatusInput
  ): Promise<ShippingZoneRuleDetailRecord | null> {
    return null;
  }

  async updateVendorStatus(
    input: UpdateVendorShippingZoneRuleStatusInput
  ): Promise<ShippingZoneRuleDetailRecord | null> {
    const rule = await this.findVendorById(input.ownerId, input.ruleId);

    if (!rule) {
      return null;
    }

    rule.status = input.status;
    return rule;
  }
}

describe("seller shipping zone rules", () => {
  it("creates a seller shipping zone rule", async () => {
    const useCase = new CreateSellerShippingZoneRule(
      new AuthenticationRepositoryDouble(),
      new ShippingSettingsRepositoryDouble(),
      new ShippingZoneRepositoryDouble(),
      new ShippingZoneRuleRepositoryDouble()
    );

    const rule = await useCase.execute({
      sellerId: "seller-id",
      zoneId: "zone-2",
      methodType: "percentage_based",
      value: 10,
      subtotalBands: [
        {
          minSubtotal: 0,
          maxSubtotal: 20000,
          methodType: "fixed_rate",
          value: 2500
        },
        {
          minSubtotal: 20000,
          maxSubtotal: null,
          methodType: "fixed_rate",
          value: 1500
        }
      ]
    });

    expect(rule.zoneId).toBe("zone-2");
    expect(rule.subtotalBands).toHaveLength(2);
  });

  it("throws when the seller zone does not exist", async () => {
    const useCase = new CreateSellerShippingZoneRule(
      new AuthenticationRepositoryDouble(),
      new ShippingSettingsRepositoryDouble(),
      new ShippingZoneRepositoryDouble(),
      new ShippingZoneRuleRepositoryDouble()
    );

    await expect(
      useCase.execute({
        sellerId: "seller-id",
        zoneId: "missing-zone",
        methodType: "fixed_rate",
        value: 1200
      })
    ).rejects.toBeInstanceOf(SellerShippingConfigurationError);
  });

  it("throws when a seller already has a rule for the zone", async () => {
    const useCase = new CreateSellerShippingZoneRule(
      new AuthenticationRepositoryDouble(),
      new ShippingSettingsRepositoryDouble(),
      new ShippingZoneRepositoryDouble(),
      new ShippingZoneRuleRepositoryDouble()
    );

    await expect(
      useCase.execute({
        sellerId: "seller-id",
        zoneId: "zone-1",
        methodType: "fixed_rate",
        value: 1200
      })
    ).rejects.toBeInstanceOf(SellerShippingConfigurationError);
  });

  it("throws when a percentage rule exceeds 100", async () => {
    const useCase = new CreateSellerShippingZoneRule(
      new AuthenticationRepositoryDouble(),
      new ShippingSettingsRepositoryDouble(),
      new ShippingZoneRepositoryDouble(),
      new ShippingZoneRuleRepositoryDouble()
    );

    await expect(
      useCase.execute({
        sellerId: "seller-id",
        zoneId: "zone-2",
        methodType: "percentage_based",
        value: 120
      })
    ).rejects.toBeInstanceOf(SellerShippingConfigurationError);
  });

  it("throws when seller subtotal bands overlap", async () => {
    const useCase = new CreateSellerShippingZoneRule(
      new AuthenticationRepositoryDouble(),
      new ShippingSettingsRepositoryDouble(),
      new ShippingZoneRepositoryDouble(),
      new ShippingZoneRuleRepositoryDouble()
    );

    await expect(
      useCase.execute({
        sellerId: "seller-id",
        zoneId: "zone-2",
        methodType: "fixed_rate",
        value: 1200,
        subtotalBands: [
          {
            minSubtotal: 0,
            maxSubtotal: 10000,
            methodType: "fixed_rate",
            value: 2500
          },
          {
            minSubtotal: 9000,
            maxSubtotal: null,
            methodType: "fixed_rate",
            value: 1500
          }
        ]
      })
    ).rejects.toBeInstanceOf(SellerShippingConfigurationError);
  });

  it("lists seller shipping zone rules", async () => {
    const useCase = new ListSellerShippingZoneRules(
      new AuthenticationRepositoryDouble(),
      new ShippingSettingsRepositoryDouble(),
      new ShippingZoneRuleRepositoryDouble()
    );

    const rules = await useCase.execute({ sellerId: "seller-id" });

    expect(rules).toHaveLength(1);
  });

  it("throws when fetching a missing seller shipping zone rule", async () => {
    const useCase = new GetSellerShippingZoneRule(
      new AuthenticationRepositoryDouble(),
      new ShippingSettingsRepositoryDouble(),
      new ShippingZoneRuleRepositoryDouble()
    );

    await expect(
      useCase.execute({ sellerId: "seller-id", ruleId: "missing-rule" })
    ).rejects.toBeInstanceOf(SellerShippingConfigurationError);
  });

  it("updates a seller shipping zone rule", async () => {
    const useCase = new UpdateSellerShippingZoneRule(
      new AuthenticationRepositoryDouble(),
      new ShippingSettingsRepositoryDouble(),
      new ShippingZoneRepositoryDouble(),
      new ShippingZoneRuleRepositoryDouble()
    );

    const rule = await useCase.execute({
      sellerId: "seller-id",
      ruleId: "rule-1",
      methodType: "percentage_based",
      value: 12,
      subtotalBands: []
    });

    expect(rule.methodType).toBe("percentage_based");
    expect(rule.subtotalBands).toHaveLength(0);
  });

  it("throws when updating a seller shipping zone rule without fields", async () => {
    const useCase = new UpdateSellerShippingZoneRule(
      new AuthenticationRepositoryDouble(),
      new ShippingSettingsRepositoryDouble(),
      new ShippingZoneRepositoryDouble(),
      new ShippingZoneRuleRepositoryDouble()
    );

    await expect(
      useCase.execute({ sellerId: "seller-id", ruleId: "rule-1" })
    ).rejects.toBeInstanceOf(SellerShippingConfigurationError);
  });

  it("updates the seller shipping zone rule status", async () => {
    const useCase = new SetSellerShippingZoneRuleStatus(
      new AuthenticationRepositoryDouble(),
      new ShippingSettingsRepositoryDouble(),
      new ShippingZoneRuleRepositoryDouble()
    );

    const rule = await useCase.execute({
      sellerId: "seller-id",
      ruleId: "rule-1",
      status: "inactive"
    });

    expect(rule.status).toBe("inactive");
  });
});

function makeSeller(): AuthUser {
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
    updatedAt: new Date("2026-04-03T00:00:00.000Z")
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
    states: [],
    ...overrides
  };
}

function makeRule(
  overrides: Partial<ShippingZoneRuleDetailRecord> = {}
): ShippingZoneRuleDetailRecord {
  return {
    id: "rule-1",
    zoneId: "zone-1",
    ownerType: "vendor",
    ownerId: "seller-id",
    zoneName: "Lagos Seller Zone",
    methodType: "fixed_rate",
    value: 1500,
    status: "active",
    subtotalBands: [],
    createdAt: new Date("2026-04-03T00:00:00.000Z"),
    updatedAt: new Date("2026-04-03T00:00:00.000Z"),
    ...overrides
  };
}

function makeSubtotalBand(overrides: {
  id: string;
  minSubtotal: number;
  maxSubtotal: number | null;
  methodType: ShippingMethodType;
  value: number;
}) {
  return {
    id: overrides.id,
    minSubtotal: overrides.minSubtotal,
    maxSubtotal: overrides.maxSubtotal,
    methodType: overrides.methodType,
    value: overrides.value,
    createdAt: new Date("2026-04-03T00:00:00.000Z"),
    updatedAt: new Date("2026-04-03T00:00:00.000Z")
  };
}
