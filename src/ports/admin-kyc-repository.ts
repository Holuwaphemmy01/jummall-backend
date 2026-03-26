import type {
  SellerAccountType,
  SellerKycDocumentRecord,
  SellerKycStatus
} from "./seller-kyc-repository";

export interface AdminSellerKycSummary {
  id: string;
  userId: string;
  sellerFirstName: string | null;
  sellerLastName: string | null;
  sellerUsername: string | null;
  sellerEmail: string;
  sellerPhone: string | null;
  accountType: SellerAccountType;
  status: SellerKycStatus;
  submittedAt: Date | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminSellerKycDetail extends AdminSellerKycSummary {
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
  idType: string | null;
  idNumber: string | null;
  businessName: string | null;
  registrationNumber: string | null;
  registeredBusinessAddress: string | null;
  representativeFirstName: string | null;
  representativeLastName: string | null;
  representativeRole: string | null;
  reviewNote: string | null;
  documents: SellerKycDocumentRecord[];
}

export interface AdminKycRepository {
  listCompletedSellerKyc(): Promise<AdminSellerKycSummary[]>;
  findCompletedSellerKycById(kycId: string): Promise<AdminSellerKycDetail | null>;
}
