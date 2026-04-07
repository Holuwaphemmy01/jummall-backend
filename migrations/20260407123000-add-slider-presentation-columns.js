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
    `ALTER TABLE "Slider"
      ADD COLUMN IF NOT EXISTS "subtitle" TEXT NOT NULL DEFAULT '';`,
    `ALTER TABLE "Slider"
      ADD COLUMN IF NOT EXISTS "buttonLabel" TEXT NOT NULL DEFAULT 'Shop Now';`,
    `ALTER TABLE "Slider"
      ADD COLUMN IF NOT EXISTS "backgroundColor" TEXT NOT NULL DEFAULT 'rgb(255, 255, 255)';`,
    `ALTER TABLE "Slider"
      ADD COLUMN IF NOT EXISTS "isLight" BOOLEAN NOT NULL DEFAULT true;`
  ]);
};

exports.down = function down(db) {
  return runStatements(db, [
    `ALTER TABLE "Slider" DROP COLUMN IF EXISTS "isLight";`,
    `ALTER TABLE "Slider" DROP COLUMN IF EXISTS "backgroundColor";`,
    `ALTER TABLE "Slider" DROP COLUMN IF EXISTS "buttonLabel";`,
    `ALTER TABLE "Slider" DROP COLUMN IF EXISTS "subtitle";`
  ]);
};

exports._meta = {
  version: 1
};
