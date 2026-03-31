import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type {
  BillingAddressRecord,
  BillingAddressRepository
} from "../../ports/billing-address-repository";

export interface GetBillingAddressesInput {
  buyerId: string;
}

export interface GetBillingAddressesResult {
  addresses: BillingAddressRecord[];
}

export interface GetBillingAddressesUseCase {
  execute(input: GetBillingAddressesInput): Promise<GetBillingAddressesResult>;
}

export class GetBillingAddressesError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "GetBillingAddressesError";
  }
}

export class GetBillingAddresses implements GetBillingAddressesUseCase {
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly billingAddressRepository: BillingAddressRepository
  ) {}

  async execute(
    input: GetBillingAddressesInput
  ): Promise<GetBillingAddressesResult> {
    const buyer = await this.authenticationRepository.findById(input.buyerId);

    if (!buyer) {
      throw new GetBillingAddressesError(
        "Buyer account not found.",
        404,
        "buyer_id"
      );
    }

    if (buyer.role !== "buyer") {
      throw new GetBillingAddressesError(
        "Only buyers can fetch billing addresses.",
        403,
        "buyer_id"
      );
    }

    const addresses = await this.billingAddressRepository.findByBuyerId(
      input.buyerId
    );

    return { addresses };
  }
}
