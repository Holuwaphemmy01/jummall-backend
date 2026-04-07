import type { SellerKycDocumentType } from "./seller-kyc-repository";

export interface UploadSellerKycDocumentInput {
  userId: string;
  documentType: SellerKycDocumentType;
  fileName: string;
  mimeType: string;
  fileContents: Buffer;
}

export interface UploadProductImageInput {
  sellerId: string;
  fileName: string;
  mimeType: string;
  fileContents: Buffer;
}

export interface UploadProductCategoryImageInput {
  categoryName: string;
  fileName: string;
  mimeType: string;
  fileContents: Buffer;
}

export interface UploadProductBrandImageInput {
  brandName: string;
  fileName: string;
  mimeType: string;
  fileContents: Buffer;
}

export interface UploadSliderImageInput {
  sliderTitle: string;
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
  uploadProductImage(input: UploadProductImageInput): Promise<UploadedDocument>;
  uploadProductCategoryImage(
    input: UploadProductCategoryImageInput
  ): Promise<UploadedDocument>;
  uploadProductBrandImage(
    input: UploadProductBrandImageInput
  ): Promise<UploadedDocument>;
  uploadSliderImage(input: UploadSliderImageInput): Promise<UploadedDocument>;
}
