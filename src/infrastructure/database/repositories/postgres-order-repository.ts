import type { Pool } from "pg";

import databasePool from "../client";
import type {
  CreateOrderInput,
  OrderDetailRecord,
  OrderItemRecord,
  OrderRecord,
  OrderRepository,
  OrderShippingSegmentRecord
} from "../../../ports/order-repository";
import type {
  CategoryShippingMode,
  ShippingMode
} from "../../../ports/shipping/shipping-settings-repository";
import type { FreeShippingRuleType } from "../../../ports/shipping/shipping-models";

type Queryable = Pick<Pool, "query">;

interface OrderRow {
  id: string;
  checkoutSessionId: string;
  buyerId: string;
  paymentProvider: string;
  paymentReference: string;
  status: "pending_fulfillment";
  currency: string;
  totalItems: number;
  rawSubtotal: string;
  discountedSubtotal: string;
  baseShippingFee: string;
  finalShippingFee: string;
  totalPaid: string;
  shippingMode: ShippingMode;
  categoryShippingMode: CategoryShippingMode;
  freeShippingApplied: boolean;
  freeShippingRuleId: string | null;
  freeShippingRuleType: FreeShippingRuleType | null;
  freeShippingCouponCode: string | null;
  paidAt: Date | null;
  billingAddressSnapshot: OrderRecord["billingAddress"];
  createdAt: Date;
  updatedAt: Date;
}

interface OrderItemRow {
  id: string;
  orderId: string;
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

interface OrderShippingSegmentRow {
  id: string;
  orderId: string;
  sellerId: string | null;
  ruleOwnerType: "platform" | "vendor";
  finalShippingOwnerType: "platform" | "vendor";
  usedFallback: boolean;
  matchedZoneId: string;
  matchedZoneName: string;
  matchedZoneMatchType: "state" | "city";
  zoneFee: string;
  categoryFee: string;
  baseShippingFee: string;
  finalShippingFee: string;
  createdAt: Date;
  updatedAt: Date;
}

export class PostgresOrderRepository implements OrderRepository {
  constructor(private readonly executor: Queryable = databasePool) {}

