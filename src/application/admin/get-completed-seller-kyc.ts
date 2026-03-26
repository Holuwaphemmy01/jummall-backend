import type {
  AdminKycRepository,
  AdminSellerKycDetail
} from "../../ports/admin-kyc-repository";

export interface GetCompletedSellerKycInput {
  kycId: string;
}

export interface GetCompletedSellerKycUseCase {
  execute(input: GetCompletedSellerKycInput): Promise<AdminSellerKycDetail>;
}

export class GetCompletedSellerKycError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "GetCompletedSellerKycError";
  }
}

export class GetCompletedSellerKyc implements GetCompletedSellerKycUseCase {
  constructor(private readonly adminKycRepository: AdminKycRepository) {}

  async execute(input: GetCompletedSellerKycInput): Promise<AdminSellerKycDetail> {
    const kyc = await this.adminKycRepository.findCompletedSellerKycById(
      input.kycId
    );

    if (!kyc) {
      throw new GetCompletedSellerKycError(
        "Seller KYC submission not found.",
        404
      );
    }

    return kyc;
  }
}
