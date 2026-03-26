import type {
  AdminKycRepository,
  AdminSellerKycDetail
} from "../../ports/admin-kyc-repository";

export interface ApproveSellerKycInput {
  kycId: string;
  reviewNote?: string;
}

export interface ApproveSellerKycUseCase {
  execute(input: ApproveSellerKycInput): Promise<AdminSellerKycDetail>;
}

export class ApproveSellerKycError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "ApproveSellerKycError";
  }
}

const APPROVABLE_STATUSES = new Set(["submitted", "under_review", "needs_correction"]);

export class ApproveSellerKyc implements ApproveSellerKycUseCase {
  constructor(private readonly adminKycRepository: AdminKycRepository) {}

  async execute(input: ApproveSellerKycInput): Promise<AdminSellerKycDetail> {
    const existingKyc = await this.adminKycRepository.findCompletedSellerKycById(
      input.kycId
    );

    if (!existingKyc) {
      throw new ApproveSellerKycError("Seller KYC submission not found.", 404);
    }

    if (!APPROVABLE_STATUSES.has(existingKyc.status)) {
      throw new ApproveSellerKycError(
        "Seller KYC cannot be approved in its current state.",
        409
      );
    }

    const approvedKyc = await this.adminKycRepository.approveSellerKyc({
      kycId: input.kycId,
      reviewNote: input.reviewNote,
      reviewedAt: new Date()
    });

    if (!approvedKyc) {
      throw new ApproveSellerKycError("Seller KYC submission not found.", 404);
    }

    return approvedKyc;
  }
}
