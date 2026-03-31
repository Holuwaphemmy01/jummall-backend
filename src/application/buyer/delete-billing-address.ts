import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type {
  BillingAddressRecord,
  BillingAddressRepository
} from "../../ports/billing-address-repository";

export interface DeleteBillingAddressInput {
  buyerId: string;
  billingAddressId: string;
}

export interface DeleteBillingAddressUseCase {
  execute(input: DeleteBillingAddressInput): Promise<BillingAddressRecord>;
}

export class DeleteBillingAddressError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "DeleteBillingAddressError";
  }
}

export class DeleteBillingAddress implements DeleteBillingAddressUseCase {
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly billingAddressRepository: BillingAddressRepository
  ) {}

  async execute(
    input: DeleteBillingAddressInput
  ): Promise<BillingAddressRecord> {
    const buyer = await this.authenticationRepository.findById(input.buyerId);

    if (!buyer) {
      throw new DeleteBillingAddressError(
        "Buyer account not found.",
        404,
        "buyer_id"
      );
    }

    if (buyer.role !== "buyer") {
      throw new DeleteBillingAddressError(
        "Only buyers can delete billing addresses.",
        403,
        "buyer_id"
      );
    }

    const billingAddress = await this.billingAddressRepository.findByIdAndBuyerId(
      input.billingAddressId,
      input.buyerId
    );

    if (!billingAddress) {
      throw new DeleteBillingAddressError(
        "Billing address not found.",
        404,
        "billing_address_id"
      );
    }

    const deletedBillingAddress =
      await this.billingAddressRepository.deleteByIdAndBuyerId(
        input.billingAddressId,
        input.buyerId
      );

    if (!deletedBillingAddress) {
      throw new DeleteBillingAddressError(
        "Unable to delete billing address.",
        500,
        "billing_address_id"
      );
    }

    return deletedBillingAddress;
  }
}
