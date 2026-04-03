import { describe, expect, it } from "@jest/globals";

import { CreateFreeShippingRule } from "../../../src/application/admin/create-free-shipping-rule";
import { GetFreeShippingRule } from "../../../src/application/admin/get-free-shipping-rule";
import { ListFreeShippingRules } from "../../../src/application/admin/list-free-shipping-rules";
import { SetFreeShippingRuleStatus } from "../../../src/application/admin/set-free-shipping-rule-status";
import { ShippingConfigurationError } from "../../../src/application/admin/shipping-configuration-error";
import { UpdateFreeShippingRule } from "../../../src/application/admin/update-free-shipping-rule";
import type {
  CreateFreeShippingRuleInput,
  FreeShippingRuleRepository,
  UpdateFreeShippingRuleInput,
  UpdateFreeShippingRuleStatusInput
} from "../../../src/ports/shipping/free-shipping-rule-repository";
import type {
  FreeShippingRuleRecord,
  FreeShippingRuleStatus
} from "../../../src/ports/shipping/shipping-models";

class FreeShippingRuleRepositoryDouble implements FreeShippingRuleRepository {
  private rules: FreeShippingRuleRecord[] = [
    makeRule({
      id: "rule-1",
      name: "Launch Coupon",
      type: "coupon",
      couponCode: "FREESHIP",
      minimumOrderSubtotal: null,
      status: "active"
    }),
    makeRule({
      id: "rule-2",
      name: "Orders Above 50000",
      type: "threshold",
      couponCode: null,
      minimumOrderSubtotal: 50000,
      status: "inactive"
    })
  ];

  async create(input: CreateFreeShippingRuleInput): Promise<FreeShippingRuleRecord> {
    const rule = makeRule({
      id: `rule-${this.rules.length + 1}`,
      name: input.name,
      type: input.type,
      couponCode: input.couponCode,
      minimumOrderSubtotal: input.minimumOrderSubtotal,
      status: "active"
    });

    this.rules.unshift(rule);

    return rule;
  }

  findAll(): Promise<FreeShippingRuleRecord[]> {
    return Promise.resolve([...this.rules]);
  }

  findById(ruleId: string): Promise<FreeShippingRuleRecord | null> {
    return Promise.resolve(
      this.rules.find((rule) => rule.id === ruleId) ?? null
    );
  }

  findByCouponCode(couponCode: string): Promise<FreeShippingRuleRecord | null> {
    return Promise.resolve(
      this.rules.find(
        (rule) =>
          rule.couponCode !== null &&
          rule.couponCode.toLowerCase() === couponCode.toLowerCase()
      ) ?? null
    );
  }

  findActiveThresholdRule(): Promise<FreeShippingRuleRecord | null> {
    return Promise.resolve(
      this.rules.find(
        (rule) => rule.type === "threshold" && rule.status === "active"
      ) ?? null
    );
  }

  async update(
    input: UpdateFreeShippingRuleInput
  ): Promise<FreeShippingRuleRecord | null> {
    const rule = this.rules.find((candidate) => candidate.id === input.ruleId);

    if (!rule) {
      return null;
    }

    rule.name = input.name ?? rule.name;
    rule.type = input.type ?? rule.type;

    if (input.couponCode !== undefined) {
      rule.couponCode = input.couponCode;
    }

    if (input.minimumOrderSubtotal !== undefined) {
      rule.minimumOrderSubtotal = input.minimumOrderSubtotal;
    }

    rule.updatedAt = new Date("2026-04-03T01:00:00.000Z");

    return rule;
  }

  async updateStatus(
    input: UpdateFreeShippingRuleStatusInput
  ): Promise<FreeShippingRuleRecord | null> {
    const rule = this.rules.find((candidate) => candidate.id === input.ruleId);

    if (!rule) {
      return null;
    }

    rule.status = input.status;
    rule.updatedAt = new Date("2026-04-03T02:00:00.000Z");

    return rule;
  }
}

