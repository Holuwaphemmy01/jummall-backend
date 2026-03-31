import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type {
  BillingAddressRecord,
  BillingAddressRepository
} from "../../ports/billing-address-repository";

export interface AddBillingAddressInput {
  buyerId: string;
  fullName: string;
  phoneNumber: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
}

export interface AddBillingAddressUseCase {
  execute(input: AddBillingAddressInput): Promise<BillingAddressRecord>;
}

export class AddBillingAddressError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "AddBillingAddressError";
  }
}

export class AddBillingAddress implements AddBillingAddressUseCase {
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly billingAddressRepository: BillingAddressRepository
  ) {}

  async execute(input: AddBillingAddressInput): Promise<BillingAddressRecord> {
    const buyer = await this.authenticationRepository.findById(input.buyerId);

    if (!buyer) {
      throw new AddBillingAddressError(
        "Buyer account not found.",
        404,
        "buyer_id"
      );
    }

    if (buyer.role !== "buyer") {
      throw new AddBillingAddressError(
        "Only buyers can add billing addresses.",
        403,
        "buyer_id"
      );
    }

    return this.billingAddressRepository.create({
      buyerId: input.buyerId,
      fullName: input.fullName.trim(),
      phoneNumber: input.phoneNumber.trim(),
      addressLine1: input.addressLine1.trim(),
      addressLine2: input.addressLine2?.trim(),
      city: input.city.trim(),
      state: input.state.trim(),
      country: input.country.trim(),
      postalCode: input.postalCode?.trim()
    });
  }
}
