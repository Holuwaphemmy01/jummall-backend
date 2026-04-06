import type { Pool } from "pg";

import databasePool from "../client";
import type {
  CreateOrderInput,
  FindOrdersPageByBuyerIdInput,
  OrderDetailRecord,
  OrderHistoryPage,
  OrderHistoryRecord,
  OrderItemImageRecord,
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

interface OrderItemImageRow {
  id: string;
  orderItemId: string;
  storagePath: string;
  mimeType: string;
  originalFileName: string;
  position: number;
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
      const orderItemResult = await this.executor.query<OrderItemRow>(
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
          RETURNING
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

      const orderItem = orderItemResult.rows[0];

      for (const image of item.images) {
        await this.executor.query(
          `
            INSERT INTO "OrderItemImage" (
              "orderItemId",
              "storagePath",
              "mimeType",
              "originalFileName",
              "position"
            )
            VALUES ($1, $2, $3, $4, $5)
          `,
          [
            orderItem.id,
            image.storagePath,
            image.mimeType,
            image.originalFileName,
            image.position
          ]
        );
      }
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
    return this.findDetail({ orderId });
  }

  async findDetailByIdAndBuyerId(
    orderId: string,
    buyerId: string
  ): Promise<OrderDetailRecord | null> {
    return this.findDetail({ orderId, buyerId });
  }

  async findPageByBuyerId(
    input: FindOrdersPageByBuyerIdInput
  ): Promise<OrderHistoryPage> {
    const totalResult = await this.executor.query<{ count: string }>(
      `
        SELECT COUNT(*)::text AS "count"
        FROM "Order"
        WHERE "buyerId" = $1
      `,
      [input.buyerId]
    );
    const total = Number(totalResult.rows[0]?.count ?? 0);
    const offset = (input.page - 1) * input.limit;

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
        WHERE "buyerId" = $1
        ORDER BY "createdAt" DESC
        LIMIT $2 OFFSET $3
      `,
      [input.buyerId, input.limit, offset]
    );

    if (result.rows.length === 0) {
      return {
        items: [],
        total,
        page: input.page,
        limit: input.limit
      };
    }

    const orderIds = result.rows.map((row) => row.id);
    const itemsPreviewByOrderId = await this.findItemsPreviewByOrderIds(orderIds);

    return {
      items: result.rows.map((row) => ({
        id: row.id,
        status: row.status,
        currency: row.currency,
        totalItems: row.totalItems,
        rawSubtotal: Number(row.rawSubtotal),
        discountedSubtotal: Number(row.discountedSubtotal),
        finalShippingFee: Number(row.finalShippingFee),
        totalPaid: Number(row.totalPaid),
        freeShippingApplied: row.freeShippingApplied,
        paidAt: row.paidAt,
        createdAt: row.createdAt,
        itemsPreview: itemsPreviewByOrderId.get(row.id) ?? []
      })),
      total,
      page: input.page,
      limit: input.limit
    };
  }

  private async findDetail(input: {
    orderId: string;
    buyerId?: string;
  }): Promise<OrderDetailRecord | null> {
    const values = [input.orderId];
    let buyerIdFilter = "";

    if (input.buyerId) {
      values.push(input.buyerId);
      buyerIdFilter = ` AND "buyerId" = $2`;
    }

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
        WHERE "id" = $1${buyerIdFilter}
        LIMIT 1
      `,
      values
    );

    const row = result.rows[0];

    if (!row) {
      return null;
    }

    const items = await this.findItemsByOrderId(row.id);
    const shippingSegments = await this.findShippingSegmentsByOrderId(row.id);

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

    const imagesByOrderItemId = await this.findImagesByOrderItemIds(
      result.rows.map((row) => row.id)
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
      images: imagesByOrderItemId.get(row.id) ?? [],
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    }));
  }

  private async findImagesByOrderItemIds(
    orderItemIds: string[]
  ): Promise<Map<string, OrderItemImageRecord[]>> {
    const imagesByOrderItemId = new Map<string, OrderItemImageRecord[]>();

    if (orderItemIds.length === 0) {
      return imagesByOrderItemId;
    }

    const result = await this.executor.query<OrderItemImageRow>(
      `
        SELECT
          "id",
          "orderItemId",
          "storagePath",
          "mimeType",
          "originalFileName",
          "position",
          "createdAt",
          "updatedAt"
        FROM "OrderItemImage"
        WHERE "orderItemId" = ANY($1::text[])
        ORDER BY "orderItemId" ASC, "position" ASC, "createdAt" ASC
      `,
      [orderItemIds]
    );

    for (const row of result.rows) {
      const existing = imagesByOrderItemId.get(row.orderItemId) ?? [];
      existing.push(this.mapOrderItemImageRow(row));
      imagesByOrderItemId.set(row.orderItemId, existing);
    }

    return imagesByOrderItemId;
  }

  private async findItemsPreviewByOrderIds(
    orderIds: string[]
  ): Promise<Map<string, OrderHistoryRecord["itemsPreview"]>> {
    const itemsPreviewByOrderId = new Map<string, OrderHistoryRecord["itemsPreview"]>();

    if (orderIds.length === 0) {
      return itemsPreviewByOrderId;
    }

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
        WHERE "orderId" = ANY($1::text[])
        ORDER BY "orderId" ASC, "createdAt" ASC
      `,
      [orderIds]
    );

    const limitedRows: OrderItemRow[] = [];
    const countsByOrderId = new Map<string, number>();

    for (const row of result.rows) {
      const currentCount = countsByOrderId.get(row.orderId) ?? 0;

      if (currentCount >= 3) {
        continue;
      }

      countsByOrderId.set(row.orderId, currentCount + 1);
      limitedRows.push(row);
    }

    const imagesByOrderItemId = await this.findImagesByOrderItemIds(
      limitedRows.map((row) => row.id)
    );

    for (const row of limitedRows) {
      const existing = itemsPreviewByOrderId.get(row.orderId) ?? [];
      existing.push({
        orderItemId: row.id,
        productId: row.productId,
        productName: row.productName,
        quantity: row.quantity,
        images: imagesByOrderItemId.get(row.id) ?? []
      });
      itemsPreviewByOrderId.set(row.orderId, existing);
    }

    return itemsPreviewByOrderId;
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

  private mapOrderItemImageRow(row: OrderItemImageRow): OrderItemImageRecord {
    return {
      id: row.id,
      orderItemId: row.orderItemId,
      storagePath: row.storagePath,
      mimeType: row.mimeType,
      originalFileName: row.originalFileName,
      position: row.position,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }
}
