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
    'DROP TABLE IF EXISTS "OrderItem" CASCADE;',
    'DROP TABLE IF EXISTS "CartItem" CASCADE;',
    'DROP TABLE IF EXISTS "Inventory" CASCADE;',
    'DROP TABLE IF EXISTS "Order" CASCADE;',
    'DROP TABLE IF EXISTS "Cart" CASCADE;',
    'DROP TABLE IF EXISTS "ProductImage" CASCADE;',
    'DROP TABLE IF EXISTS "Product" CASCADE;',
    'DROP TABLE IF EXISTS "SellerMembership" CASCADE;',
    'DROP TABLE IF EXISTS "Store" CASCADE;',
    `CREATE TABLE IF NOT EXISTS "Product" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "sellerId" TEXT NOT NULL,
      "categoryId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "sku" TEXT,
      "price" NUMERIC(12,2) NOT NULL,
      "quantity" INTEGER NOT NULL DEFAULT 0,
      "currency" TEXT NOT NULL DEFAULT 'NGN',
      "condition" TEXT NOT NULL,
      "brand" TEXT,
      "weightKg" NUMERIC(10,3) NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'pending_review',
      "reviewNote" TEXT,
      "reviewedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Product_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "Product_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
      CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS "ProductImage" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "productId" TEXT NOT NULL,
      "storagePath" TEXT NOT NULL,
      "mimeType" TEXT NOT NULL,
      "originalFileName" TEXT NOT NULL,
      "position" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    'CREATE INDEX IF NOT EXISTS "Product_sellerId_idx" ON "Product"("sellerId");',
    'CREATE INDEX IF NOT EXISTS "Product_categoryId_idx" ON "Product"("categoryId");',
    'CREATE INDEX IF NOT EXISTS "Product_status_idx" ON "Product"("status");',
    'CREATE INDEX IF NOT EXISTS "ProductImage_productId_idx" ON "ProductImage"("productId");'
  ]);
};

exports.down = function down(db) {
  return runStatements(db, [
    'DROP INDEX IF EXISTS "ProductImage_productId_idx";',
    'DROP INDEX IF EXISTS "Product_status_idx";',
    'DROP INDEX IF EXISTS "Product_categoryId_idx";',
    'DROP INDEX IF EXISTS "Product_sellerId_idx";',
    'DROP TABLE IF EXISTS "ProductImage";',
    'DROP TABLE IF EXISTS "Product";',
    `CREATE TABLE "Store" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "name" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
    );`,
    `CREATE TABLE "SellerMembership" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "userId" TEXT NOT NULL,
      "storeId" TEXT NOT NULL,
      "role" TEXT NOT NULL,
      CONSTRAINT "SellerMembership_pkey" PRIMARY KEY ("id")
    );`,
    'CREATE UNIQUE INDEX "SellerMembership_userId_storeId_key" ON "SellerMembership"("userId", "storeId");',
    `CREATE TABLE "Product" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "storeId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "description" TEXT,
      "price" DECIMAL(10,2) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
    );`,
    `CREATE TABLE "Inventory" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "productId" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL,
      CONSTRAINT "Inventory_pkey" PRIMARY KEY ("id")
    );`,
    'CREATE UNIQUE INDEX "Inventory_productId_key" ON "Inventory"("productId");',
    `CREATE TABLE "Cart" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "userId" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
    );`,
    `CREATE TABLE "CartItem" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "cartId" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL,
      CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
    );`,
    'CREATE UNIQUE INDEX "CartItem_cartId_productId_key" ON "CartItem"("cartId", "productId");',
    `CREATE TABLE "Order" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "userId" TEXT NOT NULL,
      "storeId" TEXT NOT NULL,
      "status" TEXT NOT NULL,
      "total" DECIMAL(10,2) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
    );`,
    `CREATE TABLE "OrderItem" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "orderId" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL,
      "price" DECIMAL(10,2) NOT NULL,
      CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
    );`,
    'ALTER TABLE "SellerMembership" ADD CONSTRAINT "SellerMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;',
    'ALTER TABLE "SellerMembership" ADD CONSTRAINT "SellerMembership_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;',
    'ALTER TABLE "Product" ADD CONSTRAINT "Product_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;',
    'ALTER TABLE "Inventory" ADD CONSTRAINT "Inventory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;',
    'ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;',
    'ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;',
    'ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;',
    'ALTER TABLE "Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;',
    'ALTER TABLE "Order" ADD CONSTRAINT "Order_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;',
    'ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;',
    'ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;'
  ]);
};

exports._meta = {
  version: 1
};
