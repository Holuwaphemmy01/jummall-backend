import type {
  OrderDetailRecord,
  OrderHistoryRecord,
  OrderItemRecord,
  SellerOrderDetailRecord,
  SellerOrderHistoryRecord
} from "../../../ports/order-repository";
import {
  toPrimaryProductImageResponse,
  toProductImageResponse
} from "./product-image-response";

function toOrderItemResponse(
  item: OrderItemRecord,
  options: { canUpdateDeliveryStatus?: boolean } = {}
) {
  return {
    id: item.id,
    product_id: item.productId,
    seller_id: item.sellerId,
    category_id: item.categoryId,
    category_name: item.categoryName,
    brand_id: item.brandId,
    brand_name: item.brandName,
    product_name: item.productName,
    product_description: item.productDescription,
    sku: item.sku,
    unit_price: item.unitPrice,
    quantity: item.quantity,
    line_subtotal: item.lineSubtotal,
    currency: item.currency,
    condition: item.condition,
    weight_kg: item.weightKg,
    delivery_status: item.deliveryStatus,
    delivery_status_updated_at: item.deliveryStatusUpdatedAt?.toISOString() ?? null,
    shipped_at: item.shippedAt?.toISOString() ?? null,
    delivered_at: item.deliveredAt?.toISOString() ?? null,
    delivery_failed_at: item.deliveryFailedAt?.toISOString() ?? null,
    delivery_failure_reason: item.deliveryFailureReason,
    ...(options.canUpdateDeliveryStatus !== undefined
      ? {
          can_update_delivery_status: options.canUpdateDeliveryStatus
        }
      : {}),
    images: item.images.map((image) => toProductImageResponse(image))
  };
}

function toOrderHistoryPreviewResponse(item: OrderHistoryRecord["itemsPreview"][number]) {
  const primaryImage = toPrimaryProductImageResponse(item.images);

  return {
    order_item_id: item.orderItemId,
    product_id: item.productId,
    product_name: item.productName,
    quantity: item.quantity,
    delivery_status: item.deliveryStatus,
    primary_image: primaryImage.primaryImage,
    primary_image_public_url: primaryImage.primaryImagePublicUrl
  };
}

export function toBuyerOrderHistoryResponse(order: OrderHistoryRecord) {
  return {
    id: order.id,
    status: order.status,
    currency: order.currency,
    total_items: order.totalItems,
    raw_subtotal: order.rawSubtotal,
    discounted_subtotal: order.discountedSubtotal,
    final_shipping_fee: order.finalShippingFee,
    total_paid: order.totalPaid,
    free_shipping_applied: order.freeShippingApplied,
    paid_at: order.paidAt?.toISOString() ?? null,
    created_at: order.createdAt.toISOString(),
    items_preview: order.itemsPreview.map((item) => toOrderHistoryPreviewResponse(item))
  };
}

export function toBuyerOrderDetailResponse(order: OrderDetailRecord) {
  return {
    id: order.id,
    status: order.status,
    payment_provider: order.paymentProvider,
    currency: order.currency,
    total_items: order.totalItems,
    raw_subtotal: order.rawSubtotal,
    discounted_subtotal: order.discountedSubtotal,
    base_shipping_fee: order.baseShippingFee,
    final_shipping_fee: order.finalShippingFee,
    total_paid: order.totalPaid,
    shipping_mode: order.shippingMode,
    category_shipping_mode: order.categoryShippingMode,
    free_shipping: {
      applied: order.freeShippingApplied,
      rule_id: order.freeShippingRuleId,
      rule_type: order.freeShippingRuleType,
      coupon_code: order.freeShippingCouponCode
    },
    paid_at: order.paidAt?.toISOString() ?? null,
    created_at: order.createdAt.toISOString(),
    updated_at: order.updatedAt.toISOString(),
    billing_address: {
      full_name: order.billingAddress.fullName,
      phone_number: order.billingAddress.phoneNumber,
      address_line_1: order.billingAddress.addressLine1,
      address_line_2: order.billingAddress.addressLine2,
      city: order.billingAddress.city,
      state: order.billingAddress.state,
      country: order.billingAddress.country,
      postal_code: order.billingAddress.postalCode
    },
    items: order.items.map((item) => toOrderItemResponse(item)),
    shipping_segments: order.shippingSegments.map((segment) => ({
      id: segment.id,
      seller_id: segment.sellerId,
      rule_owner_type: segment.ruleOwnerType,
      final_shipping_owner_type: segment.finalShippingOwnerType,
      used_fallback: segment.usedFallback,
      matched_zone: {
        id: segment.matchedZoneId,
        name: segment.matchedZoneName,
        match_type: segment.matchedZoneMatchType
      },
      zone_fee: segment.zoneFee,
      category_fee: segment.categoryFee,
      base_shipping_fee: segment.baseShippingFee,
      final_shipping_fee: segment.finalShippingFee
    }))
  };
}

export function toSellerOrderHistoryResponse(order: SellerOrderHistoryRecord) {
  return {
    id: order.id,
    status: order.status,
    shipping_mode: order.shippingMode,
    currency: order.currency,
    total_items: order.totalItems,
    subtotal: order.subtotal,
    can_update_delivery_status: order.canUpdateDeliveryStatus,
    paid_at: order.paidAt?.toISOString() ?? null,
    created_at: order.createdAt.toISOString(),
    items_preview: order.itemsPreview.map((item) => toOrderHistoryPreviewResponse(item))
  };
}

export function toSellerOrderDetailResponse(order: SellerOrderDetailRecord) {
  return {
    id: order.id,
    status: order.status,
    shipping_mode: order.shippingMode,
    currency: order.currency,
    total_items: order.totalItems,
    subtotal: order.subtotal,
    can_update_delivery_status: order.canUpdateDeliveryStatus,
    paid_at: order.paidAt?.toISOString() ?? null,
    created_at: order.createdAt.toISOString(),
    updated_at: order.updatedAt.toISOString(),
    billing_address: {
      full_name: order.billingAddress.fullName,
      phone_number: order.billingAddress.phoneNumber,
      address_line_1: order.billingAddress.addressLine1,
      address_line_2: order.billingAddress.addressLine2,
      city: order.billingAddress.city,
      state: order.billingAddress.state,
      country: order.billingAddress.country,
      postal_code: order.billingAddress.postalCode
    },
    items: order.items.map((item) =>
      toOrderItemResponse(item, {
        canUpdateDeliveryStatus: order.canUpdateDeliveryStatus
      })
    )
  };
}

export function toAdminOrderHistoryResponse(order: OrderHistoryRecord) {
  return {
    id: order.id,
    buyer_id: order.buyerId,
    status: order.status,
    shipping_mode: order.shippingMode,
    currency: order.currency,
    total_items: order.totalItems,
    raw_subtotal: order.rawSubtotal,
    discounted_subtotal: order.discountedSubtotal,
    final_shipping_fee: order.finalShippingFee,
    total_paid: order.totalPaid,
    free_shipping_applied: order.freeShippingApplied,
    paid_at: order.paidAt?.toISOString() ?? null,
    created_at: order.createdAt.toISOString(),
    items_preview: order.itemsPreview.map((item) => toOrderHistoryPreviewResponse(item))
  };
}

export function toAdminOrderDetailResponse(order: OrderDetailRecord) {
  return {
    buyer_id: order.buyerId,
    ...toBuyerOrderDetailResponse(order)
  };
}
