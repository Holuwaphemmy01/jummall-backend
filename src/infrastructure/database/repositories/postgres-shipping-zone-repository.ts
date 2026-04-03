import type { Pool, PoolClient } from "pg";

import databasePool from "../client";
import type {
  CreatePlatformShippingZoneInput,
  CreateVendorShippingZoneInput,
  ShippingZoneRepository,
  ShippingZoneStateInput,
  UpdatePlatformShippingZoneInput,
  UpdatePlatformShippingZoneStatusInput,
  UpdateVendorShippingZoneInput,
  UpdateVendorShippingZoneStatusInput
} from "../../../ports/shipping/shipping-zone-repository";
import type {
  ShippingOwnerType,
  ShippingZoneDetailRecord,
  ShippingZoneStatus
} from "../../../ports/shipping/shipping-models";

interface ShippingZoneRow {
  zoneId: string;
  ownerType: ShippingOwnerType;
  ownerId: string | null;
  zoneName: string;
  zoneStatus: ShippingZoneStatus;
  zoneCreatedAt: Date;
  zoneUpdatedAt: Date;
  stateId: string | null;
  stateName: string | null;
  cityId: string | null;
  cityName: string | null;
}

interface ShippingZoneIdentityRow {
  id: string;
}

export class PostgresShippingZoneRepository implements ShippingZoneRepository {
  constructor(private readonly pool: Pool = databasePool) {}

  async createPlatform(
    input: CreatePlatformShippingZoneInput
  ): Promise<ShippingZoneDetailRecord> {
    return this.createOwnedZone({
      ownerType: "platform",
      ownerId: null,
      name: input.name,
      states: input.states
    });
  }

  async createVendor(
    input: CreateVendorShippingZoneInput
  ): Promise<ShippingZoneDetailRecord> {
    return this.createOwnedZone({
      ownerType: "vendor",
      ownerId: input.ownerId,
      name: input.name,
      states: input.states
    });
  }

  async findAllPlatform(): Promise<ShippingZoneDetailRecord[]> {
    return this.findAllOwnedZones("platform", null);
  }

  async findAllVendor(ownerId: string): Promise<ShippingZoneDetailRecord[]> {
    return this.findAllOwnedZones("vendor", ownerId);
  }

  async findPlatformById(
    zoneId: string
  ): Promise<ShippingZoneDetailRecord | null> {
    return this.findOwnedZoneById("platform", null, zoneId);
  }

  async findVendorById(
    ownerId: string,
    zoneId: string
  ): Promise<ShippingZoneDetailRecord | null> {
    return this.findOwnedZoneById("vendor", ownerId, zoneId);
  }

  async findPlatformByName(
    name: string
  ): Promise<ShippingZoneDetailRecord | null> {
    return this.findOwnedZoneByName("platform", null, name);
  }

  async findVendorByName(
    ownerId: string,
    name: string
  ): Promise<ShippingZoneDetailRecord | null> {
    return this.findOwnedZoneByName("vendor", ownerId, name);
  }

  async updatePlatform(
    input: UpdatePlatformShippingZoneInput
  ): Promise<ShippingZoneDetailRecord | null> {
    return this.updateOwnedZone("platform", null, input);
  }

  async updateVendor(
    input: UpdateVendorShippingZoneInput
  ): Promise<ShippingZoneDetailRecord | null> {
    return this.updateOwnedZone("vendor", input.ownerId, input);
  }

  async updatePlatformStatus(
    input: UpdatePlatformShippingZoneStatusInput
  ): Promise<ShippingZoneDetailRecord | null> {
    return this.updateOwnedZoneStatus("platform", null, input.zoneId, input.status);
  }

  async updateVendorStatus(
    input: UpdateVendorShippingZoneStatusInput
  ): Promise<ShippingZoneDetailRecord | null> {
    return this.updateOwnedZoneStatus(
      "vendor",
      input.ownerId,
      input.zoneId,
      input.status
    );
  }

  private async createOwnedZone(input: {
    ownerType: ShippingOwnerType;
    ownerId: string | null;
    name: string;
    states: ShippingZoneStateInput[];
  }): Promise<ShippingZoneDetailRecord> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const zoneResult = await client.query<ShippingZoneIdentityRow>(
        `
          INSERT INTO "ShippingZone" (
            "ownerType",
            "ownerId",
            "name",
            "status"
          )
          VALUES ($1, $2, $3, 'active')
          RETURNING "id"
        `,
        [input.ownerType, input.ownerId, input.name]
      );

