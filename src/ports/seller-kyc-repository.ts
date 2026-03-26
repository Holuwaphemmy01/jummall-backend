export type SellerAccountType = "individual" | "business";

export type SellerKycStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "needs_correction";

export type SellerKycDocumentType =
  | "proof_of_address"
  | "id_document"
  | "selfie"
  | "cac_certificate";

export type SellerIdType =
  | "national_id"
  | "international_passport"
  | "drivers_license"
  | "voters_card";

export interface SellerKycDocumentRecord {
  id: string;
  documentType: SellerKycDocumentType;
  storagePath: string;
  mimeType: string;
  originalFileName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SellerKycRecord {
  id: string;
  userId: string;
  accountType: SellerAccountType;
  status: SellerKycStatus;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  fullName: string | null;
  dateOfBirth: Date | null;
  gender: string | null;
  idType: SellerIdType | null;
  idNumber: string | null;
  businessName: string | null;
  registrationNumber: string | null;
  registeredBusinessAddress: string | null;
  representativeFirstName: string | null;
  representativeLastName: string | null;
  representativeRole: string | null;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  reviewNote: string | null;
  documents: SellerKycDocumentRecord[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SaveSellerKycDraftInput {
  userId: string;
  accountType: SellerAccountType;
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
  idType?: SellerIdType;
  idNumber?: string;
  businessName?: string;
  registrationNumber?: string;
  registeredBusinessAddress?: string;
  representativeFirstName?: string;
  representativeLastName?: string;
  representativeRole?: string;
}

export interface UpsertSellerKycDocumentInput {
  userId: string;
  documentType: SellerKycDocumentType;
  storagePath: string;
  mimeType: string;
  originalFileName: string;
}

export interface MarkSellerKycAsSubmittedInput {
  userId: string;
  submittedAt: Date;
}

export interface SellerKycRepository {
  findByUserId(userId: string): Promise<SellerKycRecord | null>;
  saveDraft(input: SaveSellerKycDraftInput): Promise<SellerKycRecord>;
  upsertDocument(
    input: UpsertSellerKycDocumentInput
  ): Promise<SellerKycDocumentRecord>;
  markAsSubmitted(
    input: MarkSellerKycAsSubmittedInput
  ): Promise<SellerKycRecord>;
}
