import type { SellerKycDocumentType } from "./seller-kyc-repository";

export interface UploadSellerKycDocumentInput {
  userId: string;
  documentType: SellerKycDocumentType;
  fileName: string;
  mimeType: string;
  fileContents: Buffer;
}

export interface UploadedDocument {
  storagePath: string;
}

export interface DocumentStorage {
  uploadSellerKycDocument(
    input: UploadSellerKycDocumentInput
  ): Promise<UploadedDocument>;
}
