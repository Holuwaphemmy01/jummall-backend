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
    `CREATE TABLE IF NOT EXISTS "Product" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "sellerId" TEXT NOT NULL,
      "categoryId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "sku" TEXT,
      "price" NUMERIC(12,2) NOT NULL,
      "quantity" INTEGER NOT NULL DEFAULT 0,
      "currency" TEXT NOT NULL DEFAULT 'NGN',
      "condition" TEXT NOT NULL,
      "brand" TEXT,
      "weightKg" NUMERIC(10,3) NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'pending_review',
      "reviewNote" TEXT,
      "reviewedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Product_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "Product_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS "ProductImage" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "productId" TEXT NOT NULL,
      "storagePath" TEXT NOT NULL,
      "mimeType" TEXT NOT NULL,
      "originalFileName" TEXT NOT NULL,
      "position" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    'CREATE INDEX IF NOT EXISTS "Product_sellerId_idx" ON "Product"("sellerId");',
    'CREATE INDEX IF NOT EXISTS "Product_categoryId_idx" ON "Product"("categoryId");',
    'CREATE INDEX IF NOT EXISTS "Product_status_idx" ON "Product"("status");',
    'CREATE INDEX IF NOT EXISTS "ProductImage_productId_idx" ON "ProductImage"("productId");'
  ]);
};

exports.down = function down(db) {
  return runStatements(db, [
    'DROP INDEX IF EXISTS "ProductImage_productId_idx";',
    'DROP INDEX IF EXISTS "Product_status_idx";',
    'DROP INDEX IF EXISTS "Product_categoryId_idx";',
    'DROP INDEX IF EXISTS "Product_sellerId_idx";',
    'DROP TABLE IF EXISTS "ProductImage";',
    'DROP TABLE IF EXISTS "Product";'
  ]);
};

exports._meta = {
  version: 1
};
