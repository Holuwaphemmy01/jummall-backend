import { describe, expect, it } from "@jest/globals";

import { CreateShippingZoneRule } from "../../../src/application/admin/create-shipping-zone-rule";
import { GetShippingZoneRule } from "../../../src/application/admin/get-shipping-zone-rule";
import { ListShippingZoneRules } from "../../../src/application/admin/list-shipping-zone-rules";
import { SetShippingZoneRuleStatus } from "../../../src/application/admin/set-shipping-zone-rule-status";
import { ShippingConfigurationError } from "../../../src/application/admin/shipping-configuration-error";
import { UpdateShippingZoneRule } from "../../../src/application/admin/update-shipping-zone-rule";
import type {
  ShippingMethodType,
  ShippingRuleStatus,
  ShippingZoneDetailRecord,
  ShippingZoneRuleDetailRecord
} from "../../../src/ports/shipping/shipping-models";
import type { ShippingZoneRepository } from "../../../src/ports/shipping/shipping-zone-repository";
import type {
  FindMatchingPlatformShippingZonesInput,
  FindMatchingVendorShippingZonesInput
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

class ShippingZoneRepositoryDouble implements ShippingZoneRepository {
  constructor(private readonly zones: ShippingZoneDetailRecord[]) {}

  createPlatform(): Promise<ShippingZoneDetailRecord> {
    throw new Error("Not implemented in this test double.");
  }

  createVendor(): Promise<ShippingZoneDetailRecord> {
    throw new Error("Not implemented in this test double.");
  }

  findAllPlatform(): Promise<ShippingZoneDetailRecord[]> {
    return Promise.resolve(this.zones);
  }

  findAllVendor(): Promise<ShippingZoneDetailRecord[]> {
    return Promise.resolve([]);
  }

  findMatchingActivePlatform(
    _input: FindMatchingPlatformShippingZonesInput
  ): Promise<ShippingZoneDetailRecord[]> {
    return Promise.resolve([]);
  }

  findMatchingActiveVendor(
    _input: FindMatchingVendorShippingZonesInput
  ): Promise<ShippingZoneDetailRecord[]> {
    return Promise.resolve([]);
  }

  findPlatformById(zoneId: string): Promise<ShippingZoneDetailRecord | null> {
    return Promise.resolve(this.zones.find((zone) => zone.id === zoneId) ?? null);
  }

  findVendorById(): Promise<ShippingZoneDetailRecord | null> {
    return Promise.resolve(null);
  }

  findPlatformByName(): Promise<ShippingZoneDetailRecord | null> {
    return Promise.resolve(null);
  }

  findVendorByName(): Promise<ShippingZoneDetailRecord | null> {
    return Promise.resolve(null);
  }

  updatePlatform(): Promise<ShippingZoneDetailRecord | null> {
    throw new Error("Not implemented in this test double.");
  }

  updateVendor(): Promise<ShippingZoneDetailRecord | null> {
    return Promise.resolve(null);
  }

  updatePlatformStatus(): Promise<ShippingZoneDetailRecord | null> {
    throw new Error("Not implemented in this test double.");
  }

  updateVendorStatus(): Promise<ShippingZoneDetailRecord | null> {
    return Promise.resolve(null);
  }
}

class ShippingZoneRuleRepositoryDouble implements ShippingZoneRuleRepository {
  private rules: ShippingZoneRuleDetailRecord[] = [
    {
      id: "rule-1",
      zoneId: "zone-1",
      ownerType: "platform",
      ownerId: null,
      zoneName: "Lagos Urban",
      methodType: "fixed_rate",
      value: 1500,
      status: "active",
      subtotalBands: [],
      createdAt: new Date("2026-04-02T00:00:00.000Z"),
      updatedAt: new Date("2026-04-02T00:00:00.000Z")
    }
  ];

  async createPlatform(
    input: CreatePlatformShippingZoneRuleInput
  ): Promise<ShippingZoneRuleDetailRecord> {
    const rule: ShippingZoneRuleDetailRecord = {
      id: `rule-${this.rules.length + 1}`,
      zoneId: input.zoneId,
      ownerType: "platform",
      ownerId: null,
      zoneName: input.zoneId === "zone-2" ? "Abuja Urban" : "Lagos Urban",
      methodType: input.methodType,
      value: input.value,
      status: "active",
      subtotalBands: (input.subtotalBands ?? []).map((band, index) =>
        makeSubtotalBand({
          id: `band-${this.rules.length + 1}-${index + 1}`,
          ...band
        })
      ),
      createdAt: new Date("2026-04-02T00:00:00.000Z"),
      updatedAt: new Date("2026-04-02T00:00:00.000Z")
    };

    this.rules.push(rule);

    return rule;
  }

  async createVendor(
    _input: CreateVendorShippingZoneRuleInput
  ): Promise<ShippingZoneRuleDetailRecord> {
    throw new Error("Not implemented in this test double.");
  }

  async findAllPlatform(): Promise<ShippingZoneRuleDetailRecord[]> {
    return this.rules;
  }

  async findAllVendor(): Promise<ShippingZoneRuleDetailRecord[]> {
    return [];
  }

  async findPlatformById(
    ruleId: string
  ): Promise<ShippingZoneRuleDetailRecord | null> {
    return this.rules.find((rule) => rule.id === ruleId) ?? null;
  }

  async findVendorById(): Promise<ShippingZoneRuleDetailRecord | null> {
    return null;
  }

  async findPlatformByZoneId(
    zoneId: string
  ): Promise<ShippingZoneRuleDetailRecord | null> {
    return this.rules.find((rule) => rule.zoneId === zoneId) ?? null;
  }

  async findVendorByZoneId(): Promise<ShippingZoneRuleDetailRecord | null> {
    return null;
  }

  async updatePlatform(
    input: UpdatePlatformShippingZoneRuleInput
  ): Promise<ShippingZoneRuleDetailRecord | null> {
    const rule = await this.findPlatformById(input.ruleId);

    if (!rule) {
      return null;
    }

    rule.zoneId = input.zoneId ?? rule.zoneId;
    rule.zoneName = rule.zoneId === "zone-2" ? "Abuja Urban" : "Lagos Urban";
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
    rule.updatedAt = new Date("2026-04-02T01:00:00.000Z");

    return rule;
  }

  async updateVendor(
    _input: UpdateVendorShippingZoneRuleInput
  ): Promise<ShippingZoneRuleDetailRecord | null> {
    return null;
  }

  async updatePlatformStatus(
    input: UpdatePlatformShippingZoneRuleStatusInput
  ): Promise<ShippingZoneRuleDetailRecord | null> {
    const rule = await this.findPlatformById(input.ruleId);

    if (!rule) {
      return null;
    }

    rule.status = input.status;
    rule.updatedAt = new Date("2026-04-02T02:00:00.000Z");

    return rule;
  }

  async updateVendorStatus(
    _input: UpdateVendorShippingZoneRuleStatusInput
  ): Promise<ShippingZoneRuleDetailRecord | null> {
    return null;
  }
}

describe("shipping zone rule admin use cases", () => {
  const zones: ShippingZoneDetailRecord[] = [
    {
      id: "zone-1",
      ownerType: "platform",
      ownerId: null,
      name: "Lagos Urban",
      status: "active",
      createdAt: new Date("2026-04-02T00:00:00.000Z"),
      updatedAt: new Date("2026-04-02T00:00:00.000Z"),
      states: []
    },
    {
      id: "zone-2",
      ownerType: "platform",
      ownerId: null,
      name: "Abuja Urban",
      status: "active",
      createdAt: new Date("2026-04-02T00:00:00.000Z"),
      updatedAt: new Date("2026-04-02T00:00:00.000Z"),
      states: []
    }
  ];

  it("creates a new shipping zone rule", async () => {
    const createShippingZoneRule = new CreateShippingZoneRule(
      new ShippingZoneRuleRepositoryDouble(),
      new ShippingZoneRepositoryDouble(zones)
    );

    const rule = await createShippingZoneRule.execute({
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
    expect(rule.methodType).toBe("percentage_based");
    expect(rule.subtotalBands).toHaveLength(2);
  });

  it("throws when creating a shipping zone rule for a missing zone", async () => {
    const createShippingZoneRule = new CreateShippingZoneRule(
      new ShippingZoneRuleRepositoryDouble(),
      new ShippingZoneRepositoryDouble(zones)
    );

    await expect(
      createShippingZoneRule.execute({
        zoneId: "missing-zone",
        methodType: "fixed_rate",
        value: 1000
      })
    ).rejects.toBeInstanceOf(ShippingConfigurationError);
  });

  it("throws when creating a second platform rule for the same zone", async () => {
    const createShippingZoneRule = new CreateShippingZoneRule(
      new ShippingZoneRuleRepositoryDouble(),
      new ShippingZoneRepositoryDouble(zones)
    );

    await expect(
      createShippingZoneRule.execute({
        zoneId: "zone-1",
        methodType: "fixed_rate",
        value: 1200
      })
    ).rejects.toBeInstanceOf(ShippingConfigurationError);
  });

  it("throws when a percentage-based zone rule exceeds 100", async () => {
    const createShippingZoneRule = new CreateShippingZoneRule(
      new ShippingZoneRuleRepositoryDouble(),
      new ShippingZoneRepositoryDouble(zones)
    );

    await expect(
      createShippingZoneRule.execute({
        zoneId: "zone-2",
        methodType: "percentage_based",
        value: 120
      })
    ).rejects.toBeInstanceOf(ShippingConfigurationError);
  });

  it("throws when subtotal bands overlap", async () => {
    const createShippingZoneRule = new CreateShippingZoneRule(
      new ShippingZoneRuleRepositoryDouble(),
      new ShippingZoneRepositoryDouble(zones)
    );

    await expect(
      createShippingZoneRule.execute({
        zoneId: "zone-2",
        methodType: "fixed_rate",
        value: 1200,
        subtotalBands: [
          {
            minSubtotal: 0,
            maxSubtotal: 20000,
            methodType: "fixed_rate",
            value: 2500
          },
          {
            minSubtotal: 15000,
            maxSubtotal: null,
            methodType: "fixed_rate",
            value: 1500
          }
        ]
      })
    ).rejects.toBeInstanceOf(ShippingConfigurationError);
  });

  it("lists the existing shipping zone rules", async () => {
    const listShippingZoneRules = new ListShippingZoneRules(
      new ShippingZoneRuleRepositoryDouble()
    );

    const rules = await listShippingZoneRules.execute();

    expect(rules).toHaveLength(1);
    expect(rules[0].zoneName).toBe("Lagos Urban");
  });

  it("throws when a requested shipping zone rule does not exist", async () => {
    const getShippingZoneRule = new GetShippingZoneRule(
      new ShippingZoneRuleRepositoryDouble()
    );

    await expect(
      getShippingZoneRule.execute({ ruleId: "missing-rule" })
    ).rejects.toBeInstanceOf(ShippingConfigurationError);
  });

  it("updates a shipping zone rule", async () => {
    const updateShippingZoneRule = new UpdateShippingZoneRule(
      new ShippingZoneRuleRepositoryDouble(),
      new ShippingZoneRepositoryDouble(zones)
    );

    const rule = await updateShippingZoneRule.execute({
      ruleId: "rule-1",
      methodType: "percentage_based",
      value: 15,
      subtotalBands: []
    });

    expect(rule.methodType).toBe("percentage_based");
    expect(rule.value).toBe(15);
    expect(rule.subtotalBands).toHaveLength(0);
  });

  it("throws when updating a zone rule without any fields", async () => {
    const updateShippingZoneRule = new UpdateShippingZoneRule(
      new ShippingZoneRuleRepositoryDouble(),
      new ShippingZoneRepositoryDouble(zones)
    );

    await expect(
      updateShippingZoneRule.execute({ ruleId: "rule-1" })
    ).rejects.toBeInstanceOf(ShippingConfigurationError);
  });

  it("throws when updating a zone rule to use a missing zone", async () => {
    const updateShippingZoneRule = new UpdateShippingZoneRule(
      new ShippingZoneRuleRepositoryDouble(),
      new ShippingZoneRepositoryDouble(zones)
    );

    await expect(
      updateShippingZoneRule.execute({
        ruleId: "rule-1",
        zoneId: "missing-zone"
      })
    ).rejects.toBeInstanceOf(ShippingConfigurationError);
  });

  it("updates the shipping zone rule status", async () => {
    const setShippingZoneRuleStatus = new SetShippingZoneRuleStatus(
      new ShippingZoneRuleRepositoryDouble()
    );

    const rule = await setShippingZoneRuleStatus.execute({
      ruleId: "rule-1",
      status: "inactive" satisfies ShippingRuleStatus
    });

    expect(rule.status).toBe("inactive");
  });

  it("throws when updating the status of a missing shipping zone rule", async () => {
    const setShippingZoneRuleStatus = new SetShippingZoneRuleStatus(
      new ShippingZoneRuleRepositoryDouble()
    );

    await expect(
      setShippingZoneRuleStatus.execute({
        ruleId: "missing-rule",
        status: "inactive"
      })
    ).rejects.toBeInstanceOf(ShippingConfigurationError);
  });
});

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
    createdAt: new Date("2026-04-02T00:00:00.000Z"),
    updatedAt: new Date("2026-04-02T00:00:00.000Z")
  };
}
