import type {
  CategoryShippingMode,
  ShippingMode
} from "../../ports/shipping/shipping-settings-repository";
import type { FreeShippingRuleType } from "../../ports/shipping/shipping-models";

export interface CheckoutImageSummary {
  id: string;
  storagePath: string;
  mimeType: string;
  originalFileName: string;
  position: number;
}

export interface CheckoutItemSummary {
  cartItemId: string;
  productId: string;
  sellerId: string;
  categoryId: string;
  categoryName: string | null;
  brandId: string | null;
  brandName: string | null;
  name: string;
  description: string;
  sku: string | null;
  unitPrice: number;
  quantity: number;
  lineSubtotal: number;
  currency: string;
  condition: string;
  weightKg: number;
  images: CheckoutImageSummary[];
}

export interface CheckoutBillingAddressSummary {
  id: string;
  fullName: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  country: string;
  postalCode: string | null;
}

export interface CheckoutShippingBreakdownSummary {
  sellerId: string | null;
  ruleOwnerType: "platform" | "vendor";
  finalShippingOwnerType: "platform" | "vendor";
  usedFallback: boolean;
  matchedZone: {
    id: string;
    name: string;
    matchType: "state" | "city";
  };
  zoneFee: number;
  categoryFee: number;
  baseShippingFee: number;
  finalShippingFee: number;
}

export interface CheckoutOrderSummary {
  cartId: string;
  billingAddress: CheckoutBillingAddressSummary;
  items: CheckoutItemSummary[];
  currency: string;
  totalItems: number;
  rawSubtotal: number;
  discountedSubtotal: number;
  shippingMode: ShippingMode;
  categoryShippingMode: CategoryShippingMode;
  baseShippingFee: number;
  finalShippingFee: number;
  totalPayable: number;
  freeShipping: {
    applied: boolean;
    ruleId: string | null;
    ruleType: FreeShippingRuleType | null;
    couponCode: string | null;
  };
  shippingBreakdown: CheckoutShippingBreakdownSummary[];
}
