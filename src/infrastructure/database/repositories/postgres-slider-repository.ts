import type { Pool } from "pg";

import databasePool from "../client";
import type {
  CreateSliderInput,
  SliderImageRecord,
  SliderRecord,
  SliderRepository,
  UpdateSliderInput,
  UpdateSliderStatusInput
} from "../../../ports/slider-repository";

interface SliderRow {
  id: string;
  title: string;
  description: string;
  subtitle: string;
  buttonLabel: string;
  backgroundColor: string;
  isLight: boolean;
  displayOrder: number;
  status: "active" | "inactive";
  imageStoragePath: string;
  imageMimeType: string;
  imageOriginalFileName: string;
  createdAt: Date;
  updatedAt: Date;
}

export class PostgresSliderRepository implements SliderRepository {
  constructor(private readonly pool: Pool = databasePool) {}

  async create(input: CreateSliderInput): Promise<SliderRecord> {
    const result = await this.pool.query<SliderRow>(
      `
        INSERT INTO "Slider" (
          "title",
          "description",
          "subtitle",
          "buttonLabel",
          "backgroundColor",
          "isLight",
          "displayOrder",
          "status",
          "imageStoragePath",
          "imageMimeType",
          "imageOriginalFileName"
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING
          "id",
          "title",
          "description",
          "subtitle",
          "buttonLabel",
          "backgroundColor",
          "isLight",
          "displayOrder",
          "status",
          "imageStoragePath",
          "imageMimeType",
          "imageOriginalFileName",
          "createdAt",
          "updatedAt"
      `,
      [
        input.title,
        input.description,
        input.subtitle,
        input.buttonLabel,
        input.backgroundColor,
        input.isLight,
        input.displayOrder,
        input.status ?? "inactive",
        input.image.storagePath,
        input.image.mimeType,
        input.image.originalFileName
      ]
    );

    return this.mapRowToRecord(result.rows[0]);
  }

  async findAll(): Promise<SliderRecord[]> {
    const result = await this.pool.query<SliderRow>(
      `
        SELECT
          "id",
          "title",
          "description",
          "subtitle",
          "buttonLabel",
          "backgroundColor",
          "isLight",
          "displayOrder",
          "status",
          "imageStoragePath",
          "imageMimeType",
          "imageOriginalFileName",
          "createdAt",
          "updatedAt"
        FROM "Slider"
        ORDER BY "displayOrder" ASC, "createdAt" DESC
      `
    );

    return result.rows.map((row) => this.mapRowToRecord(row));
  }

  async findActive(): Promise<SliderRecord[]> {
    const result = await this.pool.query<SliderRow>(
      `
        SELECT
          "id",
          "title",
          "description",
          "subtitle",
          "buttonLabel",
          "backgroundColor",
          "isLight",
          "displayOrder",
          "status",
          "imageStoragePath",
          "imageMimeType",
          "imageOriginalFileName",
          "createdAt",
          "updatedAt"
        FROM "Slider"
        WHERE "status" = 'active'
        ORDER BY "displayOrder" ASC, "createdAt" DESC
      `
    );

    return result.rows.map((row) => this.mapRowToRecord(row));
  }

  async findById(sliderId: string): Promise<SliderRecord | null> {
    const result = await this.pool.query<SliderRow>(
      `
        SELECT
          "id",
          "title",
          "description",
          "subtitle",
          "buttonLabel",
          "backgroundColor",
          "isLight",
          "displayOrder",
          "status",
          "imageStoragePath",
          "imageMimeType",
          "imageOriginalFileName",
          "createdAt",
          "updatedAt"
        FROM "Slider"
        WHERE "id" = $1
        LIMIT 1
      `,
      [sliderId]
    );

    return result.rows[0] ? this.mapRowToRecord(result.rows[0]) : null;
  }

  async update(input: UpdateSliderInput): Promise<SliderRecord | null> {
    const result = await this.pool.query<SliderRow>(
      `
        UPDATE "Slider"
        SET
          "title" = COALESCE($2, "title"),
          "description" = COALESCE($3, "description"),
          "subtitle" = COALESCE($4, "subtitle"),
          "buttonLabel" = COALESCE($5, "buttonLabel"),
          "backgroundColor" = COALESCE($6, "backgroundColor"),
          "isLight" = COALESCE($7, "isLight"),
          "displayOrder" = COALESCE($8, "displayOrder"),
          "imageStoragePath" = COALESCE($9, "imageStoragePath"),
          "imageMimeType" = COALESCE($10, "imageMimeType"),
          "imageOriginalFileName" = COALESCE($11, "imageOriginalFileName"),
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $1
        RETURNING
          "id",
          "title",
          "description",
          "subtitle",
          "buttonLabel",
          "backgroundColor",
          "isLight",
          "displayOrder",
          "status",
          "imageStoragePath",
          "imageMimeType",
          "imageOriginalFileName",
          "createdAt",
          "updatedAt"
      `,
      [
        input.sliderId,
        input.title,
        input.description,
        input.subtitle,
        input.buttonLabel,
        input.backgroundColor,
        input.isLight,
        input.displayOrder,
        input.image?.storagePath,
        input.image?.mimeType,
        input.image?.originalFileName
      ]
    );

    return result.rows[0] ? this.mapRowToRecord(result.rows[0]) : null;
  }

  async updateStatus(
    input: UpdateSliderStatusInput
  ): Promise<SliderRecord | null> {
    const result = await this.pool.query<SliderRow>(
      `
        UPDATE "Slider"
        SET
          "status" = $2,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $1
        RETURNING
          "id",
          "title",
          "description",
          "subtitle",
          "buttonLabel",
          "backgroundColor",
          "isLight",
          "displayOrder",
          "status",
          "imageStoragePath",
          "imageMimeType",
          "imageOriginalFileName",
          "createdAt",
          "updatedAt"
      `,
      [input.sliderId, input.status]
    );

    return result.rows[0] ? this.mapRowToRecord(result.rows[0]) : null;
  }

  private mapRowToRecord(row: SliderRow): SliderRecord {
    const image: SliderImageRecord = {
      storagePath: row.imageStoragePath,
      mimeType: row.imageMimeType,
      originalFileName: row.imageOriginalFileName
    };

    return {
      id: row.id,
      title: row.title,
      description: row.description,
      subtitle: row.subtitle,
      buttonLabel: row.buttonLabel,
      backgroundColor: row.backgroundColor,
      isLight: row.isLight,
      displayOrder: row.displayOrder,
      status: row.status,
      image,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }
}
