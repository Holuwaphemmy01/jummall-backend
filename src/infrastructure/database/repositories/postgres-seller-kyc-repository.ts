import type { Pool } from "pg";

import databasePool from "../client";
import type {
  MarkSellerKycAsSubmittedInput,
  SaveSellerKycDraftInput,
  SellerKycDocumentRecord,
  SellerKycRecord,
  SellerKycRepository,
  UpsertSellerKycDocumentInput
} from "../../../ports/seller-kyc-repository";

interface SellerKycRow {
  id: string;
  userId: string;
  accountType: "individual" | "business";
  status:
    | "not_started"
    | "in_progress"
    | "submitted"
    | "under_review"
    | "approved"
    | "rejected"
    | "needs_correction";
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
  idType:
    | "national_id"
    | "international_passport"
    | "drivers_license"
    | "voters_card"
    | null;
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
  createdAt: Date;
  updatedAt: Date;
}

interface SellerKycDocumentRow {
  id: string;
  documentType: "proof_of_address" | "id_document" | "selfie" | "cac_certificate";
  storagePath: string;
  mimeType: string;
  originalFileName: string;
  createdAt: Date;
  updatedAt: Date;
}

export class PostgresSellerKycRepository implements SellerKycRepository {
  constructor(private readonly pool: Pool = databasePool) {}

  async findByUserId(userId: string): Promise<SellerKycRecord | null> {
    const kycResult = await this.pool.query<SellerKycRow>(
      `
        SELECT
          "id",
          "userId",
          "sellerType" AS "accountType",
          "status",
          "email",
          "phone",
          "address",
          "city",
          "state",
          "country",
          "bankName",
          "bankAccountNumber",
          "bankAccountName",
          "fullName",
          "dateOfBirth",
          "gender",
          "idType",
          "idNumber",
          "businessName",
          "registrationNumber",
          "registeredBusinessAddress",
          "representativeFirstName",
          "representativeLastName",
          "representativeRole",
          "submittedAt",
          "reviewedAt",
          "reviewNote",
          "createdAt",
          "updatedAt"
        FROM "Kyc"
        WHERE "userId" = $1
        LIMIT 1
      `,
      [userId]
    );

    const kyc = kycResult.rows[0];

    if (!kyc) {
      return null;
    }

    const documentsResult = await this.pool.query<SellerKycDocumentRow>(
      `
        SELECT
          "id",
          "documentType",
          "storagePath",
          "mimeType",
          "originalFileName",
          "createdAt",
          "updatedAt"
        FROM "KycDocument"
        WHERE "kycId" = $1
        ORDER BY "createdAt" ASC
      `,
      [kyc.id]
    );

    return this.mapRecord(kyc, documentsResult.rows);
  }

  async saveDraft(input: SaveSellerKycDraftInput): Promise<SellerKycRecord> {
    const result = await this.pool.query<SellerKycRow>(
      `
        UPDATE "Kyc"
        SET
          "email" = COALESCE($2, "email"),
          "phone" = COALESCE($3, "phone"),
          "address" = COALESCE($4, "address"),
          "city" = COALESCE($5, "city"),
          "state" = COALESCE($6, "state"),
          "country" = COALESCE($7, "country"),
          "bankName" = COALESCE($8, "bankName"),
          "bankAccountNumber" = COALESCE($9, "bankAccountNumber"),
          "bankAccountName" = COALESCE($10, "bankAccountName"),
          "fullName" = COALESCE($11, "fullName"),
          "dateOfBirth" = COALESCE($12, "dateOfBirth"),
          "gender" = COALESCE($13, "gender"),
          "idType" = COALESCE($14, "idType"),
          "idNumber" = COALESCE($15, "idNumber"),
          "businessName" = COALESCE($16, "businessName"),
          "registrationNumber" = COALESCE($17, "registrationNumber"),
          "registeredBusinessAddress" = COALESCE($18, "registeredBusinessAddress"),
          "representativeFirstName" = COALESCE($19, "representativeFirstName"),
          "representativeLastName" = COALESCE($20, "representativeLastName"),
          "representativeRole" = COALESCE($21, "representativeRole"),
          "status" = CASE
            WHEN "status" = 'not_started' THEN 'in_progress'
            ELSE "status"
          END,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "userId" = $1
        RETURNING
          "id",
          "userId",
          "sellerType" AS "accountType",
          "status",
          "email",
          "phone",
          "address",
          "city",
          "state",
          "country",
          "bankName",
          "bankAccountNumber",
          "bankAccountName",
          "fullName",
          "dateOfBirth",
          "gender",
          "idType",
          "idNumber",
          "businessName",
          "registrationNumber",
          "registeredBusinessAddress",
          "representativeFirstName",
          "representativeLastName",
          "representativeRole",
          "submittedAt",
          "reviewedAt",
          "reviewNote",
          "createdAt",
          "updatedAt"
      `,
      [
        input.userId,
        input.email,
        input.phone,
        input.address,
        input.city,
        input.state,
        input.country,
        input.bankName,
        input.bankAccountNumber,
        input.bankAccountName,
        input.fullName,
        input.dateOfBirth,
        input.gender,
        input.idType,
        input.idNumber,
        input.businessName,
        input.registrationNumber,
        input.registeredBusinessAddress,
        input.representativeFirstName,
        input.representativeLastName,
        input.representativeRole
      ]
    );

    const updatedKyc = result.rows[0];

    const documents = await this.findDocuments(updatedKyc.id);

    return this.mapRecord(updatedKyc, documents);
  }

