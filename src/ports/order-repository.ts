import type {
  CategoryShippingMode,
  ShippingMode
} from "./shipping/shipping-settings-repository";
import type {
  FreeShippingRuleType,
  ShippingOwnerType
} from "./shipping/shipping-models";

export type OrderItemDeliveryStatus =
  | "pending_fulfillment"
  | "shipped"
  | "delivered"
  | "delivery_failed";
export type OrderStatusUpdatedByRole = "admin" | "seller";

export type OrderStatus =
  | "pending_fulfillment"
  | "partially_shipped"
  | "shipped"
  | "partially_delivered"
  | "delivered"
  | "delivery_failed";

export interface OrderItemImageRecord {
  id: string;
  orderItemId: string;
  storagePath: string;
  mimeType: string;
  originalFileName: string;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderBillingAddressSnapshot {
  fullName: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  country: string;
  postalCode: string | null;
}

export interface OrderShippingSegmentRecord {
  id: string;
  orderId: string;
  sellerId: string | null;
  ruleOwnerType: ShippingOwnerType;
  finalShippingOwnerType: ShippingOwnerType;
  usedFallback: boolean;
  matchedZoneId: string;
  matchedZoneName: string;
  matchedZoneMatchType: "state" | "city";
  zoneFee: number;
  categoryFee: number;
  baseShippingFee: number;
  finalShippingFee: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItemRecord {
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
  unitPrice: number;
  quantity: number;
  lineSubtotal: number;
  currency: string;
  condition: string;
  weightKg: number;
  deliveryStatus: OrderItemDeliveryStatus;
  deliveryStatusUpdatedAt: Date | null;
  deliveryStatusUpdatedByUserId: string | null;
  deliveryStatusUpdatedByRole: OrderStatusUpdatedByRole | null;
  shippedAt: Date | null;
  deliveredAt: Date | null;
  deliveryFailedAt: Date | null;
  deliveryFailureReason: string | null;
  images: OrderItemImageRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderRecord {
  id: string;
  checkoutSessionId: string;
  buyerId: string;
  paymentProvider: string;
  paymentReference: string;
  status: OrderStatus;
  currency: string;
  totalItems: number;
  rawSubtotal: number;
  discountedSubtotal: number;
  baseShippingFee: number;
  finalShippingFee: number;
  totalPaid: number;
  shippingMode: ShippingMode;
  categoryShippingMode: CategoryShippingMode;
  freeShippingApplied: boolean;
  freeShippingRuleId: string | null;
  freeShippingRuleType: FreeShippingRuleType | null;
  freeShippingCouponCode: string | null;
  paidAt: Date | null;
  billingAddress: OrderBillingAddressSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderDetailRecord extends OrderRecord {
  items: OrderItemRecord[];
  shippingSegments: OrderShippingSegmentRecord[];
}

export interface CreateOrderItemInput {
  productId: string;
  sellerId: string;
  categoryId: string;
  categoryName: string | null;
  brandId: string | null;
  brandName: string | null;
  productName: string;
  productDescription: string;
  sku: string | null;
  unitPrice: number;
  quantity: number;
  lineSubtotal: number;
  currency: string;
  condition: string;
  weightKg: number;
  images: CreateOrderItemImageInput[];
}

export interface CreateOrderItemImageInput {
  storagePath: string;
  mimeType: string;
  originalFileName: string;
  position: number;
}

export interface CreateOrderShippingSegmentInput {
  sellerId: string | null;
  ruleOwnerType: ShippingOwnerType;
  finalShippingOwnerType: ShippingOwnerType;
  usedFallback: boolean;
  matchedZoneId: string;
  matchedZoneName: string;
  matchedZoneMatchType: "state" | "city";
  zoneFee: number;
  categoryFee: number;
  baseShippingFee: number;
  finalShippingFee: number;
}

export interface CreateOrderInput {
  checkoutSessionId: string;
  buyerId: string;
  paymentProvider: string;
  paymentReference: string;
  currency: string;
  totalItems: number;
  rawSubtotal: number;
  discountedSubtotal: number;
  baseShippingFee: number;
  finalShippingFee: number;
  totalPaid: number;
  shippingMode: ShippingMode;
  categoryShippingMode: CategoryShippingMode;
  freeShippingApplied: boolean;
  freeShippingRuleId: string | null;
  freeShippingRuleType: FreeShippingRuleType | null;
  freeShippingCouponCode: string | null;
  paidAt: Date | null;
  billingAddress: OrderBillingAddressSnapshot;
  items: CreateOrderItemInput[];
  shippingSegments: CreateOrderShippingSegmentInput[];
}

export interface OrderHistoryItemPreviewRecord {
  orderItemId: string;
  productId: string;
  productName: string;
  quantity: number;
  deliveryStatus: OrderItemDeliveryStatus;
  images: OrderItemImageRecord[];
}

export interface OrderHistoryRecord {
  id: string;
  buyerId: string;
  status: OrderStatus;
  shippingMode: ShippingMode;
  currency: string;
  totalItems: number;
  rawSubtotal: number;
  discountedSubtotal: number;
  finalShippingFee: number;
  totalPaid: number;
  freeShippingApplied: boolean;
  paidAt: Date | null;
  createdAt: Date;
  itemsPreview: OrderHistoryItemPreviewRecord[];
}

export interface FindOrdersPageByBuyerIdInput {
  buyerId: string;
  page: number;
  limit: number;
}

export interface FindOrdersPageInput {
  page: number;
  limit: number;
}

export interface FindOrdersPageBySellerIdInput {
  sellerId: string;
  page: number;
  limit: number;
}

export interface OrderHistoryPage {
  items: OrderHistoryRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface SellerOrderHistoryRecord {
  id: string;
  status: OrderStatus;
  shippingMode: ShippingMode;
  currency: string;
  totalItems: number;
  subtotal: number;
  canUpdateDeliveryStatus: boolean;
  paidAt: Date | null;
  createdAt: Date;
  itemsPreview: OrderHistoryItemPreviewRecord[];
}

export interface SellerOrderHistoryPage {
  items: SellerOrderHistoryRecord[];
  total: number;
  page: number;
  limit: number;
}

export interface SellerOrderDetailRecord {
  id: string;
  status: OrderStatus;
  shippingMode: ShippingMode;
  currency: string;
  totalItems: number;
  subtotal: number;
  canUpdateDeliveryStatus: boolean;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  billingAddress: OrderBillingAddressSnapshot;
  items: OrderItemRecord[];
}

export interface OrderItemDeliveryContextRecord {
  id: string;
  orderId: string;
  sellerId: string;
  shippingMode: ShippingMode;
  deliveryStatus: OrderItemDeliveryStatus;
}

export interface UpdateOrderItemDeliveryStatusInput {
  orderItemId: string;
  deliveryStatus: OrderItemDeliveryStatus;
  deliveryFailureReason: string | null;
  updatedByUserId: string;
  updatedByRole: OrderStatusUpdatedByRole;
  updatedAt: Date;
}

export interface OrderRepository {
  create(input: CreateOrderInput): Promise<OrderDetailRecord>;
  findById(orderId: string): Promise<OrderDetailRecord | null>;
  findDetailByIdAndBuyerId(
    orderId: string,
    buyerId: string
  ): Promise<OrderDetailRecord | null>;
  findDetailByIdAndSellerId(
    orderId: string,
    sellerId: string
  ): Promise<SellerOrderDetailRecord | null>;
  findPageByBuyerId(input: FindOrdersPageByBuyerIdInput): Promise<OrderHistoryPage>;
  findPageBySellerId(
    input: FindOrdersPageBySellerIdInput
  ): Promise<SellerOrderHistoryPage>;
  findPage(input: FindOrdersPageInput): Promise<OrderHistoryPage>;
  findItemDeliveryContextById(
    orderItemId: string
  ): Promise<OrderItemDeliveryContextRecord | null>;
  updateItemDeliveryStatus(
    input: UpdateOrderItemDeliveryStatusInput
  ): Promise<void>;
}
