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
    `CREATE TABLE IF NOT EXISTS "Slider" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "title" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "displayOrder" INTEGER NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'inactive',
      "imageStoragePath" TEXT NOT NULL,
      "imageMimeType" TEXT NOT NULL,
      "imageOriginalFileName" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Slider_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "Slider_status_check" CHECK ("status" IN ('active', 'inactive')),
      CONSTRAINT "Slider_displayOrder_check" CHECK ("displayOrder" >= 0)
    );`,
    'CREATE INDEX IF NOT EXISTS "Slider_status_idx" ON "Slider"("status");',
    'CREATE INDEX IF NOT EXISTS "Slider_displayOrder_idx" ON "Slider"("displayOrder");'
  ]);
};

exports.down = function down(db) {
  return runStatements(db, ['DROP TABLE IF EXISTS "Slider";']);
};

exports._meta = {
  version: 1
};
