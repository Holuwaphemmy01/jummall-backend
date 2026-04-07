import type { Pool, PoolClient } from "pg";

import databasePool from "../client";
import { deriveOrderStatus } from "../../../application/order/order-delivery-status";
import type {
  CreateOrderInput,
  FindOrdersPageByBuyerIdInput,
  FindOrdersPageBySellerIdInput,
  FindOrdersPageInput,
  OrderDetailRecord,
  OrderHistoryPage,
  OrderHistoryRecord,
  OrderItemDeliveryContextRecord,
  OrderItemDeliveryStatus,
  OrderItemImageRecord,
  OrderItemRecord,
  OrderRecord,
  OrderRepository,
  OrderShippingSegmentRecord,
  SellerOrderDetailRecord,
  SellerOrderHistoryPage
} from "../../../ports/order-repository";
import type {
  CategoryShippingMode,
  ShippingMode
} from "../../../ports/shipping/shipping-settings-repository";
import type { FreeShippingRuleType } from "../../../ports/shipping/shipping-models";

type Executor = Pool | PoolClient;

interface OrderRow {
  id: string;
  checkoutSessionId: string;
  buyerId: string;
  paymentProvider: string;
  paymentReference: string;
  status: OrderRecord["status"];
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
  deliveryStatus: OrderItemDeliveryStatus;
  deliveryStatusUpdatedAt: Date | null;
  deliveryStatusUpdatedByUserId: string | null;
  deliveryStatusUpdatedByRole: "admin" | "seller" | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  deliveryFailedAt: Date | null;
  deliveryFailureReason: string | null;
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

interface OrderItemDeliveryContextRow {
  id: string;
  orderId: string;
  sellerId: string;
  shippingMode: ShippingMode;
  deliveryStatus: OrderItemDeliveryStatus;
}

export class PostgresOrderRepository implements OrderRepository {
  constructor(private readonly executor: Executor = databasePool) {}

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
            "deliveryStatus",
            "deliveryStatusUpdatedAt",
            "deliveryStatusUpdatedByUserId",
            "deliveryStatusUpdatedByRole",
            "shippedAt",
            "deliveredAt",
            "deliveryFailedAt",
            "deliveryFailureReason",
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

  async findDetailByIdAndSellerId(
    orderId: string,
    sellerId: string
  ): Promise<SellerOrderDetailRecord | null> {
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
          AND EXISTS (
            SELECT 1
            FROM "OrderItem"
            WHERE "orderId" = "Order"."id"
              AND "sellerId" = $2
          )
        LIMIT 1
      `,
      [orderId, sellerId]
    );

    const row = result.rows[0];

    if (!row) {
      return null;
    }

    const items = await this.findItemsByOrderId(row.id, sellerId);

    return this.mapSellerOrderDetail(row, items);
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

    return this.buildOrderHistoryPage(result.rows, total, input.page, input.limit);
  }

  async findPageBySellerId(
    input: FindOrdersPageBySellerIdInput
  ): Promise<SellerOrderHistoryPage> {
    const totalResult = await this.executor.query<{ count: string }>(
      `
        SELECT COUNT(DISTINCT "orderId")::text AS "count"
        FROM "OrderItem"
        WHERE "sellerId" = $1
      `,
      [input.sellerId]
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
        WHERE EXISTS (
          SELECT 1
          FROM "OrderItem"
          WHERE "orderId" = "Order"."id"
            AND "sellerId" = $1
        )
        ORDER BY "createdAt" DESC
        LIMIT $2 OFFSET $3
      `,
      [input.sellerId, input.limit, offset]
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
    const sellerItemsByOrderId = await this.findItemsByOrderIds(orderIds, input.sellerId);
    const previewByOrderId = await this.findItemsPreviewByOrderIds(
      orderIds,
      input.sellerId
    );

    return {
      items: result.rows.map((row) =>
        this.mapSellerOrderHistory(
          row,
          sellerItemsByOrderId.get(row.id) ?? [],
          previewByOrderId.get(row.id) ?? []
        )
      ),
      total,
      page: input.page,
      limit: input.limit
    };
  }

