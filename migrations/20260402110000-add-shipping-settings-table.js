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
    `CREATE TABLE IF NOT EXISTS "ShippingSettings" (
      "id" TEXT NOT NULL DEFAULT 'shipping-settings',
      "shippingMode" TEXT NOT NULL DEFAULT 'PLATFORM',
      "categoryShippingMode" TEXT NOT NULL DEFAULT 'HIGHEST',
      "vendorFallbackPolicy" TEXT NOT NULL DEFAULT 'BLOCK_CHECKOUT',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ShippingSettings_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "ShippingSettings_singleton_id_check" CHECK ("id" = 'shipping-settings'),
      CONSTRAINT "ShippingSettings_shippingMode_check" CHECK ("shippingMode" IN ('PLATFORM', 'VENDOR')),
      CONSTRAINT "ShippingSettings_categoryShippingMode_check" CHECK ("categoryShippingMode" IN ('HIGHEST', 'ADDITIVE')),
      CONSTRAINT "ShippingSettings_vendorFallbackPolicy_check" CHECK ("vendorFallbackPolicy" IN ('USE_PLATFORM_RULES', 'BLOCK_CHECKOUT'))
    );`,
    `
      INSERT INTO "ShippingSettings" (
        "id",
        "shippingMode",
        "categoryShippingMode",
        "vendorFallbackPolicy"
      )
      VALUES (
        'shipping-settings',
        'PLATFORM',
        'HIGHEST',
        'BLOCK_CHECKOUT'
      )
      ON CONFLICT ("id") DO NOTHING;
    `
  ]);
};

exports.down = function down(db) {
  return runStatements(db, ['DROP TABLE IF EXISTS "ShippingSettings";']);
};

exports._meta = {
  version: 1
};
