import type { AuthenticationRepository } from "../../ports/authentication-repository";
import type {
  BuyerRecord,
  BuyerRepository,
  UpdateBuyerProfileInput as UpdateBuyerProfileRepositoryInput
} from "../../ports/buyer-repository";

export interface UpdateBuyerProfileInput {
  buyerId: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export interface UpdateBuyerProfileUseCase {
  execute(input: UpdateBuyerProfileInput): Promise<BuyerRecord>;
}

export class UpdateBuyerProfileError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "UpdateBuyerProfileError";
  }
}

export class UpdateBuyerProfile implements UpdateBuyerProfileUseCase {
  constructor(
    private readonly authenticationRepository: AuthenticationRepository,
    private readonly buyerRepository: BuyerRepository
  ) {}

  async execute(input: UpdateBuyerProfileInput): Promise<BuyerRecord> {
    const buyer = await this.authenticationRepository.findById(input.buyerId);

    if (!buyer) {
      throw new UpdateBuyerProfileError(
        "Buyer account not found.",
        404,
        "buyer_id"
      );
    }

    if (buyer.role !== "buyer") {
      throw new UpdateBuyerProfileError(
        "Only buyers can update this profile.",
        403,
        "buyer_id"
      );
    }

    const repositoryInput: UpdateBuyerProfileRepositoryInput = {
      buyerId: input.buyerId
    };

    if (input.firstName !== undefined) {
      repositoryInput.firstName = input.firstName.trim();
    }

    if (input.lastName !== undefined) {
      repositoryInput.lastName = input.lastName.trim();
    }

    if (input.phone !== undefined) {
      repositoryInput.phone = input.phone.trim();
    }

    if (
      repositoryInput.phone !== undefined &&
      repositoryInput.phone !== (buyer.phone ?? null)
    ) {
      const phoneExists = await this.buyerRepository.isPhoneInUseByAnotherUser({
        buyerId: input.buyerId,
        phone: repositoryInput.phone
      });

      if (phoneExists) {
        throw new UpdateBuyerProfileError(
          "Phone is already in use.",
          409,
          "phone"
        );
      }
    }

    const updatedBuyer = await this.buyerRepository.updateBuyerProfile(
      repositoryInput
    );

    if (!updatedBuyer) {
      throw new UpdateBuyerProfileError(
        "Unable to update buyer profile.",
        500,
        "buyer_id"
      );
    }

    return updatedBuyer;
  }
}