      const zoneId = zoneResult.rows[0].id;

      await this.replaceZoneCoverage(client, zoneId, input.states);

      await client.query("COMMIT");

      const zone = await this.findOwnedZoneById(
        input.ownerType,
        input.ownerId,
        zoneId
      );

      if (!zone) {
        throw new Error("Shipping zone was created but could not be loaded.");
      }

      return zone;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async findAllOwnedZones(
    ownerType: ShippingOwnerType,
    ownerId: string | null
  ): Promise<ShippingZoneDetailRecord[]> {
    const result = await this.pool.query<ShippingZoneRow>(
      `
        SELECT
          zone."id" AS "zoneId",
          zone."ownerType" AS "ownerType",
          zone."ownerId" AS "ownerId",
          zone."name" AS "zoneName",
          zone."status" AS "zoneStatus",
          zone."createdAt" AS "zoneCreatedAt",
          zone."updatedAt" AS "zoneUpdatedAt",
          zone_state."id" AS "stateId",
          zone_state."stateName" AS "stateName",
          zone_city."id" AS "cityId",
          zone_city."cityName" AS "cityName"
        FROM "ShippingZone" zone
        LEFT JOIN "ShippingZoneState" zone_state
          ON zone_state."zoneId" = zone."id"
        LEFT JOIN "ShippingZoneCity" zone_city
          ON zone_city."zoneStateId" = zone_state."id"
        WHERE zone."ownerType" = $1
          AND (
            ($2::text IS NULL AND zone."ownerId" IS NULL)
            OR zone."ownerId" = $2
          )
        ORDER BY
          zone."name" ASC,
          zone_state."stateName" ASC NULLS LAST,
          zone_city."cityName" ASC NULLS LAST
      `,
      [ownerType, ownerId]
    );

    return this.mapZoneRows(result.rows);
  }

  private async findOwnedZoneById(
    ownerType: ShippingOwnerType,
    ownerId: string | null,
    zoneId: string
  ): Promise<ShippingZoneDetailRecord | null> {
    const result = await this.pool.query<ShippingZoneRow>(
      `
        SELECT
          zone."id" AS "zoneId",
          zone."ownerType" AS "ownerType",
          zone."ownerId" AS "ownerId",
          zone."name" AS "zoneName",
          zone."status" AS "zoneStatus",
          zone."createdAt" AS "zoneCreatedAt",
          zone."updatedAt" AS "zoneUpdatedAt",
          zone_state."id" AS "stateId",
          zone_state."stateName" AS "stateName",
          zone_city."id" AS "cityId",
          zone_city."cityName" AS "cityName"
        FROM "ShippingZone" zone
        LEFT JOIN "ShippingZoneState" zone_state
          ON zone_state."zoneId" = zone."id"
        LEFT JOIN "ShippingZoneCity" zone_city
          ON zone_city."zoneStateId" = zone_state."id"
        WHERE zone."id" = $3
          AND zone."ownerType" = $1
          AND (
            ($2::text IS NULL AND zone."ownerId" IS NULL)
            OR zone."ownerId" = $2
          )
        ORDER BY
          zone_state."stateName" ASC NULLS LAST,
          zone_city."cityName" ASC NULLS LAST
      `,
      [ownerType, ownerId, zoneId]
    );

    return this.mapZoneRows(result.rows)[0] ?? null;
  }

  private async findOwnedZoneByName(
    ownerType: ShippingOwnerType,
    ownerId: string | null,
    name: string
  ): Promise<ShippingZoneDetailRecord | null> {
    const identityResult = await this.pool.query<ShippingZoneIdentityRow>(
      `
        SELECT "id"
        FROM "ShippingZone"
        WHERE LOWER("name") = LOWER($3)
          AND "ownerType" = $1
          AND (
            ($2::text IS NULL AND "ownerId" IS NULL)
            OR "ownerId" = $2
          )
        LIMIT 1
      `,
      [ownerType, ownerId, name]
    );

    const zoneId = identityResult.rows[0]?.id;

    if (!zoneId) {
      return null;
    }

    return this.findOwnedZoneById(ownerType, ownerId, zoneId);
  }

