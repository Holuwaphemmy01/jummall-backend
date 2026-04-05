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
    `CREATE TABLE IF NOT EXISTS "CheckoutSession" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "reference" TEXT NOT NULL,
      "buyerId" TEXT NOT NULL,
      "cartId" TEXT NOT NULL,
      "orderId" TEXT,
      "paymentProvider" TEXT NOT NULL,
      "authorizationUrl" TEXT,
      "accessCode" TEXT,
      "status" TEXT NOT NULL DEFAULT 'initialized',
      "failureReason" TEXT,
      "currency" TEXT NOT NULL,
      "totalItems" INTEGER NOT NULL,
      "rawSubtotal" NUMERIC(12,2) NOT NULL,
      "discountedSubtotal" NUMERIC(12,2) NOT NULL,
      "baseShippingFee" NUMERIC(12,2) NOT NULL,
      "finalShippingFee" NUMERIC(12,2) NOT NULL,
      "totalPayable" NUMERIC(12,2) NOT NULL,
      "shippingMode" TEXT NOT NULL,
      "categoryShippingMode" TEXT NOT NULL,
      "freeShippingApplied" BOOLEAN NOT NULL DEFAULT FALSE,
      "freeShippingRuleId" TEXT,
      "freeShippingRuleType" TEXT,
      "freeShippingCouponCode" TEXT,
      "billingAddressSnapshot" JSONB NOT NULL,
      "shippingBreakdownSnapshot" JSONB NOT NULL,
      "completedAt" TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CheckoutSession_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "CheckoutSession_reference_key" UNIQUE ("reference"),
      CONSTRAINT "CheckoutSession_status_check" CHECK ("status" IN ('initialized', 'completed', 'failed')),
      CONSTRAINT "CheckoutSession_shippingMode_check" CHECK ("shippingMode" IN ('PLATFORM', 'VENDOR')),
      CONSTRAINT "CheckoutSession_categoryShippingMode_check" CHECK ("categoryShippingMode" IN ('HIGHEST', 'ADDITIVE')),
      CONSTRAINT "CheckoutSession_freeShippingRuleType_check" CHECK (
        "freeShippingRuleType" IS NULL OR "freeShippingRuleType" IN ('coupon', 'threshold')
      ),
      CONSTRAINT "CheckoutSession_paymentProvider_check" CHECK ("paymentProvider" IN ('paystack')),
      CONSTRAINT "CheckoutSession_totalItems_check" CHECK ("totalItems" >= 0),
      CONSTRAINT "CheckoutSession_rawSubtotal_check" CHECK ("rawSubtotal" >= 0),
      CONSTRAINT "CheckoutSession_discountedSubtotal_check" CHECK ("discountedSubtotal" >= 0),
      CONSTRAINT "CheckoutSession_baseShippingFee_check" CHECK ("baseShippingFee" >= 0),
      CONSTRAINT "CheckoutSession_finalShippingFee_check" CHECK ("finalShippingFee" >= 0),
      CONSTRAINT "CheckoutSession_totalPayable_check" CHECK ("totalPayable" >= 0),
      CONSTRAINT "CheckoutSession_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "CheckoutSession_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS "CheckoutSessionItem" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "checkoutSessionId" TEXT NOT NULL,
      "cartItemId" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "sellerId" TEXT NOT NULL,
      "categoryId" TEXT NOT NULL,
      "categoryName" TEXT,
      "brandId" TEXT,
      "brandName" TEXT,
      "productName" TEXT NOT NULL,
      "productDescription" TEXT NOT NULL,
      "sku" TEXT,
      "unitPrice" NUMERIC(12,2) NOT NULL,
      "quantity" INTEGER NOT NULL,
      "lineSubtotal" NUMERIC(12,2) NOT NULL,
      "currency" TEXT NOT NULL,
      "condition" TEXT NOT NULL,
      "weightKg" NUMERIC(10,3) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "CheckoutSessionItem_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "CheckoutSessionItem_checkoutSessionId_fkey" FOREIGN KEY ("checkoutSessionId") REFERENCES "CheckoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "CheckoutSessionItem_quantity_check" CHECK ("quantity" > 0),
      CONSTRAINT "CheckoutSessionItem_unitPrice_check" CHECK ("unitPrice" >= 0),
      CONSTRAINT "CheckoutSessionItem_lineSubtotal_check" CHECK ("lineSubtotal" >= 0),
      CONSTRAINT "CheckoutSessionItem_weightKg_check" CHECK ("weightKg" >= 0)
    );`,
    `CREATE TABLE IF NOT EXISTS "Order" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "checkoutSessionId" TEXT NOT NULL,
      "buyerId" TEXT NOT NULL,
      "paymentProvider" TEXT NOT NULL,
      "paymentReference" TEXT NOT NULL,
      "status" TEXT NOT NULL DEFAULT 'pending_fulfillment',
      "currency" TEXT NOT NULL,
      "totalItems" INTEGER NOT NULL,
      "rawSubtotal" NUMERIC(12,2) NOT NULL,
      "discountedSubtotal" NUMERIC(12,2) NOT NULL,
      "baseShippingFee" NUMERIC(12,2) NOT NULL,
      "finalShippingFee" NUMERIC(12,2) NOT NULL,
      "totalPaid" NUMERIC(12,2) NOT NULL,
      "shippingMode" TEXT NOT NULL,
      "categoryShippingMode" TEXT NOT NULL,
      "freeShippingApplied" BOOLEAN NOT NULL DEFAULT FALSE,
      "freeShippingRuleId" TEXT,
      "freeShippingRuleType" TEXT,
      "freeShippingCouponCode" TEXT,
      "paidAt" TIMESTAMP(3),
      "billingAddressSnapshot" JSONB NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Order_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "Order_checkoutSessionId_key" UNIQUE ("checkoutSessionId"),
      CONSTRAINT "Order_paymentReference_key" UNIQUE ("paymentReference"),
      CONSTRAINT "Order_status_check" CHECK ("status" IN ('pending_fulfillment')),
      CONSTRAINT "Order_shippingMode_check" CHECK ("shippingMode" IN ('PLATFORM', 'VENDOR')),
      CONSTRAINT "Order_categoryShippingMode_check" CHECK ("categoryShippingMode" IN ('HIGHEST', 'ADDITIVE')),
      CONSTRAINT "Order_freeShippingRuleType_check" CHECK (
        "freeShippingRuleType" IS NULL OR "freeShippingRuleType" IN ('coupon', 'threshold')
      ),
      CONSTRAINT "Order_paymentProvider_check" CHECK ("paymentProvider" IN ('paystack')),
      CONSTRAINT "Order_totalItems_check" CHECK ("totalItems" >= 0),
      CONSTRAINT "Order_rawSubtotal_check" CHECK ("rawSubtotal" >= 0),
      CONSTRAINT "Order_discountedSubtotal_check" CHECK ("discountedSubtotal" >= 0),
      CONSTRAINT "Order_baseShippingFee_check" CHECK ("baseShippingFee" >= 0),
      CONSTRAINT "Order_finalShippingFee_check" CHECK ("finalShippingFee" >= 0),
      CONSTRAINT "Order_totalPaid_check" CHECK ("totalPaid" >= 0),
      CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "Order_checkoutSessionId_fkey" FOREIGN KEY ("checkoutSessionId") REFERENCES "CheckoutSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );`,
    `CREATE TABLE IF NOT EXISTS "OrderItem" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "orderId" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "sellerId" TEXT NOT NULL,
      "categoryId" TEXT NOT NULL,
      "categoryName" TEXT,
      "brandId" TEXT,
      "brandName" TEXT,
      "productName" TEXT NOT NULL,
      "productDescription" TEXT NOT NULL,
      "sku" TEXT,
      "unitPrice" NUMERIC(12,2) NOT NULL,
      "quantity" INTEGER NOT NULL,
      "lineSubtotal" NUMERIC(12,2) NOT NULL,
      "currency" TEXT NOT NULL,
      "condition" TEXT NOT NULL,
      "weightKg" NUMERIC(10,3) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE,
      CONSTRAINT "OrderItem_quantity_check" CHECK ("quantity" > 0),
      CONSTRAINT "OrderItem_unitPrice_check" CHECK ("unitPrice" >= 0),
      CONSTRAINT "OrderItem_lineSubtotal_check" CHECK ("lineSubtotal" >= 0),
      CONSTRAINT "OrderItem_weightKg_check" CHECK ("weightKg" >= 0)
    );`,
    `CREATE TABLE IF NOT EXISTS "OrderShippingSegment" (
      "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
      "orderId" TEXT NOT NULL,
      "sellerId" TEXT,
      "ruleOwnerType" TEXT NOT NULL,
      "finalShippingOwnerType" TEXT NOT NULL,
      "usedFallback" BOOLEAN NOT NULL DEFAULT FALSE,
      "matchedZoneId" TEXT NOT NULL,
      "matchedZoneName" TEXT NOT NULL,
      "matchedZoneMatchType" TEXT NOT NULL,
      "zoneFee" NUMERIC(12,2) NOT NULL,
      "categoryFee" NUMERIC(12,2) NOT NULL,
      "baseShippingFee" NUMERIC(12,2) NOT NULL,
      "finalShippingFee" NUMERIC(12,2) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "OrderShippingSegment_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "OrderShippingSegment_ruleOwnerType_check" CHECK ("ruleOwnerType" IN ('platform', 'vendor')),
      CONSTRAINT "OrderShippingSegment_finalShippingOwnerType_check" CHECK ("finalShippingOwnerType" IN ('platform', 'vendor')),
      CONSTRAINT "OrderShippingSegment_matchedZoneMatchType_check" CHECK ("matchedZoneMatchType" IN ('state', 'city')),
      CONSTRAINT "OrderShippingSegment_zoneFee_check" CHECK ("zoneFee" >= 0),
      CONSTRAINT "OrderShippingSegment_categoryFee_check" CHECK ("categoryFee" >= 0),
      CONSTRAINT "OrderShippingSegment_baseShippingFee_check" CHECK ("baseShippingFee" >= 0),
      CONSTRAINT "OrderShippingSegment_finalShippingFee_check" CHECK ("finalShippingFee" >= 0),
      CONSTRAINT "OrderShippingSegment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE
    );`,
    'CREATE UNIQUE INDEX IF NOT EXISTS "CheckoutSession_buyer_initialized_key" ON "CheckoutSession"("buyerId") WHERE "status" = \'initialized\';',
    'CREATE INDEX IF NOT EXISTS "CheckoutSession_buyerId_idx" ON "CheckoutSession"("buyerId");',
    'CREATE INDEX IF NOT EXISTS "CheckoutSession_status_idx" ON "CheckoutSession"("status");',
    'CREATE INDEX IF NOT EXISTS "CheckoutSessionItem_checkoutSessionId_idx" ON "CheckoutSessionItem"("checkoutSessionId");',
    'CREATE INDEX IF NOT EXISTS "Order_buyerId_idx" ON "Order"("buyerId");',
    'CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId");',
    'CREATE INDEX IF NOT EXISTS "OrderShippingSegment_orderId_idx" ON "OrderShippingSegment"("orderId");'
  ]);
};

exports.down = function down(db) {
  return runStatements(db, [
    'DROP TABLE IF EXISTS "OrderShippingSegment";',
    'DROP TABLE IF EXISTS "OrderItem";',
    'DROP TABLE IF EXISTS "Order";',
    'DROP TABLE IF EXISTS "CheckoutSessionItem";',
    'DROP TABLE IF EXISTS "CheckoutSession";'
  ]);
};

exports._meta = {
  version: 1
};
