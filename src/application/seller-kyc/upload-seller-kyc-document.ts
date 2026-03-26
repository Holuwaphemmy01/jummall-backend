import type { DocumentStorage } from "../../ports/document-storage";
import type {
  SellerKycDocumentRecord,
  SellerKycDocumentType,
  SellerKycRepository
} from "../../ports/seller-kyc-repository";
import { SellerKycError } from "./seller-kyc-errors";

export interface UploadSellerKycDocumentInput {
  userId: string;
  documentType: SellerKycDocumentType;
  fileName: string;
  mimeType: string;
  fileContents: Buffer;
}

export interface UploadSellerKycDocumentUseCase {
  execute(input: UploadSellerKycDocumentInput): Promise<SellerKycDocumentRecord>;
}

const ALLOWED_DOCUMENT_TYPES_BY_ACCOUNT_TYPE = {
  individual: new Set(["proof_of_address", "id_document", "selfie"]),
  business: new Set(["proof_of_address", "cac_certificate"])
} as const;

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "application/pdf"
]);

export class UploadSellerKycDocument implements UploadSellerKycDocumentUseCase {
  constructor(
    private readonly sellerKycRepository: SellerKycRepository,
    private readonly documentStorage: DocumentStorage
  ) {}

  async execute(
    input: UploadSellerKycDocumentInput
  ): Promise<SellerKycDocumentRecord> {
    const existingKyc = await this.sellerKycRepository.findByUserId(input.userId);

    if (!existingKyc) {
      throw new SellerKycError("Seller KYC profile not found.", 404, [
        { field: "user_id", message: "Seller KYC profile not found." }
      ]);
    }

    if (["submitted", "under_review", "approved"].includes(existingKyc.status)) {
      throw new SellerKycError("Documents cannot be updated in the current KYC state.", 409, [
        {
          field: "status",
          message: "Documents cannot be updated in the current KYC state."
        }
      ]);
    }

    if (!ALLOWED_MIME_TYPES.has(input.mimeType)) {
      throw new SellerKycError("Unsupported document type.", 400, [
        {
          field: "mime_type",
          message: "Only JPEG, PNG, and PDF files are allowed."
        }
      ]);
    }

    if (
      !ALLOWED_DOCUMENT_TYPES_BY_ACCOUNT_TYPE[existingKyc.accountType].has(
        input.documentType
      )
    ) {
      throw new SellerKycError(
        "Document type is not allowed for this seller account type.",
        400,
        [
          {
            field: "document_type",
            message:
              "Document type is not allowed for this seller account type."
          }
        ]
      );
    }

    const uploadedDocument = await this.documentStorage.uploadSellerKycDocument({
      userId: input.userId,
      documentType: input.documentType,
      fileName: input.fileName,
      mimeType: input.mimeType,
      fileContents: input.fileContents
    });

    return this.sellerKycRepository.upsertDocument({
      userId: input.userId,
      documentType: input.documentType,
      storagePath: uploadedDocument.storagePath,
      mimeType: input.mimeType,
      originalFileName: input.fileName
    });
  }
}