describe("free shipping rule admin use cases", () => {
  it("creates a coupon free shipping rule and normalizes the coupon code", async () => {
    const createFreeShippingRule = new CreateFreeShippingRule(
      new FreeShippingRuleRepositoryDouble()
    );

    const rule = await createFreeShippingRule.execute({
      name: " Weekend Coupon ",
      type: "coupon",
      couponCode: " weekendfree "
    });

    expect(rule.name).toBe("Weekend Coupon");
    expect(rule.type).toBe("coupon");
    expect(rule.couponCode).toBe("WEEKENDFREE");
    expect(rule.status).toBe("active");
  });

  it("creates a threshold free shipping rule when no other active threshold exists", async () => {
    const repository = new FreeShippingRuleRepositoryDouble();
    await repository.updateStatus({
      ruleId: "rule-2",
      status: "inactive"
    });

    const createFreeShippingRule = new CreateFreeShippingRule(repository);

    const rule = await createFreeShippingRule.execute({
      name: "Orders Above 100000",
      type: "threshold",
      minimumOrderSubtotal: 100000
    });

    expect(rule.type).toBe("threshold");
    expect(rule.minimumOrderSubtotal).toBe(100000);
    expect(rule.couponCode).toBeNull();
  });

  it("throws when creating a free shipping rule for a duplicate coupon code", async () => {
    const createFreeShippingRule = new CreateFreeShippingRule(
      new FreeShippingRuleRepositoryDouble()
    );

    await expect(
      createFreeShippingRule.execute({
        name: "Duplicate Coupon",
        type: "coupon",
        couponCode: "freeship"
      })
    ).rejects.toThrow(ShippingConfigurationError);
  });

  it("throws when creating a second active threshold free shipping rule", async () => {
    const repository = new FreeShippingRuleRepositoryDouble();
    await repository.updateStatus({
      ruleId: "rule-2",
      status: "active"
    });
    const createFreeShippingRule = new CreateFreeShippingRule(repository);

    await expect(
      createFreeShippingRule.execute({
        name: "Orders Above 100000",
        type: "threshold",
        minimumOrderSubtotal: 100000
      })
    ).rejects.toThrow(ShippingConfigurationError);
  });

  it("lists the configured free shipping rules", async () => {
    const listFreeShippingRules = new ListFreeShippingRules(
      new FreeShippingRuleRepositoryDouble()
    );

    const rules = await listFreeShippingRules.execute();

    expect(rules).toHaveLength(2);
    expect(rules[0].name).toBe("Launch Coupon");
  });

  it("gets one free shipping rule by id", async () => {
    const getFreeShippingRule = new GetFreeShippingRule(
      new FreeShippingRuleRepositoryDouble()
    );

    const rule = await getFreeShippingRule.execute({ ruleId: "rule-1" });

    expect(rule.id).toBe("rule-1");
    expect(rule.couponCode).toBe("FREESHIP");
  });

  it("throws when fetching a missing free shipping rule", async () => {
    const getFreeShippingRule = new GetFreeShippingRule(
      new FreeShippingRuleRepositoryDouble()
    );

    await expect(
      getFreeShippingRule.execute({ ruleId: "missing-rule" })
    ).rejects.toThrow(ShippingConfigurationError);
  });

  it("updates a free shipping rule", async () => {
    const updateFreeShippingRule = new UpdateFreeShippingRule(
      new FreeShippingRuleRepositoryDouble()
    );

    const rule = await updateFreeShippingRule.execute({
      ruleId: "rule-1",
      name: "Updated Coupon",
      couponCode: "shipfree"
    });

    expect(rule.name).toBe("Updated Coupon");
    expect(rule.couponCode).toBe("SHIPFREE");
    expect(rule.type).toBe("coupon");
  });

  it("throws when updating a free shipping rule without any fields", async () => {
    const updateFreeShippingRule = new UpdateFreeShippingRule(
      new FreeShippingRuleRepositoryDouble()
    );

    await expect(
      updateFreeShippingRule.execute({ ruleId: "rule-1" })
    ).rejects.toThrow(ShippingConfigurationError);
  });

  it("throws when updating a rule to a duplicate coupon code", async () => {
    const repository = new FreeShippingRuleRepositoryDouble();
    await repository.create({
      name: "Second Coupon",
      type: "coupon",
      couponCode: "WELCOMEFREE",
      minimumOrderSubtotal: null
    });

    const updateFreeShippingRule = new UpdateFreeShippingRule(repository);

    await expect(
      updateFreeShippingRule.execute({
        ruleId: "rule-1",
        couponCode: "welcomefree"
      })
    ).rejects.toThrow(ShippingConfigurationError);
  });

  it("throws when activating a threshold rule while another active threshold exists", async () => {
    const repository = new FreeShippingRuleRepositoryDouble();
    await repository.create({
      name: "Orders Above 100000",
      type: "threshold",
      couponCode: null,
      minimumOrderSubtotal: 100000
    });

    const setFreeShippingRuleStatus = new SetFreeShippingRuleStatus(repository);

    await expect(
      setFreeShippingRuleStatus.execute({
        ruleId: "rule-2",
        status: "active"
      })
    ).rejects.toThrow(ShippingConfigurationError);
  });

  it("updates the free shipping rule status", async () => {
    const setFreeShippingRuleStatus = new SetFreeShippingRuleStatus(
      new FreeShippingRuleRepositoryDouble()
    );

    const rule = await setFreeShippingRuleStatus.execute({
      ruleId: "rule-1",
      status: "inactive" satisfies FreeShippingRuleStatus
    });

    expect(rule.status).toBe("inactive");
  });

  it("throws when updating the status of a missing free shipping rule", async () => {
    const setFreeShippingRuleStatus = new SetFreeShippingRuleStatus(
      new FreeShippingRuleRepositoryDouble()
    );

    await expect(
      setFreeShippingRuleStatus.execute({
        ruleId: "missing-rule",
        status: "inactive"
      })
    ).rejects.toThrow(ShippingConfigurationError);
  });
});

function makeRule(overrides: {
  id: string;
  name: string;
  type: "coupon" | "threshold";
  couponCode: string | null;
  minimumOrderSubtotal: number | null;
  status: FreeShippingRuleStatus;
}): FreeShippingRuleRecord {
  return {
    id: overrides.id,
    name: overrides.name,
    type: overrides.type,
    couponCode: overrides.couponCode,
    minimumOrderSubtotal: overrides.minimumOrderSubtotal,
    status: overrides.status,
    createdAt: new Date("2026-04-03T00:00:00.000Z"),
    updatedAt: new Date("2026-04-03T00:00:00.000Z")
  };
}
