import type {
  SellerKycDocumentType,
  SellerKycRecord,
  SellerKycRepository
} from "../../ports/seller-kyc-repository";
import { SellerKycError, type SellerKycErrorDetail } from "./seller-kyc-errors";

export interface SubmitSellerKycInput {
  userId: string;
}

export interface SubmitSellerKycResult {
  id: string;
  status: string;
  submittedAt: Date;
}

export interface SubmitSellerKycUseCase {
  execute(input: SubmitSellerKycInput): Promise<SubmitSellerKycResult>;
}

const REQUIRED_COMMON_FIELDS: Array<keyof SellerKycRecord> = [
  "email",
  "phone",
  "address",
  "city",
  "state",
  "country",
  "bankName",
  "bankAccountNumber",
  "bankAccountName"
];

const REQUIRED_INDIVIDUAL_FIELDS: Array<keyof SellerKycRecord> = [
  "fullName",
  "dateOfBirth",
  "idType",
  "idNumber"
];

const REQUIRED_BUSINESS_FIELDS: Array<keyof SellerKycRecord> = [
  "businessName",
  "registrationNumber",
  "registeredBusinessAddress",
  "representativeFirstName",
  "representativeLastName",
  "representativeRole"
];

const REQUIRED_DOCUMENTS: Record<
  SellerKycRecord["accountType"],
  SellerKycDocumentType[]
> = {
  individual: ["proof_of_address", "id_document", "selfie"],
  business: ["proof_of_address", "cac_certificate"]
};

const MUTABLE_SUBMISSION_STATUSES = new Set(["in_progress", "needs_correction"]);

const FIELD_LABELS: Record<string, string> = {
  email: "Email is required.",
  phone: "Phone number is required.",
  address: "Address is required.",
  city: "City is required.",
  state: "State is required.",
  country: "Country is required.",
  bankName: "Bank name is required.",
  bankAccountNumber: "Bank account number is required.",
  bankAccountName: "Bank account name is required.",
  fullName: "Full name is required for individual sellers.",
  dateOfBirth: "Date of birth is required for individual sellers.",
  idType: "ID type is required for individual sellers.",
  idNumber: "ID number is required for individual sellers.",
  businessName: "Business name is required for business sellers.",
  registrationNumber: "Registration number is required for business sellers.",
  registeredBusinessAddress:
    "Registered business address is required for business sellers.",
  representativeFirstName:
    "Representative first name is required for business sellers.",
  representativeLastName:
    "Representative last name is required for business sellers.",
  representativeRole: "Representative role is required for business sellers."
};

export class SubmitSellerKyc implements SubmitSellerKycUseCase {
  constructor(private readonly sellerKycRepository: SellerKycRepository) {}

  async execute(input: SubmitSellerKycInput): Promise<SubmitSellerKycResult> {
    const existingKyc = await this.sellerKycRepository.findByUserId(input.userId);

    if (!existingKyc) {
      throw new SellerKycError("Seller KYC profile not found.", 404, [
        { field: "user_id", message: "Seller KYC profile not found." }
      ]);
    }

    if (!MUTABLE_SUBMISSION_STATUSES.has(existingKyc.status)) {
      throw new SellerKycError("KYC cannot be submitted in its current state.", 409, [
        {
          field: "status",
          message: "KYC cannot be submitted in its current state."
        }
      ]);
    }

    const validationErrors = this.validateCompleteness(existingKyc);

    if (validationErrors.length > 0) {
      throw new SellerKycError("KYC submission is incomplete.", 400, validationErrors);
    }

    const submittedAt = new Date();
    const updatedKyc = await this.sellerKycRepository.markAsSubmitted({
      userId: input.userId,
      submittedAt
    });

    return {
      id: updatedKyc.id,
      status: updatedKyc.status,
      submittedAt: updatedKyc.submittedAt ?? submittedAt
    };
  }

  private validateCompleteness(kyc: SellerKycRecord): SellerKycErrorDetail[] {
    const errors: SellerKycErrorDetail[] = [];

    for (const field of REQUIRED_COMMON_FIELDS) {
      if (!kyc[field]) {
        errors.push({
          field: this.toSnakeCase(field),
          message: FIELD_LABELS[field]
        });
      }
    }

    const accountSpecificFields =
      kyc.accountType === "individual"
        ? REQUIRED_INDIVIDUAL_FIELDS
        : REQUIRED_BUSINESS_FIELDS;

    for (const field of accountSpecificFields) {
      if (!kyc[field]) {
        errors.push({
          field: this.toSnakeCase(field),
          message: FIELD_LABELS[field]
        });
      }
    }

    const uploadedDocumentTypes = new Set(
      kyc.documents.map((document) => document.documentType)
    );

    for (const documentType of REQUIRED_DOCUMENTS[kyc.accountType]) {
      if (!uploadedDocumentTypes.has(documentType)) {
        errors.push({
          field: documentType,
          message: `Required document is missing: ${documentType}.`
        });
      }
    }

    return errors;
  }

  private toSnakeCase(value: string): string {
    return value.replace(/[A-Z]/g, (character) => `_${character.toLowerCase()}`);
  }
}
