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
    `CREATE TABLE "Kyc" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "userId" TEXT NOT NULL,
      "sellerType" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'not_started',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Kyc_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "Kyc_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );`,
    'CREATE UNIQUE INDEX "Kyc_userId_key" ON "Kyc"("userId");'
  ]);
};

exports.down = function down(db) {
  return db.runSql('DROP TABLE IF EXISTS "Kyc";');
};

exports._meta = {
  version: 1
};
