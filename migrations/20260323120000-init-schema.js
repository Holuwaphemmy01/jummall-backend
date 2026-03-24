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
  ];

  return runStatements(db, statements);
};

exports.down = function down(db) {
  const statements = [
    'DROP TABLE IF EXISTS "OrderItem";',
    'DROP TABLE IF EXISTS "Order";',
    'DROP TABLE IF EXISTS "CartItem";',
    'DROP TABLE IF EXISTS "Cart";',
    'DROP TABLE IF EXISTS "Inventory";',
    'DROP TABLE IF EXISTS "Product";',
    'DROP TABLE IF EXISTS "SellerMembership";',
    'DROP TABLE IF EXISTS "Store";',
    'DROP TABLE IF EXISTS "User";'
  ];

  return runStatements(db, statements);
};

exports._meta = {
  version: 1
};
