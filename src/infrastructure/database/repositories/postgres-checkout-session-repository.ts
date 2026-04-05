import type { Pool } from "pg";

import databasePool from "../client";
import type {
  CheckoutSessionBillingAddressSnapshot,
  CheckoutSessionDetailRecord,
  CheckoutSessionItemRecord,
  CheckoutSessionRecord,
  CheckoutSessionRepository,
  CheckoutSessionShippingBreakdownItem,
  CreateCheckoutSessionInput,
  MarkCheckoutSessionCompletedInput,
  MarkCheckoutSessionFailedInput,
  UpdateCheckoutSessionPaymentInitializationInput
} from "../../../ports/checkout-session-repository";
import type {
  CategoryShippingMode,
  ShippingMode
} from "../../../ports/shipping/shipping-settings-repository";
import type { FreeShippingRuleType } from "../../../ports/shipping/shipping-models";

type Queryable = Pick<Pool, "query">;

interface CheckoutSessionRow {
  id: string;
  reference: string;
  buyerId: string;
  cartId: string;
  orderId: string | null;
  paymentProvider: string;
  authorizationUrl: string | null;
  accessCode: string | null;
  status: "initialized" | "completed" | "failed";
  failureReason: string | null;
  currency: string;
  totalItems: number;
  rawSubtotal: string;
  discountedSubtotal: string;
  baseShippingFee: string;
  finalShippingFee: string;
  totalPayable: string;
  shippingMode: ShippingMode;
  categoryShippingMode: CategoryShippingMode;
  freeShippingApplied: boolean;
  freeShippingRuleId: string | null;
  freeShippingRuleType: FreeShippingRuleType | null;
  freeShippingCouponCode: string | null;
  billingAddressSnapshot: CheckoutSessionBillingAddressSnapshot;
  shippingBreakdownSnapshot: CheckoutSessionShippingBreakdownItem[];
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

interface CheckoutSessionItemRow {
  id: string;
  checkoutSessionId: string;
  cartItemId: string;
  productId: string;
  sellerId: string;
  categoryId: string;
  categoryName: string | null;
  brandId: string | null;
  brandName: string | null;
  productName: string;
  productDescription: string;
  sku: string | null;
  unitPrice: string;
  quantity: number;
  lineSubtotal: string;
  currency: string;
  condition: string;
  weightKg: string;
  createdAt: Date;
  updatedAt: Date;
}

export class PostgresCheckoutSessionRepository
  implements CheckoutSessionRepository
{
  constructor(private readonly executor: Queryable = databasePool) {}

  async create(
    input: CreateCheckoutSessionInput
  ): Promise<CheckoutSessionDetailRecord> {
    const sessionResult = await this.executor.query<CheckoutSessionRow>(
      `
        INSERT INTO "CheckoutSession" (
          "reference",
          "buyerId",
          "cartId",
          "paymentProvider",
          "authorizationUrl",
          "accessCode",
          "status",
          "failureReason",
          "currency",
          "totalItems",
          "rawSubtotal",
          "discountedSubtotal",
          "baseShippingFee",
          "finalShippingFee",
          "totalPayable",
          "shippingMode",
          "categoryShippingMode",
          "freeShippingApplied",
          "freeShippingRuleId",
          "freeShippingRuleType",
          "freeShippingCouponCode",
          "billingAddressSnapshot",
          "shippingBreakdownSnapshot"
        )
        VALUES (
          $1, $2, $3, $4, NULL, NULL, 'initialized', NULL,
          $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
          $18::jsonb, $19::jsonb
        )
        RETURNING
          "id",
          "reference",
          "buyerId",
          "cartId",
          "orderId",
          "paymentProvider",
          "authorizationUrl",
          "accessCode",
          "status",
          "failureReason",
          "currency",
          "totalItems",
          "rawSubtotal",
          "discountedSubtotal",
          "baseShippingFee",
          "finalShippingFee",
          "totalPayable",
          "shippingMode",
          "categoryShippingMode",
          "freeShippingApplied",
          "freeShippingRuleId",
          "freeShippingRuleType",
          "freeShippingCouponCode",
          "billingAddressSnapshot",
          "shippingBreakdownSnapshot",
          "createdAt",
          "updatedAt",
          "completedAt"
      `,
      [
        input.reference,
        input.buyerId,
        input.cartId,
        input.paymentProvider,
        input.currency,
        input.totalItems,
        input.rawSubtotal,
        input.discountedSubtotal,
        input.baseShippingFee,
        input.finalShippingFee,
        input.totalPayable,
        input.shippingMode,
        input.categoryShippingMode,
        input.freeShippingApplied,
        input.freeShippingRuleId,
        input.freeShippingRuleType,
        input.freeShippingCouponCode,
        JSON.stringify(input.billingAddress),
        JSON.stringify(input.shippingBreakdown)
      ]
    );

    const session = this.mapSessionRow(sessionResult.rows[0]);

    for (const item of input.items) {
      await this.executor.query<CheckoutSessionItemRow>(
        `
          INSERT INTO "CheckoutSessionItem" (
            "checkoutSessionId",
            "cartItemId",
            "productId",
            "sellerId",
            "categoryId",
            "categoryName",
            "brandId",
            "brandName",
            "productName",
            "productDescription",
            "sku",
            "unitPrice",
            "quantity",
            "lineSubtotal",
            "currency",
            "condition",
            "weightKg"
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
            $16, $17
          )
        `,
        [
          session.id,
          item.cartItemId,
          item.productId,
          item.sellerId,
          item.categoryId,
          item.categoryName,
          item.brandId,
          item.brandName,
          item.productName,
          item.productDescription,
          item.sku,
          item.unitPrice,
          item.quantity,
          item.lineSubtotal,
          item.currency,
          item.condition,
          item.weightKg
        ]
      );
    }

    return this.findByReference(input.reference) as Promise<CheckoutSessionDetailRecord>;
  }

  async findInitializedByBuyerId(
    buyerId: string
  ): Promise<CheckoutSessionRecord | null> {
    const result = await this.executor.query<CheckoutSessionRow>(
      `
        SELECT
          "id",
          "reference",
          "buyerId",
          "cartId",
          "orderId",
          "paymentProvider",
          "authorizationUrl",
          "accessCode",
          "status",
          "failureReason",
          "currency",
          "totalItems",
          "rawSubtotal",
          "discountedSubtotal",
          "baseShippingFee",
          "finalShippingFee",
          "totalPayable",
          "shippingMode",
          "categoryShippingMode",
          "freeShippingApplied",
          "freeShippingRuleId",
          "freeShippingRuleType",
          "freeShippingCouponCode",
          "billingAddressSnapshot",
          "shippingBreakdownSnapshot",
          "createdAt",
          "updatedAt",
          "completedAt"
        FROM "CheckoutSession"
        WHERE "buyerId" = $1
          AND "status" = 'initialized'
        ORDER BY "createdAt" DESC
        LIMIT 1
      `,
      [buyerId]
    );

    return result.rows[0] ? this.mapSessionRow(result.rows[0]) : null;
  }

  async findByReference(
    reference: string
  ): Promise<CheckoutSessionDetailRecord | null> {
    const result = await this.executor.query<CheckoutSessionRow>(
      `
        SELECT
          "id",
          "reference",
          "buyerId",
          "cartId",
          "orderId",
          "paymentProvider",
          "authorizationUrl",
          "accessCode",
          "status",
          "failureReason",
          "currency",
          "totalItems",
          "rawSubtotal",
          "discountedSubtotal",
          "baseShippingFee",
          "finalShippingFee",
          "totalPayable",
          "shippingMode",
          "categoryShippingMode",
          "freeShippingApplied",
          "freeShippingRuleId",
          "freeShippingRuleType",
          "freeShippingCouponCode",
          "billingAddressSnapshot",
          "shippingBreakdownSnapshot",
          "createdAt",
          "updatedAt",
          "completedAt"
        FROM "CheckoutSession"
        WHERE "reference" = $1
        LIMIT 1
      `,
      [reference]
    );

    const row = result.rows[0];

    if (!row) {
      return null;
    }

    const items = await this.findItemsBySessionId(row.id);

    return {
      ...this.mapSessionRow(row),
      items
    };
  }

  async updatePaymentInitialization(
    input: UpdateCheckoutSessionPaymentInitializationInput
  ): Promise<CheckoutSessionRecord | null> {
    const result = await this.executor.query<CheckoutSessionRow>(
      `
        UPDATE "CheckoutSession"
        SET
          "authorizationUrl" = $2,
          "accessCode" = $3,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $1
        RETURNING
          "id",
          "reference",
          "buyerId",
          "cartId",
          "orderId",
          "paymentProvider",
          "authorizationUrl",
          "accessCode",
          "status",
          "failureReason",
          "currency",
          "totalItems",
          "rawSubtotal",
          "discountedSubtotal",
          "baseShippingFee",
          "finalShippingFee",
          "totalPayable",
          "shippingMode",
          "categoryShippingMode",
          "freeShippingApplied",
          "freeShippingRuleId",
          "freeShippingRuleType",
          "freeShippingCouponCode",
          "billingAddressSnapshot",
          "shippingBreakdownSnapshot",
          "createdAt",
          "updatedAt",
          "completedAt"
      `,
      [input.sessionId, input.authorizationUrl, input.accessCode]
    );

    return result.rows[0] ? this.mapSessionRow(result.rows[0]) : null;
  }

  async markCompleted(
    input: MarkCheckoutSessionCompletedInput
  ): Promise<CheckoutSessionRecord | null> {
    const result = await this.executor.query<CheckoutSessionRow>(
      `
        UPDATE "CheckoutSession"
        SET
          "status" = 'completed',
          "orderId" = $2,
          "failureReason" = NULL,
          "completedAt" = CURRENT_TIMESTAMP,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $1
        RETURNING
          "id",
          "reference",
          "buyerId",
          "cartId",
          "orderId",
          "paymentProvider",
          "authorizationUrl",
          "accessCode",
          "status",
          "failureReason",
          "currency",
          "totalItems",
          "rawSubtotal",
          "discountedSubtotal",
          "baseShippingFee",
          "finalShippingFee",
          "totalPayable",
          "shippingMode",
          "categoryShippingMode",
          "freeShippingApplied",
          "freeShippingRuleId",
          "freeShippingRuleType",
          "freeShippingCouponCode",
          "billingAddressSnapshot",
          "shippingBreakdownSnapshot",
          "createdAt",
          "updatedAt",
          "completedAt"
      `,
      [input.sessionId, input.orderId]
    );

    return result.rows[0] ? this.mapSessionRow(result.rows[0]) : null;
  }

  async markFailed(
    input: MarkCheckoutSessionFailedInput
  ): Promise<CheckoutSessionRecord | null> {
    const result = await this.executor.query<CheckoutSessionRow>(
      `
        UPDATE "CheckoutSession"
        SET
          "status" = 'failed',
          "failureReason" = $2,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = $1
        RETURNING
          "id",
          "reference",
          "buyerId",
          "cartId",
          "orderId",
          "paymentProvider",
          "authorizationUrl",
          "accessCode",
          "status",
          "failureReason",
          "currency",
          "totalItems",
          "rawSubtotal",
          "discountedSubtotal",
          "baseShippingFee",
          "finalShippingFee",
          "totalPayable",
          "shippingMode",
          "categoryShippingMode",
          "freeShippingApplied",
          "freeShippingRuleId",
          "freeShippingRuleType",
          "freeShippingCouponCode",
          "billingAddressSnapshot",
          "shippingBreakdownSnapshot",
          "createdAt",
          "updatedAt",
          "completedAt"
      `,
      [input.sessionId, input.failureReason]
    );

    return result.rows[0] ? this.mapSessionRow(result.rows[0]) : null;
  }

  private async findItemsBySessionId(
    sessionId: string
  ): Promise<CheckoutSessionItemRecord[]> {
    const result = await this.executor.query<CheckoutSessionItemRow>(
      `
        SELECT
          "id",
          "checkoutSessionId",
          "cartItemId",
          "productId",
          "sellerId",
          "categoryId",
          "categoryName",
          "brandId",
          "brandName",
          "productName",
          "productDescription",
          "sku",
          "unitPrice",
          "quantity",
          "lineSubtotal",
          "currency",
          "condition",
          "weightKg",
          "createdAt",
          "updatedAt"
        FROM "CheckoutSessionItem"
        WHERE "checkoutSessionId" = $1
        ORDER BY "createdAt" ASC
      `,
      [sessionId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      checkoutSessionId: row.checkoutSessionId,
      cartItemId: row.cartItemId,
      productId: row.productId,
      sellerId: row.sellerId,
      categoryId: row.categoryId,
      categoryName: row.categoryName,
      brandId: row.brandId,
      brandName: row.brandName,
      productName: row.productName,
      productDescription: row.productDescription,
      sku: row.sku,
      unitPrice: Number(row.unitPrice),
      quantity: row.quantity,
      lineSubtotal: Number(row.lineSubtotal),
      currency: row.currency,
      condition: row.condition,
      weightKg: Number(row.weightKg),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));
  }

  private mapSessionRow(row: CheckoutSessionRow): CheckoutSessionRecord {
    return {
      id: row.id,
      reference: row.reference,
      buyerId: row.buyerId,
      cartId: row.cartId,
      orderId: row.orderId,
      paymentProvider: row.paymentProvider,
      authorizationUrl: row.authorizationUrl,
      accessCode: row.accessCode,
      status: row.status,
      failureReason: row.failureReason,
      currency: row.currency,
      totalItems: row.totalItems,
      rawSubtotal: Number(row.rawSubtotal),
      discountedSubtotal: Number(row.discountedSubtotal),
      baseShippingFee: Number(row.baseShippingFee),
      finalShippingFee: Number(row.finalShippingFee),
      totalPayable: Number(row.totalPayable),
      shippingMode: row.shippingMode,
      categoryShippingMode: row.categoryShippingMode,
      freeShippingApplied: row.freeShippingApplied,
      freeShippingRuleId: row.freeShippingRuleId,
      freeShippingRuleType: row.freeShippingRuleType,
      freeShippingCouponCode: row.freeShippingCouponCode,
      billingAddress: row.billingAddressSnapshot,
      shippingBreakdown: row.shippingBreakdownSnapshot,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      completedAt: row.completedAt
    };
  }
}

