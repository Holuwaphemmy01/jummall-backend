import type {
  CategoryShippingMode,
  ShippingMode
} from "./shipping/shipping-settings-repository";
import type {
  FreeShippingRuleType,
  ShippingOwnerType
} from "./shipping/shipping-models";

export type CheckoutSessionStatus = "initialized" | "completed" | "failed";
export type CheckoutMatchedZoneType = "state" | "city";

export interface CheckoutSessionBillingAddressSnapshot {
  fullName: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  country: string;
  postalCode: string | null;
}

export interface CheckoutSessionShippingBreakdownItem {
  sellerId: string | null;
  ruleOwnerType: ShippingOwnerType;
  finalShippingOwnerType: ShippingOwnerType;
  usedFallback: boolean;
  matchedZone: {
    id: string;
    name: string;
    matchType: CheckoutMatchedZoneType;
  };
  zoneFee: number;
  categoryFee: number;
  baseShippingFee: number;
  finalShippingFee: number;
}

export interface CheckoutSessionItemRecord {
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
  unitPrice: number;
  quantity: number;
  lineSubtotal: number;
  currency: string;
  condition: string;
  weightKg: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CheckoutSessionRecord {
  id: string;
  reference: string;
  buyerId: string;
  cartId: string;
  orderId: string | null;
  paymentProvider: string;
  authorizationUrl: string | null;
  accessCode: string | null;
  status: CheckoutSessionStatus;
  failureReason: string | null;
  currency: string;
  totalItems: number;
  rawSubtotal: number;
  discountedSubtotal: number;
  baseShippingFee: number;
  finalShippingFee: number;
  totalPayable: number;
  shippingMode: ShippingMode;
  categoryShippingMode: CategoryShippingMode;
  freeShippingApplied: boolean;
  freeShippingRuleId: string | null;
  freeShippingRuleType: FreeShippingRuleType | null;
  freeShippingCouponCode: string | null;
  billingAddress: CheckoutSessionBillingAddressSnapshot;
  shippingBreakdown: CheckoutSessionShippingBreakdownItem[];
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export interface CheckoutSessionDetailRecord extends CheckoutSessionRecord {
  items: CheckoutSessionItemRecord[];
}

export interface CreateCheckoutSessionItemInput {
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
  unitPrice: number;
  quantity: number;
  lineSubtotal: number;
  currency: string;
  condition: string;
  weightKg: number;
}

export interface CreateCheckoutSessionInput {
  reference: string;
  buyerId: string;
  cartId: string;
  paymentProvider: string;
  currency: string;
  totalItems: number;
  rawSubtotal: number;
  discountedSubtotal: number;
  baseShippingFee: number;
  finalShippingFee: number;
  totalPayable: number;
  shippingMode: ShippingMode;
  categoryShippingMode: CategoryShippingMode;
  freeShippingApplied: boolean;
  freeShippingRuleId: string | null;
  freeShippingRuleType: FreeShippingRuleType | null;
  freeShippingCouponCode: string | null;
  billingAddress: CheckoutSessionBillingAddressSnapshot;
  shippingBreakdown: CheckoutSessionShippingBreakdownItem[];
  items: CreateCheckoutSessionItemInput[];
}

export interface UpdateCheckoutSessionPaymentInitializationInput {
  sessionId: string;
  authorizationUrl: string;
  accessCode: string | null;
}

export interface MarkCheckoutSessionCompletedInput {
  sessionId: string;
  orderId: string;
}

export interface MarkCheckoutSessionFailedInput {
  sessionId: string;
  failureReason: string;
}

export interface CheckoutSessionRepository {
  create(
    input: CreateCheckoutSessionInput
  ): Promise<CheckoutSessionDetailRecord>;
  findInitializedByBuyerId(buyerId: string): Promise<CheckoutSessionRecord | null>;
  findByReference(reference: string): Promise<CheckoutSessionDetailRecord | null>;
  updatePaymentInitialization(
    input: UpdateCheckoutSessionPaymentInitializationInput
  ): Promise<CheckoutSessionRecord | null>;
  markCompleted(
    input: MarkCheckoutSessionCompletedInput
  ): Promise<CheckoutSessionRecord | null>;
  markFailed(
    input: MarkCheckoutSessionFailedInput
  ): Promise<CheckoutSessionRecord | null>;
}