  async findPage(input: FindOrdersPageInput): Promise<OrderHistoryPage> {
    const totalResult = await this.executor.query<{ count: string }>(
      `
        SELECT COUNT(*)::text AS "count"
        FROM "Order"
      `
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
        ORDER BY "createdAt" DESC
        LIMIT $1 OFFSET $2
      `,
      [input.limit, offset]
    );

    return this.buildOrderHistoryPage(result.rows, total, input.page, input.limit);
  }

  async findItemDeliveryContextById(
    orderItemId: string
  ): Promise<OrderItemDeliveryContextRecord | null> {
    const result = await this.executor.query<OrderItemDeliveryContextRow>(
      `
        SELECT
          "OrderItem"."id",
          "OrderItem"."orderId",
          "OrderItem"."sellerId",
          "Order"."shippingMode",
          "OrderItem"."deliveryStatus"
        FROM "OrderItem"
        INNER JOIN "Order"
          ON "Order"."id" = "OrderItem"."orderId"
        WHERE "OrderItem"."id" = $1
        LIMIT 1
      `,
      [orderItemId]
    );

    const row = result.rows[0];

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      orderId: row.orderId,
      sellerId: row.sellerId,
      shippingMode: row.shippingMode,
      deliveryStatus: row.deliveryStatus
    };
  }

  async updateItemDeliveryStatus(input: {
    orderItemId: string;
    deliveryStatus: OrderItemDeliveryStatus;
    deliveryFailureReason: string | null;
    updatedByUserId: string;
    updatedByRole: "admin" | "seller";
    updatedAt: Date;
  }): Promise<void> {
    await this.withTransaction(async (executor) => {
      const contextResult = await executor.query<OrderItemDeliveryContextRow>(
        `
          SELECT
            "OrderItem"."id",
            "OrderItem"."orderId",
            "OrderItem"."sellerId",
            "Order"."shippingMode",
            "OrderItem"."deliveryStatus"
          FROM "OrderItem"
          INNER JOIN "Order"
            ON "Order"."id" = "OrderItem"."orderId"
          WHERE "OrderItem"."id" = $1
          FOR UPDATE
        `,
        [input.orderItemId]
      );

      const context = contextResult.rows[0];

      if (!context) {
        return;
      }

      await executor.query(
        `
          UPDATE "OrderItem"
          SET
            "deliveryStatus" = $2,
            "deliveryStatusUpdatedAt" = $3,
            "deliveryStatusUpdatedByUserId" = $4,
            "deliveryStatusUpdatedByRole" = $5,
            "shippedAt" = CASE
              WHEN $2 = 'shipped' THEN $3
              ELSE "shippedAt"
            END,
            "deliveredAt" = CASE
              WHEN $2 = 'delivered' THEN $3
              ELSE "deliveredAt"
            END,
            "deliveryFailedAt" = CASE
              WHEN $2 = 'delivery_failed' THEN $3
              WHEN $2 IN ('shipped', 'delivered') THEN NULL
              ELSE "deliveryFailedAt"
            END,
            "deliveryFailureReason" = CASE
              WHEN $2 = 'delivery_failed' THEN $6
              WHEN $2 IN ('shipped', 'delivered') THEN NULL
              ELSE "deliveryFailureReason"
            END,
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = $1
        `,
        [
          input.orderItemId,
          input.deliveryStatus,
          input.updatedAt,
          input.updatedByUserId,
          input.updatedByRole,
          input.deliveryFailureReason
        ]
      );

      const statuses = await this.findOrderItemDeliveryStatusesByOrderId(
        context.orderId,
        executor
      );

      await executor.query(
        `
          UPDATE "Order"
          SET
            "status" = $2,
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = $1
        `,
        [context.orderId, deriveOrderStatus(statuses)]
      );
    });
  }

  private async buildOrderHistoryPage(
    rows: OrderRow[],
    total: number,
    page: number,
    limit: number
  ): Promise<OrderHistoryPage> {
    if (rows.length === 0) {
      return {
        items: [],
        total,
        page,
        limit
      };
    }

    const orderIds = rows.map((row) => row.id);
    const itemsPreviewByOrderId = await this.findItemsPreviewByOrderIds(orderIds);

    return {
      items: rows.map((row) => ({
        id: row.id,
        buyerId: row.buyerId,
        status: row.status,
        shippingMode: row.shippingMode,
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
      page,
      limit
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

  private async findItemsByOrderId(
    orderId: string,
    sellerId?: string
  ): Promise<OrderItemRecord[]> {
    const values: Array<string> = [orderId];
    let sellerFilter = "";

    if (sellerId) {
      values.push(sellerId);
      sellerFilter = ` AND "sellerId" = $2`;
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
          "deliveryStatus",
          "deliveryStatusUpdatedAt",
          "deliveryStatusUpdatedByUserId",
          "deliveryStatusUpdatedByRole",
          "shippedAt",
          "deliveredAt",
          "deliveryFailedAt",
          "deliveryFailureReason",
          "createdAt",
          "updatedAt"
        FROM "OrderItem"
        WHERE "orderId" = $1${sellerFilter}
        ORDER BY "createdAt" ASC
      `,
      values
    );

    const imagesByOrderItemId = await this.findImagesByOrderItemIds(
      result.rows.map((row) => row.id)
    );

    return result.rows.map((row) =>
      this.mapOrderItemRow(row, imagesByOrderItemId.get(row.id) ?? [])
    );
  }

