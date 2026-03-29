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
  const statements = [
    'CREATE EXTENSION IF NOT EXISTS "pgcrypto";',
    `CREATE TABLE "User" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "firstName" TEXT,
      "lastName" TEXT,
      "username" TEXT,
      "email" TEXT NOT NULL,
      "phone" TEXT,
      "password" TEXT NOT NULL,
      "role" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "User_pkey" PRIMARY KEY ("id")
    );`,
    'CREATE UNIQUE INDEX "User_email_key" ON "User"("email");',
    'CREATE UNIQUE INDEX "User_username_key" ON "User"("username");',
    'CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");',
  ];

  return runStatements(db, statements);
};

exports.down = function down(db) {
  const statements = [
    'DROP TABLE IF EXISTS "User";'
  ];

  return runStatements(db, statements);
};

exports._meta = {
  version: 1
};
