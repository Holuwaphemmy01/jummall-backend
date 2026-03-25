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
    `ALTER TABLE "User"
      ADD COLUMN "accountStatus" TEXT NOT NULL DEFAULT 'not_verified';`,
    `CREATE TABLE "EmailVerification" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "userId" TEXT NOT NULL,
      "code" TEXT NOT NULL,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "verifiedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "EmailVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );`,
    'CREATE UNIQUE INDEX "EmailVerification_userId_key" ON "EmailVerification"("userId");'
  ]);
};

exports.down = function down(db) {
  return runStatements(db, [
    'DROP TABLE IF EXISTS "EmailVerification";',
    'ALTER TABLE "User" DROP COLUMN IF EXISTS "accountStatus";'
  ]);
};

exports._meta = {
  version: 1
};
