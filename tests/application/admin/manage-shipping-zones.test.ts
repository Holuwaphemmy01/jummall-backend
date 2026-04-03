import { describe, expect, it } from "@jest/globals";

import { CreateShippingZone } from "../../../src/application/admin/create-shipping-zone";
import { GetShippingZone } from "../../../src/application/admin/get-shipping-zone";
import { ListShippingZones } from "../../../src/application/admin/list-shipping-zones";
import { SetShippingZoneStatus } from "../../../src/application/admin/set-shipping-zone-status";
import { ShippingConfigurationError } from "../../../src/application/admin/shipping-configuration-error";
import { UpdateShippingZone } from "../../../src/application/admin/update-shipping-zone";
import type {
  ShippingZoneDetailRecord,
  ShippingZoneStatus
} from "../../../src/ports/shipping/shipping-models";
import type {
  CreatePlatformShippingZoneInput,
  ShippingZoneRepository,
  UpdatePlatformShippingZoneInput,
  UpdatePlatformShippingZoneStatusInput
} from "../../../src/ports/shipping/shipping-zone-repository";

class ShippingZoneRepositoryDouble implements ShippingZoneRepository {
  private zones: ShippingZoneDetailRecord[] = [
    {
      id: "zone-1",
      ownerType: "platform",
      ownerId: null,
      name: "Lagos Urban",
      status: "active",
      createdAt: new Date("2026-04-02T00:00:00.000Z"),
      updatedAt: new Date("2026-04-02T00:00:00.000Z"),
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
      ]
    }
  ];

  async createPlatform(
    input: CreatePlatformShippingZoneInput
  ): Promise<ShippingZoneDetailRecord> {
    const zone: ShippingZoneDetailRecord = {
      id: `zone-${this.zones.length + 1}`,
      ownerType: "platform",
      ownerId: null,
      name: input.name,
      status: "active",
      createdAt: new Date("2026-04-02T00:00:00.000Z"),
      updatedAt: new Date("2026-04-02T00:00:00.000Z"),
      states: input.states.map((state, stateIndex) => ({
        id: `state-${this.zones.length + 1}-${stateIndex + 1}`,
        zoneId: `zone-${this.zones.length + 1}`,
        stateName: state.stateName,
        cities: state.cities.map((cityName, cityIndex) => ({
          id: `city-${this.zones.length + 1}-${stateIndex + 1}-${cityIndex + 1}`,
          zoneStateId: `state-${this.zones.length + 1}-${stateIndex + 1}`,
          cityName
        }))
      }))
    };

    this.zones.push(zone);

    return zone;
  }

  async findAllPlatform(): Promise<ShippingZoneDetailRecord[]> {
    return this.zones;
  }

  async findPlatformById(
    zoneId: string
  ): Promise<ShippingZoneDetailRecord | null> {
    return this.zones.find((zone) => zone.id === zoneId) ?? null;
  }

  async findPlatformByName(
    name: string
  ): Promise<ShippingZoneDetailRecord | null> {
    return (
      this.zones.find((zone) => zone.name.toLowerCase() === name.toLowerCase()) ??
      null
    );
  }

  async updatePlatform(
    input: UpdatePlatformShippingZoneInput
  ): Promise<ShippingZoneDetailRecord | null> {
    const zone = await this.findPlatformById(input.zoneId);

    if (!zone) {
      return null;
    }

    zone.name = input.name ?? zone.name;
    zone.states =
      input.states?.map((state, stateIndex) => ({
        id: `updated-state-${stateIndex + 1}`,
        zoneId: zone.id,
        stateName: state.stateName,
        cities: state.cities.map((cityName, cityIndex) => ({
          id: `updated-city-${stateIndex + 1}-${cityIndex + 1}`,
          zoneStateId: `updated-state-${stateIndex + 1}`,
          cityName
        }))
      })) ?? zone.states;
    zone.updatedAt = new Date("2026-04-02T01:00:00.000Z");

    return zone;
  }

  async updatePlatformStatus(
    input: UpdatePlatformShippingZoneStatusInput
  ): Promise<ShippingZoneDetailRecord | null> {
    const zone = await this.findPlatformById(input.zoneId);

    if (!zone) {
      return null;
    }

    zone.status = input.status;
    zone.updatedAt = new Date("2026-04-02T02:00:00.000Z");

    return zone;
  }
}