  async upsertDocument(
    input: UpsertSellerKycDocumentInput
  ): Promise<SellerKycDocumentRecord> {
    const kycResult = await this.pool.query<{ id: string }>(
      `
        SELECT "id"
        FROM "Kyc"
        WHERE "userId" = $1
        LIMIT 1
      `,
      [input.userId]
    );

    const kyc = kycResult.rows[0];

    const result = await this.pool.query<SellerKycDocumentRow>(
      `
        INSERT INTO "KycDocument" (
          "kycId",
          "documentType",
          "storagePath",
          "mimeType",
          "originalFileName",
          "updatedAt"
        )
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
        ON CONFLICT ("kycId", "documentType")
        DO UPDATE SET
          "storagePath" = EXCLUDED."storagePath",
          "mimeType" = EXCLUDED."mimeType",
          "originalFileName" = EXCLUDED."originalFileName",
          "updatedAt" = CURRENT_TIMESTAMP
        RETURNING
          "id",
          "documentType",
          "storagePath",
          "mimeType",
          "originalFileName",
          "createdAt",
          "updatedAt"
      `,
      [
        kyc.id,
        input.documentType,
        input.storagePath,
        input.mimeType,
        input.originalFileName
      ]
    );

    await this.pool.query(
      `
        UPDATE "Kyc"
        SET
          "status" = CASE
            WHEN "status" = 'not_started' THEN 'in_progress'
            ELSE "status"
          END,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "userId" = $1
      `,
      [input.userId]
    );

    return this.mapDocument(result.rows[0]);
  }

  async markAsSubmitted(
    input: MarkSellerKycAsSubmittedInput
  ): Promise<SellerKycRecord> {
    const result = await this.pool.query<SellerKycRow>(
      `
        UPDATE "Kyc"
        SET
          "status" = 'submitted',
          "submittedAt" = $2,
          "updatedAt" = CURRENT_TIMESTAMP
        WHERE "userId" = $1
        RETURNING
          "id",
          "userId",
          "sellerType" AS "accountType",
          "status",
          "email",
          "phone",
          "address",
          "city",
          "state",
          "country",
          "bankName",
          "bankAccountNumber",
          "bankAccountName",
          "fullName",
          "dateOfBirth",
          "gender",
          "idType",
          "idNumber",
          "businessName",
          "registrationNumber",
          "registeredBusinessAddress",
          "representativeFirstName",
          "representativeLastName",
          "representativeRole",
          "submittedAt",
          "reviewedAt",
          "reviewNote",
          "createdAt",
          "updatedAt"
      `,
      [input.userId, input.submittedAt]
    );

    const updatedKyc = result.rows[0];
    const documents = await this.findDocuments(updatedKyc.id);

    return this.mapRecord(updatedKyc, documents);
  }

  private async findDocuments(kycId: string): Promise<SellerKycDocumentRow[]> {
    const result = await this.pool.query<SellerKycDocumentRow>(
      `
        SELECT
          "id",
          "documentType",
          "storagePath",
          "mimeType",
          "originalFileName",
          "createdAt",
          "updatedAt"
        FROM "KycDocument"
        WHERE "kycId" = $1
        ORDER BY "createdAt" ASC
      `,
      [kycId]
    );

    return result.rows;
  }

  private mapRecord(
    kyc: SellerKycRow,
    documents: SellerKycDocumentRow[]
  ): SellerKycRecord {
    return {
      ...kyc,
      documents: documents.map((document) => this.mapDocument(document))
    };
  }

  private mapDocument(document: SellerKycDocumentRow): SellerKycDocumentRecord {
    return {
      id: document.id,
      documentType: document.documentType,
      storagePath: document.storagePath,
      mimeType: document.mimeType,
      originalFileName: document.originalFileName,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt
    };
  }
}
