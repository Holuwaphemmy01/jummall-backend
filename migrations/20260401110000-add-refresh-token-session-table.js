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
    `CREATE TABLE IF NOT EXISTS "RefreshTokenSession" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "userId" TEXT NOT NULL,
      "tokenHash" TEXT NOT NULL,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "revokedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "RefreshTokenSession_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "RefreshTokenSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    'CREATE UNIQUE INDEX IF NOT EXISTS "RefreshTokenSession_tokenHash_key" ON "RefreshTokenSession"("tokenHash");',
    'CREATE INDEX IF NOT EXISTS "RefreshTokenSession_userId_idx" ON "RefreshTokenSession"("userId");',
    'CREATE INDEX IF NOT EXISTS "RefreshTokenSession_expiresAt_idx" ON "RefreshTokenSession"("expiresAt");'
  ]);
};

exports.down = function down(db) {
  return runStatements(db, [
    'DROP INDEX IF EXISTS "RefreshTokenSession_expiresAt_idx";',
    'DROP INDEX IF EXISTS "RefreshTokenSession_userId_idx";',
    'DROP INDEX IF EXISTS "RefreshTokenSession_tokenHash_key";',
    'DROP TABLE IF EXISTS "RefreshTokenSession";'
  ]);
};

exports._meta = {
  version: 1
};