describe("shipping zone admin use cases", () => {
  it("creates a shipping zone and normalizes its state and city names", async () => {
    const repository = new ShippingZoneRepositoryDouble();
    const createShippingZone = new CreateShippingZone(repository);

    const zone = await createShippingZone.execute({
      name: "Abuja Urban",
      states: [
        {
          stateName: "  FCT  ",
          cities: ["  Gwarinpa  ", "Maitama"]
        }
      ]
    });

    expect(zone.name).toBe("Abuja Urban");
    expect(zone.states[0].stateName).toBe("FCT");
    expect(zone.states[0].cities[0].cityName).toBe("Gwarinpa");
  });

  it("throws when creating a shipping zone with a duplicate name", async () => {
    const createShippingZone = new CreateShippingZone(
      new ShippingZoneRepositoryDouble()
    );

    await expect(
      createShippingZone.execute({
        name: "lagos urban",
        states: [{ stateName: "Lagos", cities: [] }]
      })
    ).rejects.toBeInstanceOf(ShippingConfigurationError);
  });

  it("throws when creating a shipping zone with duplicate states", async () => {
    const createShippingZone = new CreateShippingZone(
      new ShippingZoneRepositoryDouble()
    );

    await expect(
      createShippingZone.execute({
        name: "Southwest",
        states: [
          { stateName: "Lagos", cities: [] },
          { stateName: " lagos ", cities: [] }
        ]
      })
    ).rejects.toBeInstanceOf(ShippingConfigurationError);
  });

  it("lists the existing platform shipping zones", async () => {
    const listShippingZones = new ListShippingZones(
      new ShippingZoneRepositoryDouble()
    );

    const zones = await listShippingZones.execute();

    expect(zones).toHaveLength(1);
    expect(zones[0].name).toBe("Lagos Urban");
  });

  it("throws when a requested shipping zone does not exist", async () => {
    const getShippingZone = new GetShippingZone(
      new ShippingZoneRepositoryDouble()
    );

    await expect(
      getShippingZone.execute({ zoneId: "missing-zone" })
    ).rejects.toBeInstanceOf(ShippingConfigurationError);
  });

  it("updates the shipping zone name and coverage", async () => {
    const repository = new ShippingZoneRepositoryDouble();
    const updateShippingZone = new UpdateShippingZone(repository);

    const zone = await updateShippingZone.execute({
      zoneId: "zone-1",
      name: "Lagos Mainland",
      states: [{ stateName: "Lagos", cities: ["Yaba"] }]
    });

    expect(zone.name).toBe("Lagos Mainland");
    expect(zone.states[0].cities[0].cityName).toBe("Yaba");
  });

  it("throws when updating a shipping zone without any fields", async () => {
    const updateShippingZone = new UpdateShippingZone(
      new ShippingZoneRepositoryDouble()
    );

    await expect(
      updateShippingZone.execute({ zoneId: "zone-1" })
    ).rejects.toBeInstanceOf(ShippingConfigurationError);
  });

  it("throws when updating a shipping zone to a duplicate name", async () => {
    const repository = new ShippingZoneRepositoryDouble();

    await repository.createPlatform({
      name: "Abuja Urban",
      states: [{ stateName: "FCT", cities: [] }]
    });

    const updateShippingZone = new UpdateShippingZone(repository);

    await expect(
      updateShippingZone.execute({
        zoneId: "zone-1",
        name: "abuja urban"
      })
    ).rejects.toBeInstanceOf(ShippingConfigurationError);
  });

  it("updates the shipping zone status", async () => {
    const setShippingZoneStatus = new SetShippingZoneStatus(
      new ShippingZoneRepositoryDouble()
    );

    const zone = await setShippingZoneStatus.execute({
      zoneId: "zone-1",
      status: "inactive" satisfies ShippingZoneStatus
    });

    expect(zone.status).toBe("inactive");
  });

  it("throws when updating the status of a missing shipping zone", async () => {
    const setShippingZoneStatus = new SetShippingZoneStatus(
      new ShippingZoneRepositoryDouble()
    );

    await expect(
      setShippingZoneStatus.execute({
        zoneId: "missing-zone",
        status: "inactive"
      })
    ).rejects.toBeInstanceOf(ShippingConfigurationError);
  });
});
