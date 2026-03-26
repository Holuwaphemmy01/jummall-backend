import type {
  AdminKycRepository,
  AdminSellerKycSummary
} from "../../ports/admin-kyc-repository";

export interface ListCompletedSellerKycUseCase {
  execute(): Promise<AdminSellerKycSummary[]>;
}

export class ListCompletedSellerKyc implements ListCompletedSellerKycUseCase {
  constructor(private readonly adminKycRepository: AdminKycRepository) {}

  async execute(): Promise<AdminSellerKycSummary[]> {
    return this.adminKycRepository.listCompletedSellerKyc();
  }
}
