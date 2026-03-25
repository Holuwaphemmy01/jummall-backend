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
    'ALTER TABLE "EmailVerification" ADD COLUMN "status" TEXT NOT NULL DEFAULT \'active\';',
    `UPDATE "EmailVerification"
      SET "status" = CASE
        WHEN "verifiedAt" IS NOT NULL THEN 'used'
        ELSE 'active'
      END;`,
    'DROP INDEX IF EXISTS "EmailVerification_userId_key";',
    'CREATE INDEX "EmailVerification_userId_status_idx" ON "EmailVerification"("userId", "status");'
  ]);
};

exports.down = function down(db) {
  return runStatements(db, [
    'DROP INDEX IF EXISTS "EmailVerification_userId_status_idx";',
    'CREATE UNIQUE INDEX "EmailVerification_userId_key" ON "EmailVerification"("userId");',
    'ALTER TABLE "EmailVerification" DROP COLUMN IF EXISTS "status";'
  ]);
};

exports._meta = {
  version: 1
};
