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
    `CREATE TABLE IF NOT EXISTS "ShippingZoneRuleSubtotalBand" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "shippingZoneRuleId" TEXT NOT NULL,
      "minSubtotal" NUMERIC(12,2) NOT NULL,
      "maxSubtotal" NUMERIC(12,2),
      "methodType" TEXT NOT NULL,
      "value" NUMERIC(12,2) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ShippingZoneRuleSubtotalBand_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "ShippingZoneRuleSubtotalBand_shippingZoneRuleId_fkey" FOREIGN KEY ("shippingZoneRuleId") REFERENCES "ShippingZoneRule"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "ShippingZoneRuleSubtotalBand_methodType_check" CHECK ("methodType" IN ('fixed_rate', 'percentage_based')),
      CONSTRAINT "ShippingZoneRuleSubtotalBand_value_check" CHECK ("value" >= 0),
      CONSTRAINT "ShippingZoneRuleSubtotalBand_minSubtotal_check" CHECK ("minSubtotal" >= 0),
      CONSTRAINT "ShippingZoneRuleSubtotalBand_maxSubtotal_check" CHECK (
        "maxSubtotal" IS NULL OR "maxSubtotal" > "minSubtotal"
      )
    );`,
    `CREATE TABLE IF NOT EXISTS "CategoryShippingRuleSubtotalBand" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "categoryShippingRuleId" TEXT NOT NULL,
      "minSubtotal" NUMERIC(12,2) NOT NULL,
      "maxSubtotal" NUMERIC(12,2),
      "methodType" TEXT NOT NULL,
      "value" NUMERIC(12,2) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CategoryShippingRuleSubtotalBand_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "CategoryShippingRuleSubtotalBand_categoryShippingRuleId_fkey" FOREIGN KEY ("categoryShippingRuleId") REFERENCES "CategoryShippingRule"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "CategoryShippingRuleSubtotalBand_methodType_check" CHECK ("methodType" IN ('fixed_rate', 'percentage_based')),
      CONSTRAINT "CategoryShippingRuleSubtotalBand_value_check" CHECK ("value" >= 0),
      CONSTRAINT "CategoryShippingRuleSubtotalBand_minSubtotal_check" CHECK ("minSubtotal" >= 0),
      CONSTRAINT "CategoryShippingRuleSubtotalBand_maxSubtotal_check" CHECK (
        "maxSubtotal" IS NULL OR "maxSubtotal" > "minSubtotal"
      )
    );`,
    'CREATE INDEX IF NOT EXISTS "ShippingZoneRuleSubtotalBand_shippingZoneRuleId_idx" ON "ShippingZoneRuleSubtotalBand"("shippingZoneRuleId");',
    'CREATE INDEX IF NOT EXISTS "ShippingZoneRuleSubtotalBand_shippingZoneRuleId_minSubtotal_idx" ON "ShippingZoneRuleSubtotalBand"("shippingZoneRuleId", "minSubtotal");',
    'CREATE INDEX IF NOT EXISTS "CategoryShippingRuleSubtotalBand_categoryShippingRuleId_idx" ON "CategoryShippingRuleSubtotalBand"("categoryShippingRuleId");',
    'CREATE INDEX IF NOT EXISTS "CategoryShippingRuleSubtotalBand_categoryShippingRuleId_minSubtotal_idx" ON "CategoryShippingRuleSubtotalBand"("categoryShippingRuleId", "minSubtotal");'
  ]);
};

exports.down = function down(db) {
  return runStatements(db, [
    'DROP TABLE IF EXISTS "CategoryShippingRuleSubtotalBand";',
    'DROP TABLE IF EXISTS "ShippingZoneRuleSubtotalBand";'
  ]);
};

exports._meta = {
  version: 1
};
