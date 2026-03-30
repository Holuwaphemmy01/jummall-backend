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
    `CREATE TABLE IF NOT EXISTS "Cart" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "buyerId" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'active',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Cart_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "Cart_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS "CartItem" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "cartId" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    'CREATE UNIQUE INDEX IF NOT EXISTS "Cart_active_buyerId_key" ON "Cart"("buyerId") WHERE "status" = \'active\';',
    'CREATE INDEX IF NOT EXISTS "Cart_buyerId_idx" ON "Cart"("buyerId");',
    'CREATE INDEX IF NOT EXISTS "Cart_status_idx" ON "Cart"("status");',
    'CREATE UNIQUE INDEX IF NOT EXISTS "CartItem_cartId_productId_key" ON "CartItem"("cartId", "productId");',
    'CREATE INDEX IF NOT EXISTS "CartItem_cartId_idx" ON "CartItem"("cartId");',
    'CREATE INDEX IF NOT EXISTS "CartItem_productId_idx" ON "CartItem"("productId");'
  ]);
};

exports.down = function down(db) {
  return runStatements(db, [
    'DROP INDEX IF EXISTS "CartItem_productId_idx";',
    'DROP INDEX IF EXISTS "CartItem_cartId_idx";',
    'DROP INDEX IF EXISTS "CartItem_cartId_productId_key";',
    'DROP INDEX IF EXISTS "Cart_status_idx";',
    'DROP INDEX IF EXISTS "Cart_buyerId_idx";',
    'DROP INDEX IF EXISTS "Cart_active_buyerId_key";',
    'DROP TABLE IF EXISTS "CartItem";',
    'DROP TABLE IF EXISTS "Cart";'
  ]);
};

exports._meta = {
  version: 1
};
