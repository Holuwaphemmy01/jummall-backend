import type {
  AuthenticationRepository,
  AuthUser
} from "../../ports/authentication-repository";
import type {
  BillingAddressRecord,
  BillingAddressRepository
} from "../../ports/billing-address-repository";
import type { CartRepository } from "../../ports/cart-repository";
import type { ProductRepository } from "../../ports/product-repository";
import type { CalculateCartShippingUseCase } from "../shipping/calculate-cart-shipping";
import type {
  CheckoutBillingAddressSummary,
  CheckoutItemSummary,
  CheckoutOrderSummary
} from "./checkout-types";

export interface PrepareCheckoutDataInput {
  buyerId: string;
  billingAddressId: string;
  freeShippingCouponCode?: string;
}

interface PrepareCheckoutDataResult {
  buyer: AuthUser;
  summary: CheckoutOrderSummary;
}

export class PrepareCheckoutDataError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "PrepareCheckoutDataError";
  }
}

export class PrepareCheckoutData {
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly billingAddressRepository: BillingAddressRepository,
    private readonly cartRepository: CartRepository,
    private readonly productRepository: ProductRepository,
    private readonly calculateCartShipping: CalculateCartShippingUseCase
  ) {}

  async execute(
    input: PrepareCheckoutDataInput
  ): Promise<PrepareCheckoutDataResult> {
    const buyer = await this.authenticationRepository.findById(input.buyerId);

    if (!buyer) {
      throw new PrepareCheckoutDataError(
        "Buyer account not found.",
        404,
        "buyer_id"
      );
    }

    if (buyer.role !== "buyer") {
      throw new PrepareCheckoutDataError(
        "Only buyers can perform checkout.",
        403,
        "buyer_id"
      );
    }

    const billingAddress =
      await this.billingAddressRepository.findByIdAndBuyerId(
        input.billingAddressId,
        input.buyerId
      );

    if (!billingAddress) {
      throw new PrepareCheckoutDataError(
        "Billing address not found.",
        404,
        "billing_address_id"
      );
    }

    const cart = await this.cartRepository.findActiveByBuyerId(input.buyerId);

    if (!cart) {
      throw new PrepareCheckoutDataError(
        "Active cart not found.",
        404,
        "buyer_id"
      );
    }

    const cartItems = await this.cartRepository.findItemsByCartId(cart.id);

    if (cartItems.length === 0) {
      throw new PrepareCheckoutDataError(
        "Active cart is empty.",
        409,
        "buyer_id"
      );
    }

    const items: CheckoutItemSummary[] = [];
    let currency: string | null = null;

    for (const cartItem of cartItems) {
      const product = await this.productRepository.findById(cartItem.productId);

      if (!product) {
        throw new PrepareCheckoutDataError(
          "Cart contains a product that no longer exists.",
          404,
          "product_id"
        );
      }

      if (product.status !== "approved") {
        throw new PrepareCheckoutDataError(
          "Cart contains a product that is no longer available for checkout.",
          409,
          "product_id"
        );
      }

      if (product.quantity <= 0) {
        throw new PrepareCheckoutDataError(
          "Cart contains an out-of-stock product.",
          409,
          "product_id"
        );
      }

      if (cartItem.quantity > product.quantity) {
        throw new PrepareCheckoutDataError(
          "Requested quantity exceeds available stock.",
          409,
          "quantity"
        );
      }

      if (currency && currency !== product.currency) {
        throw new PrepareCheckoutDataError(
          "All cart items must use the same currency.",
          409,
          "currency"
        );
      }

      currency = currency ?? product.currency;

      items.push({
        cartItemId: cartItem.id,
        productId: product.id,
        sellerId: product.sellerId,
        categoryId: product.categoryId,
        categoryName: product.categoryName ?? null,
        brandId: product.brandId,
        brandName: product.brandName,
        name: product.name,
        description: product.description,
        sku: product.sku,
        unitPrice: product.price,
        quantity: cartItem.quantity,
        lineSubtotal: product.price * cartItem.quantity,
        currency: product.currency,
        condition: product.condition,
        weightKg: product.weightKg,
        images: product.images.map((image) => ({
          id: image.id,
          storagePath: image.storagePath,
          mimeType: image.mimeType,
          originalFileName: image.originalFileName,
          position: image.position
        }))
      });
    }

    const shipping = await this.calculateCartShipping.execute({
      buyerId: input.buyerId,
      billingAddressId: input.billingAddressId,
      freeShippingCouponCode: input.freeShippingCouponCode
    });

    return {
      buyer,
      summary: {
        cartId: shipping.cartId,
        billingAddress: this.mapBillingAddress(billingAddress),
        items,
        currency: shipping.currency,
        totalItems: shipping.totalItems,
        rawSubtotal: shipping.rawSubtotal,
        discountedSubtotal: shipping.discountedSubtotal,
        shippingMode: shipping.shippingMode,
        categoryShippingMode: shipping.categoryShippingMode,
        baseShippingFee: shipping.baseShippingFee,
        finalShippingFee: shipping.finalShippingFee,
        totalPayable: shipping.discountedSubtotal + shipping.finalShippingFee,
        freeShipping: {
          applied: shipping.freeShipping.applied,
          ruleId: shipping.freeShipping.ruleId,
          ruleType: shipping.freeShipping.ruleType,
          couponCode: shipping.freeShipping.couponCode
        },
        shippingBreakdown: shipping.breakdown.map((segment) => ({
          sellerId: segment.sellerId,
          ruleOwnerType: segment.ruleOwnerType,
          finalShippingOwnerType: segment.finalShippingOwnerType,
          usedFallback: segment.usedFallback,
          matchedZone: {
            id: segment.matchedZone.id,
            name: segment.matchedZone.name,
            matchType: segment.matchedZone.matchType
          },
          zoneFee: segment.zoneFee,
          categoryFee: segment.categoryFee,
          baseShippingFee: segment.baseShippingFee,
          finalShippingFee: segment.finalShippingFee
        }))
      }
    };
  }

  private mapBillingAddress(
    billingAddress: BillingAddressRecord
  ): CheckoutBillingAddressSummary {
    return {
      id: billingAddress.id,
      fullName: billingAddress.fullName,
      phoneNumber: billingAddress.phoneNumber,
      addressLine1: billingAddress.addressLine1,
      addressLine2: billingAddress.addressLine2,
      city: billingAddress.city,
      state: billingAddress.state,
      country: billingAddress.country,
      postalCode: billingAddress.postalCode
    };
  }
}
