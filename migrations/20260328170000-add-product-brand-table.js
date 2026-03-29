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
    `CREATE TABLE IF NOT EXISTS "ProductBrand" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "name" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ProductBrand_pkey" PRIMARY KEY ("id")
    );`,
    'CREATE UNIQUE INDEX IF NOT EXISTS "ProductBrand_name_key" ON "ProductBrand"(LOWER("name"));',
    'ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "brandId" TEXT;',
    'ALTER TABLE "Product" DROP COLUMN IF EXISTS "brand";',
    'ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "ProductBrand"("id") ON DELETE SET NULL ON UPDATE CASCADE;',
    'CREATE INDEX IF NOT EXISTS "Product_brandId_idx" ON "Product"("brandId");'
  ]);
};

exports.down = function down(db) {
  return runStatements(db, [
    'DROP INDEX IF EXISTS "Product_brandId_idx";',
    'ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_brandId_fkey";',
    'ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "brand" TEXT;',
    'ALTER TABLE "Product" DROP COLUMN IF EXISTS "brandId";',
    'DROP INDEX IF EXISTS "ProductBrand_name_key";',
    'DROP TABLE IF EXISTS "ProductBrand";'
  ]);
};

exports._meta = {
  version: 1
};
