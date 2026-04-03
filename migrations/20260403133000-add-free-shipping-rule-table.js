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
    `CREATE TABLE IF NOT EXISTS "FreeShippingRule" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "name" TEXT NOT NULL,
      "type" TEXT NOT NULL,
      "couponCode" TEXT,
      "minimumOrderSubtotal" NUMERIC(12,2),
      "status" TEXT NOT NULL DEFAULT 'active',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "FreeShippingRule_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "FreeShippingRule_type_check" CHECK ("type" IN ('coupon', 'threshold')),
      CONSTRAINT "FreeShippingRule_status_check" CHECK ("status" IN ('active', 'inactive')),
      CONSTRAINT "FreeShippingRule_minimumOrderSubtotal_check" CHECK (
        "minimumOrderSubtotal" IS NULL OR "minimumOrderSubtotal" >= 0
      ),
      CONSTRAINT "FreeShippingRule_configuration_check" CHECK (
        ("type" = 'coupon' AND "couponCode" IS NOT NULL AND "minimumOrderSubtotal" IS NULL)
        OR ("type" = 'threshold' AND "couponCode" IS NULL AND "minimumOrderSubtotal" IS NOT NULL)
      )
    );`,
    'CREATE UNIQUE INDEX IF NOT EXISTS "FreeShippingRule_couponCode_key" ON "FreeShippingRule"(LOWER("couponCode")) WHERE "couponCode" IS NOT NULL;',
    'CREATE UNIQUE INDEX IF NOT EXISTS "FreeShippingRule_active_threshold_key" ON "FreeShippingRule"("type") WHERE "type" = \'threshold\' AND "status" = \'active\';',
    'CREATE INDEX IF NOT EXISTS "FreeShippingRule_status_idx" ON "FreeShippingRule"("status");',
    'CREATE INDEX IF NOT EXISTS "FreeShippingRule_type_idx" ON "FreeShippingRule"("type");'
  ]);
};

exports.down = function down(db) {
  return runStatements(db, ['DROP TABLE IF EXISTS "FreeShippingRule";']);
};

exports._meta = {
  version: 1
};
