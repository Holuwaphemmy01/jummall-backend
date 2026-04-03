import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type { BillingAddressRepository } from "../../ports/billing-address-repository";
import type {
  CartItemRecord,
  CartRecord,
  CartRepository
} from "../../ports/cart-repository";
import type {
  ProductRecord,
  ProductRepository
} from "../../ports/product-repository";
import type { CategoryShippingRuleRepository } from "../../ports/shipping/category-shipping-rule-repository";
import type { FreeShippingRuleRepository } from "../../ports/shipping/free-shipping-rule-repository";
import type {
  CategoryShippingMode,
  ShippingMode,
  ShippingSettingsRecord,
  ShippingSettingsRepository,
  VendorFallbackPolicy
} from "../../ports/shipping/shipping-settings-repository";
import type {
  ShippingOwnerType,
  FreeShippingRuleType,
  ShippingZoneDetailRecord
} from "../../ports/shipping/shipping-models";
import type { ShippingZoneRepository } from "../../ports/shipping/shipping-zone-repository";
import type { ShippingZoneRuleRepository } from "../../ports/shipping/shipping-zone-rule-repository";
import {
  prorateDiscountAcrossLines,
  type DiscountProrationLineInput
} from "./discount-proration-helpers";
import {
  aggregateCategoryFees,
  calculateRuleShippingAmount
} from "./shipping-fee-helpers";
import {
  selectBestZoneMatch,
  type ShippingZoneMatchType
} from "./zone-matching-helpers";

interface ShippingCartLine extends DiscountProrationLineInput {
  sellerId: string;
  categoryId: string;
  productId: string;
  quantity: number;
  currency: string;
}

type DiscountedShippingCartLine = ShippingCartLine & {
  discountedSubtotal: number;
};

interface ShippingSegment {
  sellerId: string | null;
  lines: DiscountedShippingCartLine[];
  rawSubtotal: number;
  discountedSubtotal: number;
}

interface ZoneFeeResolution {
  matchedZone: {
    id: string;
    name: string;
    matchType: ShippingZoneMatchType;
  };
  fee: number;
  ruleOwnerType: ShippingOwnerType;
  usedFallback: boolean;
}

interface CategoryFeeResolution {
  fee: number;
  ruleOwnerType: ShippingOwnerType | null;
  usedFallback: boolean;
}

export interface CalculateCartShippingInput {
  buyerId: string;
  billingAddressId: string;
  discountedSubtotal: number;
  freeShippingCouponCode?: string;
}

export interface CalculateCartShippingBreakdownItem {
  sellerId: string | null;
  ruleOwnerType: ShippingOwnerType;
  finalShippingOwnerType: ShippingOwnerType;
  usedFallback: boolean;
  matchedZone: {
    id: string;
    name: string;
    matchType: ShippingZoneMatchType;
  };
  zoneFee: number;
  categoryFee: number;
  baseShippingFee: number;
  finalShippingFee: number;
}

export interface CalculateCartShippingResult {
  cartId: string;
  currency: string;
  rawSubtotal: number;
  discountedSubtotal: number;
  totalItems: number;
  shippingMode: ShippingMode;
  categoryShippingMode: CategoryShippingMode;
  baseShippingFee: number;
  finalShippingFee: number;
  freeShipping: {
    applied: boolean;
    ruleId: string | null;
    ruleType: FreeShippingRuleType | null;
    couponCode: string | null;
  };
  breakdown: CalculateCartShippingBreakdownItem[];
}

export interface CalculateCartShippingUseCase {
  execute(input: CalculateCartShippingInput): Promise<CalculateCartShippingResult>;
}

export class CalculateCartShippingError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "CalculateCartShippingError";
  }
}