  async create(input: CreateOrderInput): Promise<OrderDetailRecord> {
    const orderResult = await this.executor.query<OrderRow>(
      `
        INSERT INTO "Order" (
          "checkoutSessionId",
          "buyerId",
          "paymentProvider",
          "paymentReference",
          "status",
          "currency",
          "totalItems",
          "rawSubtotal",
          "discountedSubtotal",
          "baseShippingFee",
          "finalShippingFee",
          "totalPaid",
          "shippingMode",
          "categoryShippingMode",
          "freeShippingApplied",
          "freeShippingRuleId",
          "freeShippingRuleType",
          "freeShippingCouponCode",
          "paidAt",
          "billingAddressSnapshot"
        )
        VALUES (
          $1, $2, $3, $4, 'pending_fulfillment', $5, $6, $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16, $17, $18, $19::jsonb
        )
        RETURNING
          "id",
          "checkoutSessionId",
          "buyerId",
          "paymentProvider",
          "paymentReference",
          "status",
          "currency",
          "totalItems",
          "rawSubtotal",
          "discountedSubtotal",
          "baseShippingFee",
          "finalShippingFee",
          "totalPaid",
          "shippingMode",
          "categoryShippingMode",
          "freeShippingApplied",
          "freeShippingRuleId",
          "freeShippingRuleType",
          "freeShippingCouponCode",
          "paidAt",
          "billingAddressSnapshot",
          "createdAt",
          "updatedAt"
      `,
      [
        input.checkoutSessionId,
        input.buyerId,
        input.paymentProvider,
        input.paymentReference,
        input.currency,
        input.totalItems,
        input.rawSubtotal,
        input.discountedSubtotal,
        input.baseShippingFee,
        input.finalShippingFee,
        input.totalPaid,
        input.shippingMode,
        input.categoryShippingMode,
        input.freeShippingApplied,
        input.freeShippingRuleId,
        input.freeShippingRuleType,
        input.freeShippingCouponCode,
        input.paidAt,
        JSON.stringify(input.billingAddress)
      ]
    );

    const order = orderResult.rows[0];

    for (const item of input.items) {
      await this.executor.query(
        `
          INSERT INTO "OrderItem" (
            "orderId",
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
            $16
          )
        `,
        [
          order.id,
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

    for (const segment of input.shippingSegments) {
      await this.executor.query(
        `
          INSERT INTO "OrderShippingSegment" (
            "orderId",
            "sellerId",
            "ruleOwnerType",
            "finalShippingOwnerType",
            "usedFallback",
            "matchedZoneId",
            "matchedZoneName",
            "matchedZoneMatchType",
            "zoneFee",
            "categoryFee",
            "baseShippingFee",
            "finalShippingFee"
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
          )
        `,
        [
          order.id,
          segment.sellerId,
          segment.ruleOwnerType,
          segment.finalShippingOwnerType,
          segment.usedFallback,
          segment.matchedZoneId,
          segment.matchedZoneName,
          segment.matchedZoneMatchType,
          segment.zoneFee,
          segment.categoryFee,
          segment.baseShippingFee,
          segment.finalShippingFee
        ]
      );
    }

    return this.findById(order.id) as Promise<OrderDetailRecord>;
  }

  async findById(orderId: string): Promise<OrderDetailRecord | null> {
    const result = await this.executor.query<OrderRow>(
      `
        SELECT
          "id",
          "checkoutSessionId",
          "buyerId",
          "paymentProvider",
          "paymentReference",
          "status",
          "currency",
          "totalItems",
          "rawSubtotal",
          "discountedSubtotal",
          "baseShippingFee",
          "finalShippingFee",
          "totalPaid",
          "shippingMode",
          "categoryShippingMode",
          "freeShippingApplied",
          "freeShippingRuleId",
          "freeShippingRuleType",
          "freeShippingCouponCode",
          "paidAt",
          "billingAddressSnapshot",
          "createdAt",
          "updatedAt"
        FROM "Order"
        WHERE "id" = $1
        LIMIT 1
      `,
      [orderId]
    );

    const row = result.rows[0];

    if (!row) {
      return null;
    }

    const items = await this.findItemsByOrderId(orderId);
    const shippingSegments = await this.findShippingSegmentsByOrderId(orderId);

    return {
      ...this.mapOrderRow(row),
      items,
      shippingSegments
    };
  }

  private async findItemsByOrderId(orderId: string): Promise<OrderItemRecord[]> {
    const result = await this.executor.query<OrderItemRow>(
      `
        SELECT
          "id",
          "orderId",
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
        FROM "OrderItem"
        WHERE "orderId" = $1
        ORDER BY "createdAt" ASC
      `,
      [orderId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      orderId: row.orderId,
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

  private async findShippingSegmentsByOrderId(
    orderId: string
  ): Promise<OrderShippingSegmentRecord[]> {
    const result = await this.executor.query<OrderShippingSegmentRow>(
      `
        SELECT
          "id",
          "orderId",
          "sellerId",
          "ruleOwnerType",
          "finalShippingOwnerType",
          "usedFallback",
          "matchedZoneId",
          "matchedZoneName",
          "matchedZoneMatchType",
          "zoneFee",
          "categoryFee",
          "baseShippingFee",
          "finalShippingFee",
          "createdAt",
          "updatedAt"
        FROM "OrderShippingSegment"
        WHERE "orderId" = $1
        ORDER BY "createdAt" ASC
      `,
      [orderId]
    );

    return result.rows.map((row) => ({
      id: row.id,
      orderId: row.orderId,
      sellerId: row.sellerId,
      ruleOwnerType: row.ruleOwnerType,
      finalShippingOwnerType: row.finalShippingOwnerType,
      usedFallback: row.usedFallback,
      matchedZoneId: row.matchedZoneId,
      matchedZoneName: row.matchedZoneName,
      matchedZoneMatchType: row.matchedZoneMatchType,
      zoneFee: Number(row.zoneFee),
      categoryFee: Number(row.categoryFee),
      baseShippingFee: Number(row.baseShippingFee),
      finalShippingFee: Number(row.finalShippingFee),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));
  }

  private mapOrderRow(row: OrderRow): OrderRecord {
    return {
      id: row.id,
      checkoutSessionId: row.checkoutSessionId,
      buyerId: row.buyerId,
      paymentProvider: row.paymentProvider,
      paymentReference: row.paymentReference,
      status: row.status,
      currency: row.currency,
      totalItems: row.totalItems,
      rawSubtotal: Number(row.rawSubtotal),
      discountedSubtotal: Number(row.discountedSubtotal),
      baseShippingFee: Number(row.baseShippingFee),
      finalShippingFee: Number(row.finalShippingFee),
      totalPaid: Number(row.totalPaid),
      shippingMode: row.shippingMode,
      categoryShippingMode: row.categoryShippingMode,
      freeShippingApplied: row.freeShippingApplied,
      freeShippingRuleId: row.freeShippingRuleId,
      freeShippingRuleType: row.freeShippingRuleType,
      freeShippingCouponCode: row.freeShippingCouponCode,
      paidAt: row.paidAt,
      billingAddress: row.billingAddressSnapshot,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }
}

