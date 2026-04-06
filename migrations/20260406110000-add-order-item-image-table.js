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
    `CREATE TABLE IF NOT EXISTS "OrderItemImage" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "orderItemId" TEXT NOT NULL,
      "storagePath" TEXT NOT NULL,
      "mimeType" TEXT NOT NULL,
      "originalFileName" TEXT NOT NULL,
      "position" INTEGER NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "OrderItemImage_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "OrderItemImage_position_check" CHECK ("position" >= 0),
      CONSTRAINT "OrderItemImage_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    'CREATE INDEX IF NOT EXISTS "OrderItemImage_orderItemId_idx" ON "OrderItemImage"("orderItemId");',
    'CREATE INDEX IF NOT EXISTS "OrderItemImage_orderItemId_position_createdAt_idx" ON "OrderItemImage"("orderItemId", "position", "createdAt");'
  ]);
};

exports.down = function down(db) {
  return runStatements(db, ['DROP TABLE IF EXISTS "OrderItemImage";']);
};

exports._meta = {
  version: 1
};
