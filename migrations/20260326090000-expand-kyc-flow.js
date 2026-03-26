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
    'ALTER TABLE "Kyc" ADD COLUMN IF NOT EXISTS "email" TEXT;',
    'ALTER TABLE "Kyc" ADD COLUMN IF NOT EXISTS "phone" TEXT;',
    'ALTER TABLE "Kyc" ADD COLUMN IF NOT EXISTS "address" TEXT;',
    'ALTER TABLE "Kyc" ADD COLUMN IF NOT EXISTS "city" TEXT;',
    'ALTER TABLE "Kyc" ADD COLUMN IF NOT EXISTS "state" TEXT;',
    `ALTER TABLE "Kyc" ADD COLUMN IF NOT EXISTS "country" TEXT DEFAULT 'Nigeria';`,
    'ALTER TABLE "Kyc" ADD COLUMN IF NOT EXISTS "bankName" TEXT;',
    'ALTER TABLE "Kyc" ADD COLUMN IF NOT EXISTS "bankAccountNumber" TEXT;',
    'ALTER TABLE "Kyc" ADD COLUMN IF NOT EXISTS "bankAccountName" TEXT;',
    'ALTER TABLE "Kyc" ADD COLUMN IF NOT EXISTS "fullName" TEXT;',
    'ALTER TABLE "Kyc" ADD COLUMN IF NOT EXISTS "dateOfBirth" DATE;',
    'ALTER TABLE "Kyc" ADD COLUMN IF NOT EXISTS "gender" TEXT;',
    'ALTER TABLE "Kyc" ADD COLUMN IF NOT EXISTS "idType" TEXT;',
    'ALTER TABLE "Kyc" ADD COLUMN IF NOT EXISTS "idNumber" TEXT;',
    'ALTER TABLE "Kyc" ADD COLUMN IF NOT EXISTS "businessName" TEXT;',
    'ALTER TABLE "Kyc" ADD COLUMN IF NOT EXISTS "registrationNumber" TEXT;',
    'ALTER TABLE "Kyc" ADD COLUMN IF NOT EXISTS "registeredBusinessAddress" TEXT;',
    'ALTER TABLE "Kyc" ADD COLUMN IF NOT EXISTS "representativeFirstName" TEXT;',
    'ALTER TABLE "Kyc" ADD COLUMN IF NOT EXISTS "representativeLastName" TEXT;',
    'ALTER TABLE "Kyc" ADD COLUMN IF NOT EXISTS "representativeRole" TEXT;',
    'ALTER TABLE "Kyc" ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP(3);',
    'ALTER TABLE "Kyc" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);',
    'ALTER TABLE "Kyc" ADD COLUMN IF NOT EXISTS "reviewNote" TEXT;',
    `CREATE TABLE IF NOT EXISTS "KycDocument" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "kycId" TEXT NOT NULL,
      "documentType" TEXT NOT NULL,
      "storagePath" TEXT NOT NULL,
      "mimeType" TEXT NOT NULL,
      "originalFileName" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "KycDocument_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "KycDocument_kycId_fkey" FOREIGN KEY ("kycId") REFERENCES "Kyc"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    'CREATE UNIQUE INDEX IF NOT EXISTS "KycDocument_kycId_documentType_key" ON "KycDocument"("kycId", "documentType");'
  ]);
};

exports.down = function down(db) {
  return runStatements(db, [
    'DROP INDEX IF EXISTS "KycDocument_kycId_documentType_key";',
    'DROP TABLE IF EXISTS "KycDocument";',
    'ALTER TABLE "Kyc" DROP COLUMN IF EXISTS "reviewNote";',
    'ALTER TABLE "Kyc" DROP COLUMN IF EXISTS "reviewedAt";',
    'ALTER TABLE "Kyc" DROP COLUMN IF EXISTS "submittedAt";',
    'ALTER TABLE "Kyc" DROP COLUMN IF EXISTS "representativeRole";',
    'ALTER TABLE "Kyc" DROP COLUMN IF EXISTS "representativeLastName";',
    'ALTER TABLE "Kyc" DROP COLUMN IF EXISTS "representativeFirstName";',
    'ALTER TABLE "Kyc" DROP COLUMN IF EXISTS "registeredBusinessAddress";',
    'ALTER TABLE "Kyc" DROP COLUMN IF EXISTS "registrationNumber";',
    'ALTER TABLE "Kyc" DROP COLUMN IF EXISTS "businessName";',
    'ALTER TABLE "Kyc" DROP COLUMN IF EXISTS "idNumber";',
    'ALTER TABLE "Kyc" DROP COLUMN IF EXISTS "idType";',
    'ALTER TABLE "Kyc" DROP COLUMN IF EXISTS "gender";',
    'ALTER TABLE "Kyc" DROP COLUMN IF EXISTS "dateOfBirth";',
    'ALTER TABLE "Kyc" DROP COLUMN IF EXISTS "fullName";',
    'ALTER TABLE "Kyc" DROP COLUMN IF EXISTS "bankAccountName";',
    'ALTER TABLE "Kyc" DROP COLUMN IF EXISTS "bankAccountNumber";',
    'ALTER TABLE "Kyc" DROP COLUMN IF EXISTS "bankName";',
    'ALTER TABLE "Kyc" DROP COLUMN IF EXISTS "country";',
    'ALTER TABLE "Kyc" DROP COLUMN IF EXISTS "state";',
    'ALTER TABLE "Kyc" DROP COLUMN IF EXISTS "city";',
    'ALTER TABLE "Kyc" DROP COLUMN IF EXISTS "address";',
    'ALTER TABLE "Kyc" DROP COLUMN IF EXISTS "phone";',
    'ALTER TABLE "Kyc" DROP COLUMN IF EXISTS "email";'
  ]);
};

exports._meta = {
  version: 1
};
