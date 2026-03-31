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
    `CREATE TABLE IF NOT EXISTS "BillingAddress" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "buyerId" TEXT NOT NULL,
      "fullName" TEXT NOT NULL,
      "phoneNumber" TEXT NOT NULL,
      "addressLine1" TEXT NOT NULL,
      "addressLine2" TEXT,
      "city" TEXT NOT NULL,
      "state" TEXT NOT NULL,
      "country" TEXT NOT NULL,
      "postalCode" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "BillingAddress_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "BillingAddress_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    'CREATE INDEX IF NOT EXISTS "BillingAddress_buyerId_idx" ON "BillingAddress"("buyerId");'
  ];

  return runStatements(db, statements);
};

exports.down = function down(db) {
  const statements = ['DROP TABLE IF EXISTS "BillingAddress";'];

  return runStatements(db, statements);
};

exports._meta = {
  version: 1
};
