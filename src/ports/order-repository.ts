import type {
  CategoryShippingMode,
  ShippingMode
} from "./shipping/shipping-settings-repository";
import type {
  FreeShippingRuleType,
  ShippingOwnerType
} from "./shipping/shipping-models";

export type OrderStatus = "pending_fulfillment";

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

export interface OrderRepository {
  create(input: CreateOrderInput): Promise<OrderDetailRecord>;
  findById(orderId: string): Promise<OrderDetailRecord | null>;
}

