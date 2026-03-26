import type {
  SaveSellerKycDraftInput as RepositorySaveSellerKycDraftInput,
  SellerKycRecord,
  SellerKycRepository
} from "../../ports/seller-kyc-repository";
import { SellerKycError } from "./seller-kyc-errors";

export interface SaveSellerKycDraftInput {
  userId: string;
  accountType: "individual" | "business";
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  fullName?: string;
  dateOfBirth?: Date;
  gender?: string;
  idType?: "national_id" | "international_passport" | "drivers_license" | "voters_card";
  idNumber?: string;
  businessName?: string;
  registrationNumber?: string;
  registeredBusinessAddress?: string;
  representativeFirstName?: string;
  representativeLastName?: string;
  representativeRole?: string;
}

export interface SaveSellerKycDraftUseCase {
  execute(input: SaveSellerKycDraftInput): Promise<SellerKycRecord>;
}

const IMMUTABLE_STATUSES = new Set(["submitted", "under_review", "approved"]);
const NUBAN_REGEX = /^\d{10}$/;

export class SaveSellerKycDraft implements SaveSellerKycDraftUseCase {
  constructor(private readonly sellerKycRepository: SellerKycRepository) {}

  async execute(input: SaveSellerKycDraftInput): Promise<SellerKycRecord> {
    const existingKyc = await this.sellerKycRepository.findByUserId(input.userId);

    if (!existingKyc) {
      throw new SellerKycError("Seller KYC profile not found.", 404, [
        { field: "user_id", message: "Seller KYC profile not found." }
      ]);
    }

    if (existingKyc.accountType !== input.accountType) {
      throw new SellerKycError("Account type does not match seller profile.", 409, [
        { field: "account_type", message: "Account type does not match seller profile." }
      ]);
    }

    if (IMMUTABLE_STATUSES.has(existingKyc.status)) {
      throw new SellerKycError("KYC cannot be updated in its current state.", 409, [
        { field: "status", message: "KYC cannot be updated in its current state." }
      ]);
    }

    this.validateBankAccountNumber(input);

    return this.sellerKycRepository.saveDraft(this.withDefaultCountry(input));
  }

  private validateBankAccountNumber(input: SaveSellerKycDraftInput): void {
    if (
      input.bankAccountNumber &&
      !NUBAN_REGEX.test(input.bankAccountNumber)
    ) {
      throw new SellerKycError("Bank account number must be a valid NUBAN.", 400, [
        {
          field: "bank_account_number",
          message: "Bank account number must be a valid 10-digit NUBAN."
        }
      ]);
    }
  }

  private withDefaultCountry(
    input: SaveSellerKycDraftInput
  ): RepositorySaveSellerKycDraftInput {
    return {
      ...input,
      country: input.country ?? "Nigeria"
    };
  }
}
