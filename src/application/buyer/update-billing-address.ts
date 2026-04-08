import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type {
  BillingAddressRecord,
  BillingAddressRepository,
  UpdateBillingAddressInput as UpdateBillingAddressRepositoryInput
} from "../../ports/billing-address-repository";

export interface UpdateBillingAddressInput {
  buyerId: string;
  billingAddressId: string;
  fullName?: string;
  phoneNumber?: string;
  addressLine1?: string;
  addressLine2?: string | null;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string | null;
}

export interface UpdateBillingAddressUseCase {
  execute(input: UpdateBillingAddressInput): Promise<BillingAddressRecord>;
}

export class UpdateBillingAddressError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "UpdateBillingAddressError";
  }
}

export class UpdateBillingAddress implements UpdateBillingAddressUseCase {
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly billingAddressRepository: BillingAddressRepository
  ) {}

  async execute(input: UpdateBillingAddressInput): Promise<BillingAddressRecord> {
    const buyer = await this.authenticationRepository.findById(input.buyerId);

    if (!buyer) {
      throw new UpdateBillingAddressError(
        "Buyer account not found.",
        404,
        "buyer_id"
      );
    }

    if (buyer.role !== "buyer") {
      throw new UpdateBillingAddressError(
        "Only buyers can update billing addresses.",
        403,
        "buyer_id"
      );
    }

    const billingAddress = await this.billingAddressRepository.findByIdAndBuyerId(
      input.billingAddressId,
      input.buyerId
    );

    if (!billingAddress) {
      throw new UpdateBillingAddressError(
        "Billing address not found.",
        404,
        "billing_address_id"
      );
    }

    const repositoryInput: UpdateBillingAddressRepositoryInput = {
      billingAddressId: input.billingAddressId,
      buyerId: input.buyerId
    };

    if (input.fullName !== undefined) {
      repositoryInput.fullName = input.fullName.trim();
    }

    if (input.phoneNumber !== undefined) {
      repositoryInput.phoneNumber = input.phoneNumber.trim();
    }

    if (input.addressLine1 !== undefined) {
      repositoryInput.addressLine1 = input.addressLine1.trim();
    }

    if (input.addressLine2 !== undefined) {
      repositoryInput.addressLine2 =
        input.addressLine2 === null ? null : input.addressLine2.trim();
    }

    if (input.city !== undefined) {
      repositoryInput.city = input.city.trim();
    }

    if (input.state !== undefined) {
      repositoryInput.state = input.state.trim();
    }

    if (input.country !== undefined) {
      repositoryInput.country = input.country.trim();
    }

    if (input.postalCode !== undefined) {
      repositoryInput.postalCode =
        input.postalCode === null ? null : input.postalCode.trim();
    }

    const updatedBillingAddress = await this.billingAddressRepository.update(
      repositoryInput
    );

    if (!updatedBillingAddress) {
      throw new UpdateBillingAddressError(
        "Unable to update billing address.",
        500,
        "billing_address_id"
      );
    }

    return updatedBillingAddress;
  }
}