export class CalculateCartShipping implements CalculateCartShippingUseCase {
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly billingAddressRepository: BillingAddressRepository,
    private readonly cartRepository: CartRepository,
    private readonly productRepository: ProductRepository,
    private readonly shippingSettingsRepository: ShippingSettingsRepository,
    private readonly shippingZoneRepository: ShippingZoneRepository,
    private readonly shippingZoneRuleRepository: ShippingZoneRuleRepository,
    private readonly categoryShippingRuleRepository: CategoryShippingRuleRepository,
    private readonly freeShippingRuleRepository: FreeShippingRuleRepository
  ) {}

  async execute(
    input: CalculateCartShippingInput
  ): Promise<CalculateCartShippingResult> {
    const buyer = await this.authenticationRepository.findById(input.buyerId);

    if (!buyer) {
      throw new CalculateCartShippingError(
        "Buyer account not found.",
        404,
        "buyer_id"
      );
    }

    if (buyer.role !== "buyer") {
      throw new CalculateCartShippingError(
        "Only buyers can calculate shipping.",
        403,
        "buyer_id"
      );
    }

    const billingAddress = await this.billingAddressRepository.findByIdAndBuyerId(
      input.billingAddressId,
      input.buyerId
    );

    if (!billingAddress) {
      throw new CalculateCartShippingError(
        "Billing address not found.",
        404,
        "billing_address_id"
      );
    }

    const shippingSettings = await this.shippingSettingsRepository.get();

    if (!shippingSettings) {
      throw new CalculateCartShippingError(
        "Shipping settings not found.",
        404,
        "shipping_settings"
      );
    }

    const cart = await this.cartRepository.findActiveByBuyerId(input.buyerId);

    if (!cart) {
      throw new CalculateCartShippingError(
        "Buyer has no active cart.",
        404,
        "buyer_id"
      );
    }

    const cartItems = await this.cartRepository.findItemsByCartId(cart.id);

    if (cartItems.length === 0) {
      throw new CalculateCartShippingError(
        "Active cart is empty.",
        409,
        "cart_id"
      );
    }

    const rawLines = await this.loadValidatedCartLines(cartItems);
    const rawSubtotal = rawLines.reduce((sum, line) => sum + line.rawSubtotal, 0);
    const totalItems = rawLines.reduce((sum, line) => sum + line.quantity, 0);
    const currency = this.resolveSingleCurrency(rawLines);

    if (
      !Number.isFinite(input.discountedSubtotal) ||
      input.discountedSubtotal < 0 ||
      input.discountedSubtotal > rawSubtotal
    ) {
      throw new CalculateCartShippingError(
        "Discounted subtotal must be between 0 and the raw cart subtotal.",
        400,
        "discounted_subtotal"
      );
    }

    const proratedDiscounts = prorateDiscountAcrossLines(
      rawLines.map((line) => ({
        id: line.id,
        rawSubtotal: line.rawSubtotal
      })),
      input.discountedSubtotal
    );

    const discountedSubtotalByLineId = new Map(
      proratedDiscounts.lines.map((result) => [
        result.line.id,
        result.discountedSubtotal
      ])
    );

    const lines = rawLines.map((line) => ({
      ...line,
      discountedSubtotal: discountedSubtotalByLineId.get(line.id) ?? line.rawSubtotal
    }));

    const segments =
      shippingSettings.shippingMode === "PLATFORM"
        ? [this.buildPlatformSegment(lines)]
        : this.buildVendorSegments(lines);

    const baseBreakdown = [];

    for (const segment of segments) {
      if (shippingSettings.shippingMode === "PLATFORM") {
        baseBreakdown.push(
          await this.calculatePlatformSegment(segment, billingAddress, shippingSettings)
        );
        continue;
      }

      baseBreakdown.push(
        await this.calculateVendorSegment(segment, billingAddress, shippingSettings)
      );
    }

    const baseShippingFee = baseBreakdown.reduce(
      (sum, segment) => sum + segment.baseShippingFee,
      0
    );
    const freeShipping = await this.resolveFreeShipping({
      discountedSubtotal: input.discountedSubtotal,
      freeShippingCouponCode: input.freeShippingCouponCode
    });
    const finalShippingFee = freeShipping.applied ? 0 : baseShippingFee;

    return {
      cartId: cart.id,
      currency,
      rawSubtotal,
      discountedSubtotal: input.discountedSubtotal,
      totalItems,
      shippingMode: shippingSettings.shippingMode,
      categoryShippingMode: shippingSettings.categoryShippingMode,
      baseShippingFee,
      finalShippingFee,
      freeShipping,
      breakdown: baseBreakdown.map((segment) => ({
        ...segment,
        finalShippingOwnerType: freeShipping.applied
          ? "platform"
          : segment.finalShippingOwnerType,
        finalShippingFee: freeShipping.applied ? 0 : segment.baseShippingFee
      }))
    };
  }

  private async loadValidatedCartLines(
    cartItems: CartItemRecord[]
  ): Promise<ShippingCartLine[]> {
    const lines = await Promise.all(
      cartItems.map(async (cartItem) => {
        const product = await this.productRepository.findById(cartItem.productId);

        if (!product) {
          throw new CalculateCartShippingError(
            "Cart contains a product that no longer exists.",
            404,
            "product_id"
          );
        }

        if (product.status !== "approved") {
          throw new CalculateCartShippingError(
            "Cart contains a product that is no longer approved.",
            409,
            "product_id"
          );
        }

        if (cartItem.quantity > product.quantity) {
          throw new CalculateCartShippingError(
            "Cart quantity exceeds available product quantity.",
            409,
            "quantity"
          );
        }

        return this.toShippingCartLine(cartItem, product);
      })
    );

    return lines.sort((left, right) => left.id.localeCompare(right.id));
  }

  private toShippingCartLine(
    cartItem: CartItemRecord,
    product: ProductRecord
  ): ShippingCartLine {
    return {
      id: cartItem.id,
      sellerId: product.sellerId,
      categoryId: product.categoryId,
      productId: product.id,
      quantity: cartItem.quantity,
      currency: product.currency,
      rawSubtotal: product.price * cartItem.quantity
    };
  }

  private resolveSingleCurrency(lines: ShippingCartLine[]): string {
    const currencies = Array.from(new Set(lines.map((line) => line.currency)));

    if (currencies.length !== 1) {
      throw new CalculateCartShippingError(
        "Cart contains mixed currencies and cannot be used for one shipping calculation.",
        409,
        "currency"
      );
    }

    return currencies[0];
  }

  private buildPlatformSegment(
    lines: DiscountedShippingCartLine[]
  ): ShippingSegment {
    return {
      sellerId: null,
      lines,
      rawSubtotal: lines.reduce((sum, line) => sum + line.rawSubtotal, 0),
      discountedSubtotal: lines.reduce(
        (sum, line) => sum + line.discountedSubtotal,
        0
      )
    };
  }

  private buildVendorSegments(
    lines: DiscountedShippingCartLine[]
  ): ShippingSegment[] {
    const segmentsBySellerId = new Map<string, ShippingSegment>();

    for (const line of lines) {
      const existingSegment = segmentsBySellerId.get(line.sellerId);

      if (!existingSegment) {
        segmentsBySellerId.set(line.sellerId, {
          sellerId: line.sellerId,
          lines: [line],
          rawSubtotal: line.rawSubtotal,
          discountedSubtotal: line.discountedSubtotal
        });
        continue;
      }

      existingSegment.lines.push(line);
      existingSegment.rawSubtotal += line.rawSubtotal;
      existingSegment.discountedSubtotal += line.discountedSubtotal;
    }

    return Array.from(segmentsBySellerId.values()).sort((left, right) =>
      (left.sellerId ?? "").localeCompare(right.sellerId ?? "")
    );
  }

  private async calculatePlatformSegment(
    segment: ShippingSegment,
    billingAddress: {
      state: string;
      city: string;
    },
    shippingSettings: ShippingSettingsRecord
  ): Promise<CalculateCartShippingBreakdownItem> {
    const zoneResolution = await this.resolvePlatformZoneFee({
      discountedSubtotal: segment.discountedSubtotal,
      billingAddress
    });
    const categoryResolution = await this.resolvePlatformCategoryFee({
      lines: segment.lines,
      categoryShippingMode: shippingSettings.categoryShippingMode
    });
    const baseShippingFee = Math.max(zoneResolution.fee, categoryResolution.fee);

    return {
      sellerId: null,
      ruleOwnerType: "platform",
      finalShippingOwnerType: "platform",
      usedFallback: false,
      matchedZone: zoneResolution.matchedZone,
      zoneFee: zoneResolution.fee,
      categoryFee: categoryResolution.fee,
      baseShippingFee,
      finalShippingFee: baseShippingFee
    };
  }

  private async calculateVendorSegment(
    segment: ShippingSegment,
    billingAddress: {
      state: string;
      city: string;
    },
    shippingSettings: ShippingSettingsRecord
  ): Promise<CalculateCartShippingBreakdownItem> {
    if (!segment.sellerId) {
      throw new CalculateCartShippingError(
        "Vendor shipping segment is missing a seller id.",
        500,
        "seller_id"
      );
    }

    const zoneResolution = await this.resolveVendorZoneFee({
      sellerId: segment.sellerId,
      discountedSubtotal: segment.discountedSubtotal,
      billingAddress,
      vendorFallbackPolicy: shippingSettings.vendorFallbackPolicy
    });
    const categoryResolution = await this.resolveVendorCategoryFee({
      sellerId: segment.sellerId,
      lines: segment.lines,
      categoryShippingMode: shippingSettings.categoryShippingMode,
      vendorFallbackPolicy: shippingSettings.vendorFallbackPolicy
    });
    const baseShippingFee = Math.max(zoneResolution.fee, categoryResolution.fee);

    return {
      sellerId: segment.sellerId,
      ruleOwnerType:
        zoneResolution.ruleOwnerType === "platform" ||
        categoryResolution.ruleOwnerType === "platform"
          ? "platform"
          : "vendor",
      finalShippingOwnerType: "vendor",
      usedFallback: zoneResolution.usedFallback || categoryResolution.usedFallback,
      matchedZone: zoneResolution.matchedZone,
      zoneFee: zoneResolution.fee,
      categoryFee: categoryResolution.fee,
      baseShippingFee,
      finalShippingFee: baseShippingFee
    };
  }

  private async resolvePlatformZoneFee(input: {
    discountedSubtotal: number;
    billingAddress: {
      state: string;
      city: string;
    };
  }): Promise<ZoneFeeResolution> {
    const matchingZones =
      await this.shippingZoneRepository.findMatchingActivePlatform({
        stateName: input.billingAddress.state,
        cityName: input.billingAddress.city
      });
    const zoneMatch = selectBestZoneMatch(matchingZones, {
      stateName: input.billingAddress.state,
      cityName: input.billingAddress.city
    });

    if (!zoneMatch.match) {
      if (zoneMatch.failureReason === "ambiguous_location") {
        throw new CalculateCartShippingError(
          "Delivery location matches multiple platform shipping zones.",
          409,
          "billing_address_id"
        );
      }

      throw new CalculateCartShippingError(
        "Delivery location is not supported by platform shipping zones.",
        409,
        "billing_address_id"
      );
    }

    const zoneRule = await this.shippingZoneRuleRepository.findPlatformByZoneId(
      zoneMatch.match.zone.id
    );

    if (!zoneRule || zoneRule.status !== "active") {
      throw new CalculateCartShippingError(
        "No active platform shipping zone rule is configured for the delivery location.",
        409,
        "billing_address_id"
      );
    }

    const ruleCalculation = calculateRuleShippingAmount(
      zoneRule,
      input.discountedSubtotal
    );

    if (!ruleCalculation) {
      throw new CalculateCartShippingError(
        "The active platform shipping zone rule does not match the current subtotal.",
        409,
        "billing_address_id"
      );
    }

    return {
      matchedZone: {
        id: zoneMatch.match.zone.id,
        name: zoneMatch.match.zone.name,
        matchType: zoneMatch.match.matchType
      },
      fee: ruleCalculation.amount,
      ruleOwnerType: "platform",
      usedFallback: false
    };
  }

  private async resolveVendorZoneFee(input: {
    sellerId: string;
    discountedSubtotal: number;
    billingAddress: {
      state: string;
      city: string;
    };
    vendorFallbackPolicy: VendorFallbackPolicy;
  }): Promise<ZoneFeeResolution> {
    const sellerZoneAttempt = await this.attemptVendorZoneFee({
      sellerId: input.sellerId,
      discountedSubtotal: input.discountedSubtotal,
      billingAddress: input.billingAddress
    });

    if (sellerZoneAttempt.kind === "success") {
      return sellerZoneAttempt.resolution;
    }

    if (sellerZoneAttempt.kind === "ambiguous_location") {
      throw new CalculateCartShippingError(
        "Delivery location matches multiple seller shipping zones.",
        409,
        "billing_address_id"
      );
    }

    if (input.vendorFallbackPolicy === "BLOCK_CHECKOUT") {
      throw this.createZoneAttemptError(sellerZoneAttempt.kind);
    }

    const platformZoneAttempt = await this.attemptPlatformZoneFee({
      discountedSubtotal: input.discountedSubtotal,
      billingAddress: input.billingAddress
    });

    if (platformZoneAttempt.kind === "success") {
      return {
        ...platformZoneAttempt.resolution,
        usedFallback: true
      };
    }

    if (platformZoneAttempt.kind === "ambiguous_location") {
      throw new CalculateCartShippingError(
        "Delivery location matches multiple platform shipping zones.",
        409,
        "billing_address_id"
      );
    }

    throw this.createZoneAttemptError(
      sellerZoneAttempt.kind === "unsupported_location"
        ? platformZoneAttempt.kind
        : sellerZoneAttempt.kind
    );
  }

  private async attemptPlatformZoneFee(input: {
    discountedSubtotal: number;
    billingAddress: {
      state: string;
      city: string;
    };
  }):
    Promise<
      | { kind: "success"; resolution: ZoneFeeResolution }
      | {
          kind:
            | "unsupported_location"
            | "ambiguous_location"
            | "missing_rule"
            | "unusable_rule";
          resolution?: undefined;
        }
    > {
    const matchingZones =
      await this.shippingZoneRepository.findMatchingActivePlatform({
        stateName: input.billingAddress.state,
        cityName: input.billingAddress.city
      });
    const zoneMatch = selectBestZoneMatch(matchingZones, {
      stateName: input.billingAddress.state,
      cityName: input.billingAddress.city
    });

    if (!zoneMatch.match) {
      return { kind: zoneMatch.failureReason };
    }

    const zoneRule = await this.shippingZoneRuleRepository.findPlatformByZoneId(
      zoneMatch.match.zone.id
    );

    if (!zoneRule || zoneRule.status !== "active") {
      return { kind: "missing_rule" };
    }

    const ruleCalculation = calculateRuleShippingAmount(
      zoneRule,
      input.discountedSubtotal
    );

    if (!ruleCalculation) {
      return { kind: "unusable_rule" };
    }

    return {
      kind: "success",
      resolution: {
        matchedZone: {
          id: zoneMatch.match.zone.id,
          name: zoneMatch.match.zone.name,
          matchType: zoneMatch.match.matchType
        },
        fee: ruleCalculation.amount,
        ruleOwnerType: "platform",
        usedFallback: false
      }
    };
  }

  private async attemptVendorZoneFee(input: {
    sellerId: string;
    discountedSubtotal: number;
    billingAddress: {
      state: string;
      city: string;
    };
  }):
    Promise<
      | { kind: "success"; resolution: ZoneFeeResolution }
      | {
          kind:
            | "unsupported_location"
            | "ambiguous_location"
            | "missing_rule"
            | "unusable_rule";
          resolution?: undefined;
        }
    > {
    const matchingZones =
      await this.shippingZoneRepository.findMatchingActiveVendor({
        ownerId: input.sellerId,
        stateName: input.billingAddress.state,
        cityName: input.billingAddress.city
      });
    const zoneMatch = selectBestZoneMatch(matchingZones, {
      stateName: input.billingAddress.state,
      cityName: input.billingAddress.city
    });

    if (!zoneMatch.match) {
      return { kind: zoneMatch.failureReason };
    }

    const zoneRule = await this.shippingZoneRuleRepository.findVendorByZoneId(
      input.sellerId,
      zoneMatch.match.zone.id
    );

    if (!zoneRule || zoneRule.status !== "active") {
      return { kind: "missing_rule" };
    }

    const ruleCalculation = calculateRuleShippingAmount(
      zoneRule,
      input.discountedSubtotal
    );

    if (!ruleCalculation) {
      return { kind: "unusable_rule" };
    }

    return {
      kind: "success",
      resolution: {
        matchedZone: {
          id: zoneMatch.match.zone.id,
          name: zoneMatch.match.zone.name,
          matchType: zoneMatch.match.matchType
        },
        fee: ruleCalculation.amount,
        ruleOwnerType: "vendor",
        usedFallback: false
      }
    };
  }

  private createZoneAttemptError(
    kind: "unsupported_location" | "missing_rule" | "unusable_rule"
  ): CalculateCartShippingError {
    if (kind === "unsupported_location") {
      return new CalculateCartShippingError(
        "Delivery location is not supported by any available shipping zone.",
        409,
        "billing_address_id"
      );
    }

    if (kind === "missing_rule") {
      return new CalculateCartShippingError(
        "No active shipping zone rule is available for the delivery location.",
        409,
        "billing_address_id"
      );
    }

    return new CalculateCartShippingError(
      "No usable shipping zone rule matches the current subtotal for the delivery location.",
      409,
      "billing_address_id"
    );
  }

  private async resolvePlatformCategoryFee(input: {
    lines: DiscountedShippingCartLine[];
    categoryShippingMode: CategoryShippingMode;
  }): Promise<CategoryFeeResolution> {
    const categoryDiscountedSubtotals = this.groupDiscountedSubtotalByCategory(
      input.lines
    );
    const categoryFees: number[] = [];

    for (const categorySubtotal of categoryDiscountedSubtotals.values()) {
      const categoryRule =
        await this.categoryShippingRuleRepository.findPlatformByCategoryId(
          categorySubtotal.categoryId
        );

      if (!categoryRule || categoryRule.status !== "active") {
        continue;
      }

      const ruleCalculation = calculateRuleShippingAmount(
        categoryRule,
        categorySubtotal.discountedSubtotal
      );

      if (!ruleCalculation) {
        throw new CalculateCartShippingError(
          "An active platform category shipping rule does not match the current subtotal.",
          409,
          "category_id"
        );
      }

      categoryFees.push(ruleCalculation.amount);
    }

    return {
      fee: aggregateCategoryFees(input.categoryShippingMode, categoryFees),
      ruleOwnerType: categoryFees.length > 0 ? "platform" : null,
      usedFallback: false
    };
  }

  private async resolveVendorCategoryFee(input: {
    sellerId: string;
    lines: DiscountedShippingCartLine[];
    categoryShippingMode: CategoryShippingMode;
    vendorFallbackPolicy: VendorFallbackPolicy;
  }): Promise<CategoryFeeResolution> {
    const categoryDiscountedSubtotals = this.groupDiscountedSubtotalByCategory(
      input.lines
    );
    const categoryFees: number[] = [];
    let usedFallback = false;
    let usedPlatformRule = false;

    for (const categorySubtotal of categoryDiscountedSubtotals.values()) {
      const sellerRuleAttempt = await this.attemptVendorCategoryRule({
        sellerId: input.sellerId,
        categoryId: categorySubtotal.categoryId,
        discountedSubtotal: categorySubtotal.discountedSubtotal
      });

      if (sellerRuleAttempt.kind === "success") {
        categoryFees.push(sellerRuleAttempt.fee);
        continue;
      }

      if (sellerRuleAttempt.kind === "unusable_rule") {
        if (input.vendorFallbackPolicy !== "USE_PLATFORM_RULES") {
          throw new CalculateCartShippingError(
            "A seller category shipping rule does not match the current subtotal.",
            409,
            "category_id"
          );
        }

        const platformRuleAttempt = await this.attemptPlatformCategoryRule({
          categoryId: categorySubtotal.categoryId,
          discountedSubtotal: categorySubtotal.discountedSubtotal
        });

        if (platformRuleAttempt.kind !== "success") {
          throw new CalculateCartShippingError(
            "No usable platform category shipping fallback is available for the current subtotal.",
            409,
            "category_id"
          );
        }

        categoryFees.push(platformRuleAttempt.fee);
        usedFallback = true;
        usedPlatformRule = true;
        continue;
      }

      if (input.vendorFallbackPolicy !== "USE_PLATFORM_RULES") {
        continue;
      }

      const platformRuleAttempt = await this.attemptPlatformCategoryRule({
        categoryId: categorySubtotal.categoryId,
        discountedSubtotal: categorySubtotal.discountedSubtotal
      });

      if (platformRuleAttempt.kind === "success") {
        categoryFees.push(platformRuleAttempt.fee);
        usedFallback = true;
        usedPlatformRule = true;
        continue;
      }

      if (platformRuleAttempt.kind === "unusable_rule") {
        throw new CalculateCartShippingError(
          "An active platform category shipping fallback does not match the current subtotal.",
          409,
          "category_id"
        );
      }
    }

    return {
      fee: aggregateCategoryFees(input.categoryShippingMode, categoryFees),
      ruleOwnerType: usedPlatformRule ? "platform" : categoryFees.length > 0 ? "vendor" : null,
      usedFallback
    };
  }

  private async attemptPlatformCategoryRule(input: {
    categoryId: string;
    discountedSubtotal: number;
  }): Promise<
    | { kind: "success"; fee: number }
    | { kind: "missing_rule" | "unusable_rule"; fee?: undefined }
  > {
    const categoryRule =
      await this.categoryShippingRuleRepository.findPlatformByCategoryId(
        input.categoryId
      );

    if (!categoryRule || categoryRule.status !== "active") {
      return { kind: "missing_rule" };
    }

    const ruleCalculation = calculateRuleShippingAmount(
      categoryRule,
      input.discountedSubtotal
    );

    if (!ruleCalculation) {
      return { kind: "unusable_rule" };
    }

    return {
      kind: "success",
      fee: ruleCalculation.amount
    };
  }

  private async attemptVendorCategoryRule(input: {
    sellerId: string;
    categoryId: string;
    discountedSubtotal: number;
  }): Promise<
    | { kind: "success"; fee: number }
    | { kind: "missing_rule" | "unusable_rule"; fee?: undefined }
  > {
    const categoryRule =
      await this.categoryShippingRuleRepository.findVendorByCategoryId(
        input.sellerId,
        input.categoryId
      );

    if (!categoryRule || categoryRule.status !== "active") {
      return { kind: "missing_rule" };
    }

    const ruleCalculation = calculateRuleShippingAmount(
      categoryRule,
      input.discountedSubtotal
    );

    if (!ruleCalculation) {
      return { kind: "unusable_rule" };
    }

    return {
      kind: "success",
      fee: ruleCalculation.amount
    };
  }

  private groupDiscountedSubtotalByCategory(
    lines: DiscountedShippingCartLine[]
  ): Map<
    string,
    {
      categoryId: string;
      discountedSubtotal: number;
    }
  > {
    const categorySubtotals = new Map<
      string,
      {
        categoryId: string;
        discountedSubtotal: number;
      }
    >();

    for (const line of lines) {
      const existingCategorySubtotal = categorySubtotals.get(line.categoryId);

      if (!existingCategorySubtotal) {
        categorySubtotals.set(line.categoryId, {
          categoryId: line.categoryId,
          discountedSubtotal: line.discountedSubtotal
        });
        continue;
      }

      existingCategorySubtotal.discountedSubtotal += line.discountedSubtotal;
    }

    return categorySubtotals;
  }

  private async resolveFreeShipping(input: {
    discountedSubtotal: number;
    freeShippingCouponCode?: string;
  }): Promise<{
    applied: boolean;
    ruleId: string | null;
    ruleType: FreeShippingRuleType | null;
    couponCode: string | null;
  }> {
    const normalizedCouponCode = input.freeShippingCouponCode?.trim() || null;

    if (normalizedCouponCode) {
      const couponRule =
        await this.freeShippingRuleRepository.findActiveByCouponCode(
          normalizedCouponCode
        );

      if (!couponRule) {
        throw new CalculateCartShippingError(
          "Free shipping coupon is invalid or inactive.",
          400,
          "free_shipping_coupon_code"
        );
      }

      return {
        applied: true,
        ruleId: couponRule.id,
        ruleType: couponRule.type,
        couponCode: couponRule.couponCode
      };
    }

    const thresholdRule =
      await this.freeShippingRuleRepository.findActiveThresholdRule();

    if (
      thresholdRule &&
      thresholdRule.minimumOrderSubtotal !== null &&
      input.discountedSubtotal >= thresholdRule.minimumOrderSubtotal
    ) {
      return {
        applied: true,
        ruleId: thresholdRule.id,
        ruleType: thresholdRule.type,
        couponCode: null
      };
    }

    return {
      applied: false,
      ruleId: null,
      ruleType: null,
      couponCode: null
    };
  }
}
