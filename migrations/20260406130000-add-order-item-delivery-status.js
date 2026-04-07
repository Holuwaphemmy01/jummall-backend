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
    'ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_status_check";',
    `ALTER TABLE "Order"
      ADD CONSTRAINT "Order_status_check"
      CHECK (
        "status" IN (
          'pending_fulfillment',
          'partially_shipped',
          'shipped',
          'partially_delivered',
          'delivered',
          'delivery_failed'
        )
      );`,
    `ALTER TABLE "OrderItem"
      ADD COLUMN IF NOT EXISTS "deliveryStatus" TEXT NOT NULL DEFAULT 'pending_fulfillment',
      ADD COLUMN IF NOT EXISTS "deliveryStatusUpdatedAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "deliveryStatusUpdatedByUserId" TEXT,
      ADD COLUMN IF NOT EXISTS "deliveryStatusUpdatedByRole" TEXT,
      ADD COLUMN IF NOT EXISTS "shippedAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "deliveredAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "deliveryFailedAt" TIMESTAMP(3),
      ADD COLUMN IF NOT EXISTS "deliveryFailureReason" TEXT;`,
    'ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_deliveryStatus_check";',
    `ALTER TABLE "OrderItem"
      ADD CONSTRAINT "OrderItem_deliveryStatus_check"
      CHECK (
        "deliveryStatus" IN (
          'pending_fulfillment',
          'shipped',
          'delivered',
          'delivery_failed'
        )
      );`,
    'ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_deliveryStatusUpdatedByRole_check";',
    `ALTER TABLE "OrderItem"
      ADD CONSTRAINT "OrderItem_deliveryStatusUpdatedByRole_check"
      CHECK (
        "deliveryStatusUpdatedByRole" IS NULL OR
        "deliveryStatusUpdatedByRole" IN ('admin', 'seller')
      );`,
    'CREATE INDEX IF NOT EXISTS "OrderItem_sellerId_idx" ON "OrderItem"("sellerId");',
    'CREATE INDEX IF NOT EXISTS "OrderItem_deliveryStatus_idx" ON "OrderItem"("deliveryStatus");'
  ]);
};

exports.down = function down(db) {
  return runStatements(db, [
    'DROP INDEX IF EXISTS "OrderItem_deliveryStatus_idx";',
    'DROP INDEX IF EXISTS "OrderItem_sellerId_idx";',
    'ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_deliveryStatusUpdatedByRole_check";',
    'ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_deliveryStatus_check";',
    `ALTER TABLE "OrderItem"
      DROP COLUMN IF EXISTS "deliveryFailureReason",
      DROP COLUMN IF EXISTS "deliveryFailedAt",
      DROP COLUMN IF EXISTS "deliveredAt",
      DROP COLUMN IF EXISTS "shippedAt",
      DROP COLUMN IF EXISTS "deliveryStatusUpdatedByRole",
      DROP COLUMN IF EXISTS "deliveryStatusUpdatedByUserId",
      DROP COLUMN IF EXISTS "deliveryStatusUpdatedAt",
      DROP COLUMN IF EXISTS "deliveryStatus";`,
    'ALTER TABLE "Order" DROP CONSTRAINT IF EXISTS "Order_status_check";',
    `ALTER TABLE "Order"
      ADD CONSTRAINT "Order_status_check"
      CHECK ("status" IN ('pending_fulfillment'));`
  ]);
};

exports._meta = {
  version: 1
};
