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
    `ALTER TABLE "ProductCategory"
      ADD COLUMN IF NOT EXISTS "imageStoragePath" TEXT;`,
    `ALTER TABLE "ProductCategory"
      ADD COLUMN IF NOT EXISTS "imageMimeType" TEXT;`,
    `ALTER TABLE "ProductCategory"
      ADD COLUMN IF NOT EXISTS "imageOriginalFileName" TEXT;`
  ]);
};

exports.down = function down(db) {
  return runStatements(db, [
    `ALTER TABLE "ProductCategory"
      DROP COLUMN IF EXISTS "imageOriginalFileName";`,
    `ALTER TABLE "ProductCategory"
      DROP COLUMN IF EXISTS "imageMimeType";`,
    `ALTER TABLE "ProductCategory"
      DROP COLUMN IF EXISTS "imageStoragePath";`
  ]);
};

exports._meta = {
  version: 1
};
