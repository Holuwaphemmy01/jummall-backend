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
    `CREATE TABLE IF NOT EXISTS "PasswordReset" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "userId" TEXT NOT NULL,
      "code" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'active',
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "usedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "PasswordReset_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "PasswordReset_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    'CREATE INDEX IF NOT EXISTS "PasswordReset_userId_idx" ON "PasswordReset"("userId");',
    'CREATE INDEX IF NOT EXISTS "PasswordReset_code_idx" ON "PasswordReset"("code");'
  ]);
};

exports.down = function down(db) {
  return runStatements(db, [
    'DROP INDEX IF EXISTS "PasswordReset_code_idx";',
    'DROP INDEX IF EXISTS "PasswordReset_userId_idx";',
    'DROP TABLE IF EXISTS "PasswordReset";'
  ]);
};

exports._meta = {
  version: 1
};
