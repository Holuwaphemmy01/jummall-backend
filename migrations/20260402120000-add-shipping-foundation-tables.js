/* eslint-disable camelcase */
let dbm;
let type;
let seed;

exports.setup = function setup(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

function runStatements(db, statements) {
  return statements.reduce(
    (promise, statement) => promise.then(() => db.runSql(statement)),
    Promise.resolve()
  );
}

exports.up = function up(db) {
  return runStatements(db, [
    `CREATE TABLE IF NOT EXISTS "ShippingZone" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "ownerType" TEXT NOT NULL,
      "ownerId" TEXT,
      "name" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'active',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ShippingZone_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "ShippingZone_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "ShippingZone_ownerType_check" CHECK ("ownerType" IN ('platform', 'vendor')),
      CONSTRAINT "ShippingZone_status_check" CHECK ("status" IN ('active', 'inactive')),
      CONSTRAINT "ShippingZone_owner_consistency_check" CHECK (
        ("ownerType" = 'platform' AND "ownerId" IS NULL)
        OR ("ownerType" = 'vendor' AND "ownerId" IS NOT NULL)
      )
    );`,
    `CREATE TABLE IF NOT EXISTS "ShippingZoneState" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "zoneId" TEXT NOT NULL,
      "stateName" TEXT NOT NULL,
      CONSTRAINT "ShippingZoneState_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "ShippingZoneState_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "ShippingZone"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS "ShippingZoneCity" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "zoneStateId" TEXT NOT NULL,
      "cityName" TEXT NOT NULL,
      CONSTRAINT "ShippingZoneCity_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "ShippingZoneCity_zoneStateId_fkey" FOREIGN KEY ("zoneStateId") REFERENCES "ShippingZoneState"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS "ShippingZoneRule" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "zoneId" TEXT NOT NULL,
      "ownerType" TEXT NOT NULL,
      "ownerId" TEXT,
      "methodType" TEXT NOT NULL,
      "value" NUMERIC(12,2) NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'active',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ShippingZoneRule_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "ShippingZoneRule_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "ShippingZone"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "ShippingZoneRule_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "ShippingZoneRule_ownerType_check" CHECK ("ownerType" IN ('platform', 'vendor')),
      CONSTRAINT "ShippingZoneRule_methodType_check" CHECK ("methodType" IN ('fixed_rate', 'percentage_based')),
      CONSTRAINT "ShippingZoneRule_status_check" CHECK ("status" IN ('active', 'inactive')),
      CONSTRAINT "ShippingZoneRule_value_check" CHECK ("value" >= 0),
      CONSTRAINT "ShippingZoneRule_owner_consistency_check" CHECK (
        ("ownerType" = 'platform' AND "ownerId" IS NULL)
        OR ("ownerType" = 'vendor' AND "ownerId" IS NOT NULL)
      )
    );`,
    `CREATE TABLE IF NOT EXISTS "CategoryShippingRule" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "categoryId" TEXT NOT NULL,
      "ownerType" TEXT NOT NULL,
      "ownerId" TEXT,
      "methodType" TEXT NOT NULL,
      "value" NUMERIC(12,2) NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'active',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CategoryShippingRule_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "CategoryShippingRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "CategoryShippingRule_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "CategoryShippingRule_ownerType_check" CHECK ("ownerType" IN ('platform', 'vendor')),
      CONSTRAINT "CategoryShippingRule_methodType_check" CHECK ("methodType" IN ('fixed_rate', 'percentage_based')),
      CONSTRAINT "CategoryShippingRule_status_check" CHECK ("status" IN ('active', 'inactive')),
      CONSTRAINT "CategoryShippingRule_value_check" CHECK ("value" >= 0),
      CONSTRAINT "CategoryShippingRule_owner_consistency_check" CHECK (
        ("ownerType" = 'platform' AND "ownerId" IS NULL)
        OR ("ownerType" = 'vendor' AND "ownerId" IS NOT NULL)
      )
    );`,
    'CREATE UNIQUE INDEX IF NOT EXISTS "ShippingZone_platform_name_key" ON "ShippingZone"("name") WHERE "ownerType" = \'platform\' AND "ownerId" IS NULL;',
    'CREATE UNIQUE INDEX IF NOT EXISTS "ShippingZone_vendor_ownerId_name_key" ON "ShippingZone"("ownerId", "name") WHERE "ownerType" = \'vendor\';',
    'CREATE INDEX IF NOT EXISTS "ShippingZone_ownerId_idx" ON "ShippingZone"("ownerId");',
    'CREATE INDEX IF NOT EXISTS "ShippingZone_status_idx" ON "ShippingZone"("status");',
    'CREATE UNIQUE INDEX IF NOT EXISTS "ShippingZoneState_zoneId_stateName_key" ON "ShippingZoneState"("zoneId", "stateName");',
    'CREATE INDEX IF NOT EXISTS "ShippingZoneState_zoneId_idx" ON "ShippingZoneState"("zoneId");',
    'CREATE UNIQUE INDEX IF NOT EXISTS "ShippingZoneCity_zoneStateId_cityName_key" ON "ShippingZoneCity"("zoneStateId", "cityName");',
    'CREATE INDEX IF NOT EXISTS "ShippingZoneCity_zoneStateId_idx" ON "ShippingZoneCity"("zoneStateId");',
    'CREATE UNIQUE INDEX IF NOT EXISTS "ShippingZoneRule_platform_zoneId_key" ON "ShippingZoneRule"("zoneId") WHERE "ownerType" = \'platform\' AND "ownerId" IS NULL;',
    'CREATE UNIQUE INDEX IF NOT EXISTS "ShippingZoneRule_vendor_ownerId_zoneId_key" ON "ShippingZoneRule"("ownerId", "zoneId") WHERE "ownerType" = \'vendor\';',
    'CREATE INDEX IF NOT EXISTS "ShippingZoneRule_ownerId_idx" ON "ShippingZoneRule"("ownerId");',
    'CREATE INDEX IF NOT EXISTS "ShippingZoneRule_zoneId_idx" ON "ShippingZoneRule"("zoneId");',
    'CREATE INDEX IF NOT EXISTS "ShippingZoneRule_status_idx" ON "ShippingZoneRule"("status");',
    'CREATE UNIQUE INDEX IF NOT EXISTS "CategoryShippingRule_platform_categoryId_key" ON "CategoryShippingRule"("categoryId") WHERE "ownerType" = \'platform\' AND "ownerId" IS NULL;',
    'CREATE UNIQUE INDEX IF NOT EXISTS "CategoryShippingRule_vendor_ownerId_categoryId_key" ON "CategoryShippingRule"("ownerId", "categoryId") WHERE "ownerType" = \'vendor\';',
    'CREATE INDEX IF NOT EXISTS "CategoryShippingRule_ownerId_idx" ON "CategoryShippingRule"("ownerId");',
    'CREATE INDEX IF NOT EXISTS "CategoryShippingRule_categoryId_idx" ON "CategoryShippingRule"("categoryId");',
    'CREATE INDEX IF NOT EXISTS "CategoryShippingRule_status_idx" ON "CategoryShippingRule"("status");'
  ]);
};

exports.down = function down(db) {
  return runStatements(db, [
    'DROP TABLE IF EXISTS "CategoryShippingRule";',
    'DROP TABLE IF EXISTS "ShippingZoneRule";',
    'DROP TABLE IF EXISTS "ShippingZoneCity";',
    'DROP TABLE IF EXISTS "ShippingZoneState";',
    'DROP TABLE IF EXISTS "ShippingZone";'
  ]);
};

exports._meta = {
  version: 1
};
