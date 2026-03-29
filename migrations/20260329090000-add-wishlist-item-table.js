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
    `CREATE TABLE IF NOT EXISTS "WishlistItem" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "buyerId" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "WishlistItem_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "WishlistItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    'CREATE UNIQUE INDEX IF NOT EXISTS "WishlistItem_buyerId_productId_key" ON "WishlistItem"("buyerId", "productId");',
    'CREATE INDEX IF NOT EXISTS "WishlistItem_buyerId_idx" ON "WishlistItem"("buyerId");',
    'CREATE INDEX IF NOT EXISTS "WishlistItem_productId_idx" ON "WishlistItem"("productId");'
  ]);
};

exports.down = function down(db) {
  return runStatements(db, [
    'DROP INDEX IF EXISTS "WishlistItem_productId_idx";',
    'DROP INDEX IF EXISTS "WishlistItem_buyerId_idx";',
    'DROP INDEX IF EXISTS "WishlistItem_buyerId_productId_key";',
    'DROP TABLE IF EXISTS "WishlistItem";'
  ]);
};

exports._meta = {
  version: 1
};
