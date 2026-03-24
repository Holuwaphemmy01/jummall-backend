import pool from "../infrastructure/database/client";

type DbMigrateInstance = {
  up: () => Promise<unknown>;
};

type DbMigrateModule = {
  getInstance: (
    isModule: boolean,
    options: {
      cwd: string;
      config: string;
      env: string;
      throwUncatched: boolean;
    }
  ) => DbMigrateInstance;
};

const dbMigrate = require("db-migrate") as DbMigrateModule;

export async function initializeDatabase(): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set.");
  }

  try {
    const result = await pool.query<{ connection_status: number }>(
      "SELECT 1 AS connection_status"
    );

    console.log("[database] Connection successful.", result.rows[0]);
  } catch (error) {
    console.error("[database] Connection failed.", error);
    throw error;
  }

  try {
    const migrator = dbMigrate.getInstance(true, {
      cwd: process.cwd(),
      config: `${process.cwd()}\\database.json`,
      env: process.env.NODE_ENV ?? "dev",
      throwUncatched: true
    });

    await migrator.up();
    console.log("[database] Pending migrations completed successfully.");
  } catch (error) {
    console.error("[database] Migration failed.", error);
    throw error;
  }
}
