import type { Pool, PoolClient } from "pg";

import databasePool from "../client";
import type {
  CreatePlatformShippingZoneInput,
  ShippingZoneRepository,
  ShippingZoneStateInput,
  UpdatePlatformShippingZoneInput,
  UpdatePlatformShippingZoneStatusInput
} from "../../../ports/shipping/shipping-zone-repository";
import type {
  ShippingZoneDetailRecord,
  ShippingZoneStatus
} from "../../../ports/shipping/shipping-models";

interface ShippingZoneRow {
  zoneId: string;
  ownerType: "platform";
  ownerId: null;
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
          VALUES ('platform', NULL, $1, 'active')
          RETURNING "id"
        `,
        [input.name]
      );

      const zoneId = zoneResult.rows[0].id;

      await this.replaceZoneCoverage(client, zoneId, input.states);

      await client.query("COMMIT");

      const zone = await this.findPlatformById(zoneId);

      if (!zone) {
        throw new Error("Platform shipping zone was created but could not be loaded.");
      }

      return zone;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async findAllPlatform(): Promise<ShippingZoneDetailRecord[]> {
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
        WHERE zone."ownerType" = 'platform'
          AND zone."ownerId" IS NULL
        ORDER BY
          zone."name" ASC,
          zone_state."stateName" ASC NULLS LAST,
          zone_city."cityName" ASC NULLS LAST
      `
    );

    return this.mapZoneRows(result.rows);
  }

  async findPlatformById(
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
        WHERE zone."id" = $1
          AND zone."ownerType" = 'platform'
          AND zone."ownerId" IS NULL
        ORDER BY
          zone_state."stateName" ASC NULLS LAST,
          zone_city."cityName" ASC NULLS LAST
      `,
      [zoneId]
    );

    return this.mapZoneRows(result.rows)[0] ?? null;
  }

  async findPlatformByName(
    name: string
  ): Promise<ShippingZoneDetailRecord | null> {
    const identityResult = await this.pool.query<ShippingZoneIdentityRow>(
      `
        SELECT "id"
        FROM "ShippingZone"
        WHERE LOWER("name") = LOWER($1)
          AND "ownerType" = 'platform'
          AND "ownerId" IS NULL
        LIMIT 1
      `,
      [name]
    );

    const zoneId = identityResult.rows[0]?.id;

    if (!zoneId) {
      return null;
    }

    return this.findPlatformById(zoneId);
  }

  async updatePlatform(
    input: UpdatePlatformShippingZoneInput
  ): Promise<ShippingZoneDetailRecord | null> {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      const updateResult = await client.query<ShippingZoneIdentityRow>(
        `
          UPDATE "ShippingZone"
          SET
            "name" = COALESCE($2, "name"),
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = $1
            AND "ownerType" = 'platform'
            AND "ownerId" IS NULL
          RETURNING "id"
        `,
        [input.zoneId, input.name]
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

      return this.findPlatformById(zoneId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async updatePlatformStatus(
    input: UpdatePlatformShippingZoneStatusInput
  ): Promise<ShippingZoneDetailRecord | null> {
    const result = await this.pool.query<ShippingZoneIdentityRow>(
      `
        UPDATE "ShippingZone"
        SET
          "status" = $2,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $1
          AND "ownerType" = 'platform'
          AND "ownerId" IS NULL
        RETURNING "id"
      `,
      [input.zoneId, input.status]
    );

    const zoneId = result.rows[0]?.id;

    if (!zoneId) {
      return null;
    }

    return this.findPlatformById(zoneId);
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