  private async updateOwnedZone(
    ownerType: ShippingOwnerType,
    ownerId: string | null,
    input:
      | UpdatePlatformShippingZoneInput
      | UpdateVendorShippingZoneInput
  ): Promise<ShippingZoneDetailRecord | null> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const updateResult = await client.query<ShippingZoneIdentityRow>(
        `
          UPDATE "ShippingZone"
          SET
            "name" = COALESCE($4, "name"),
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = $3
            AND "ownerType" = $1
            AND (
              ($2::text IS NULL AND "ownerId" IS NULL)
              OR "ownerId" = $2
            )
          RETURNING "id"
        `,
        [ownerType, ownerId, input.zoneId, input.name]
      );

      const zoneId = updateResult.rows[0]?.id;

      if (!zoneId) {
        await client.query("ROLLBACK");
        return null;
      }

      if (input.states) {
        await this.replaceZoneCoverage(client, zoneId, input.states);
        await client.query(
          `
            UPDATE "ShippingZone"
            SET "updatedAt" = CURRENT_TIMESTAMP
            WHERE "id" = $1
          `,
          [zoneId]
        );
      }

      await client.query("COMMIT");

      return this.findOwnedZoneById(ownerType, ownerId, zoneId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async updateOwnedZoneStatus(
    ownerType: ShippingOwnerType,
    ownerId: string | null,
    zoneId: string,
    status: ShippingZoneStatus
  ): Promise<ShippingZoneDetailRecord | null> {
    const result = await this.pool.query<ShippingZoneIdentityRow>(
      `
        UPDATE "ShippingZone"
        SET
          "status" = $4,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $3
          AND "ownerType" = $1
          AND (
            ($2::text IS NULL AND "ownerId" IS NULL)
            OR "ownerId" = $2
          )
        RETURNING "id"
      `,
      [ownerType, ownerId, zoneId, status]
    );

    const updatedZoneId = result.rows[0]?.id;

    if (!updatedZoneId) {
      return null;
    }

    return this.findOwnedZoneById(ownerType, ownerId, updatedZoneId);
  }

  private async replaceZoneCoverage(
    client: PoolClient,
    zoneId: string,
    states: ShippingZoneStateInput[]
  ) {
    await client.query(
      `
        DELETE FROM "ShippingZoneState"
        WHERE "zoneId" = $1
      `,
      [zoneId]
    );

    for (const state of states) {
      const stateResult = await client.query<ShippingZoneIdentityRow>(
        `
          INSERT INTO "ShippingZoneState" (
            "zoneId",
            "stateName"
          )
          VALUES ($1, $2)
          RETURNING "id"
        `,
        [zoneId, state.stateName]
      );

      const zoneStateId = stateResult.rows[0].id;

      for (const cityName of state.cities) {
        await client.query(
          `
            INSERT INTO "ShippingZoneCity" (
              "zoneStateId",
              "cityName"
            )
            VALUES ($1, $2)
          `,
          [zoneStateId, cityName]
        );
      }
    }
  }

  private mapZoneRows(rows: ShippingZoneRow[]): ShippingZoneDetailRecord[] {
    const zoneMap = new Map<string, ShippingZoneDetailRecord>();

    for (const row of rows) {
      let zone = zoneMap.get(row.zoneId);

      if (!zone) {
        zone = {
          id: row.zoneId,
          ownerType: row.ownerType,
          ownerId: row.ownerId,
          name: row.zoneName,
          status: row.zoneStatus,
          createdAt: row.zoneCreatedAt,
          updatedAt: row.zoneUpdatedAt,
          states: []
        };
        zoneMap.set(row.zoneId, zone);
      }

      if (!row.stateId || !row.stateName) {
        continue;
      }

      let state = zone.states.find(
        (currentState) => currentState.id === row.stateId
      );

      if (!state) {
        state = {
          id: row.stateId,
          zoneId: row.zoneId,
          stateName: row.stateName,
          cities: []
        };
        zone.states.push(state);
      }

      if (!row.cityId || !row.cityName) {
        continue;
      }

      if (state.cities.some((city) => city.id === row.cityId)) {
        continue;
      }

      state.cities.push({
        id: row.cityId,
        zoneStateId: row.stateId,
        cityName: row.cityName
      });
    }

    return Array.from(zoneMap.values());
  }
}