  private async findItemsByOrderIds(
    orderIds: string[],
    sellerId: string
  ): Promise<Map<string, OrderItemRecord[]>> {
    const itemsByOrderId = new Map<string, OrderItemRecord[]>();

    if (orderIds.length === 0) {
      return itemsByOrderId;
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
          "deliveryStatus",
          "deliveryStatusUpdatedAt",
          "deliveryStatusUpdatedByUserId",
          "deliveryStatusUpdatedByRole",
          "shippedAt",
          "deliveredAt",
          "deliveryFailedAt",
          "deliveryFailureReason",
          "createdAt",
          "updatedAt"
        FROM "OrderItem"
        WHERE "orderId" = ANY($1::text[])
          AND "sellerId" = $2
        ORDER BY "orderId" ASC, "createdAt" ASC
      `,
      [orderIds, sellerId]
    );

    for (const row of result.rows) {
      const existing = itemsByOrderId.get(row.orderId) ?? [];
      existing.push(this.mapOrderItemRow(row, []));
      itemsByOrderId.set(row.orderId, existing);
    }

    return itemsByOrderId;
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
    orderIds: string[],
    sellerId?: string
  ): Promise<Map<string, OrderHistoryRecord["itemsPreview"]>> {
    const itemsPreviewByOrderId = new Map<string, OrderHistoryRecord["itemsPreview"]>();

    if (orderIds.length === 0) {
      return itemsPreviewByOrderId;
    }

    const values: Array<string[] | string> = [orderIds];
    let sellerFilter = "";

    if (sellerId) {
      values.push(sellerId);
      sellerFilter = ` AND "sellerId" = $2`;
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
          "deliveryStatus",
          "deliveryStatusUpdatedAt",
          "deliveryStatusUpdatedByUserId",
          "deliveryStatusUpdatedByRole",
          "shippedAt",
          "deliveredAt",
          "deliveryFailedAt",
          "deliveryFailureReason",
          "createdAt",
          "updatedAt"
        FROM "OrderItem"
        WHERE "orderId" = ANY($1::text[])${sellerFilter}
        ORDER BY "orderId" ASC, "createdAt" ASC
      `,
      values
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
        deliveryStatus: row.deliveryStatus,
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

  private async findOrderItemDeliveryStatusesByOrderId(
    orderId: string,
    executor: Executor = this.executor
  ): Promise<OrderItemDeliveryStatus[]> {
    const result = await executor.query<{ deliveryStatus: OrderItemDeliveryStatus }>(
      `
        SELECT "deliveryStatus"
        FROM "OrderItem"
        WHERE "orderId" = $1
      `,
      [orderId]
    );

    return result.rows.map((row) => row.deliveryStatus);
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

  private mapOrderItemRow(
    row: OrderItemRow,
    images: OrderItemImageRecord[]
  ): OrderItemRecord {
    return {
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
      deliveryStatus: row.deliveryStatus,
      deliveryStatusUpdatedAt: row.deliveryStatusUpdatedAt,
      deliveryStatusUpdatedByUserId: row.deliveryStatusUpdatedByUserId,
      deliveryStatusUpdatedByRole: row.deliveryStatusUpdatedByRole,
      shippedAt: row.shippedAt,
      deliveredAt: row.deliveredAt,
      deliveryFailedAt: row.deliveryFailedAt,
      deliveryFailureReason: row.deliveryFailureReason,
      images,
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

  private mapSellerOrderHistory(
    row: OrderRow,
    items: OrderItemRecord[],
    itemsPreview: OrderHistoryRecord["itemsPreview"]
  ) {
    return {
      id: row.id,
      status: deriveOrderStatus(items.map((item) => item.deliveryStatus)),
      shippingMode: row.shippingMode,
      currency: row.currency,
      totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: items.reduce((sum, item) => sum + item.lineSubtotal, 0),
      canUpdateDeliveryStatus: row.shippingMode === "VENDOR",
      paidAt: row.paidAt,
      createdAt: row.createdAt,
      itemsPreview
    };
  }

  private mapSellerOrderDetail(
    row: OrderRow,
    items: OrderItemRecord[]
  ): SellerOrderDetailRecord {
    return {
      id: row.id,
      status: deriveOrderStatus(items.map((item) => item.deliveryStatus)),
      shippingMode: row.shippingMode,
      currency: row.currency,
      totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: items.reduce((sum, item) => sum + item.lineSubtotal, 0),
      canUpdateDeliveryStatus: row.shippingMode === "VENDOR",
      paidAt: row.paidAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      billingAddress: row.billingAddressSnapshot,
      items
    };
  }

  private async withTransaction<T>(
    operation: (executor: PoolClient) => Promise<T>
  ): Promise<T> {
    if (this.isPool(this.executor)) {
      const client = await this.executor.connect();

      try {
        await client.query("BEGIN");
        const result = await operation(client);
        await client.query("COMMIT");
        return result;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }

    return operation(this.executor);
  }

  private isPool(executor: Executor): executor is Pool {
    return "connect" in executor;
  }
}
