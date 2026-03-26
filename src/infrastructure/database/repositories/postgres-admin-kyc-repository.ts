import type { Pool } from "pg";

import databasePool from "../client";
import type {
  AdminKycRepository,
  AdminSellerKycDetail,
  AdminSellerKycSummary
} from "../../../ports/admin-kyc-repository";
import type { SellerKycDocumentRecord } from "../../../ports/seller-kyc-repository";

interface AdminKycSummaryRow {
  id: string;
  userId: string;
  sellerFirstName: string | null;
  sellerLastName: string | null;
  sellerUsername: string | null;
  sellerEmail: string;
  sellerPhone: string | null;
  accountType: "individual" | "business";
  status:
    | "submitted"
    | "under_review"
    | "approved"
    | "rejected"
    | "needs_correction";
  submittedAt: Date | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

interface AdminKycDetailRow extends AdminKycSummaryRow {
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
}

interface KycDocumentRow {
  id: string;
  documentType: "proof_of_address" | "id_document" | "selfie" | "cac_certificate";
  storagePath: string;
  mimeType: string;
  originalFileName: string;
  createdAt: Date;
  updatedAt: Date;
}

const COMPLETED_STATUSES = [
  "submitted",
  "under_review",
  "approved",
  "rejected",
  "needs_correction"
];

export class PostgresAdminKycRepository implements AdminKycRepository {
  constructor(private readonly pool: Pool = databasePool) {}

  async listCompletedSellerKyc(): Promise<AdminSellerKycSummary[]> {
    const result = await this.pool.query<AdminKycSummaryRow>(
      `
        SELECT
          k."id",
          k."userId",
          u."firstName" AS "sellerFirstName",
          u."lastName" AS "sellerLastName",
          u."username" AS "sellerUsername",
          u."email" AS "sellerEmail",
          u."phone" AS "sellerPhone",
          k."sellerType" AS "accountType",
          k."status",
          k."submittedAt",
          k."reviewedAt",
          k."createdAt",
          k."updatedAt"
        FROM "Kyc" k
        INNER JOIN "User" u ON u."id" = k."userId"
        WHERE k."status" = ANY($1::text[])
        ORDER BY COALESCE(k."submittedAt", k."updatedAt") DESC, k."createdAt" DESC
      `,
      [COMPLETED_STATUSES]
    );

    return result.rows;
  }

  async findCompletedSellerKycById(
    kycId: string
  ): Promise<AdminSellerKycDetail | null> {
    const result = await this.pool.query<AdminKycDetailRow>(
      `
        SELECT
          k."id",
          k."userId",
          u."firstName" AS "sellerFirstName",
          u."lastName" AS "sellerLastName",
          u."username" AS "sellerUsername",
          u."email" AS "sellerEmail",
          u."phone" AS "sellerPhone",
          k."sellerType" AS "accountType",
          k."status",
          k."submittedAt",
          k."reviewedAt",
          k."createdAt",
          k."updatedAt",
          k."email",
          k."phone",
          k."address",
          k."city",
          k."state",
          k."country",
          k."bankName",
          k."bankAccountNumber",
          k."bankAccountName",
          k."fullName",
          k."dateOfBirth",
          k."gender",
          k."idType",
          k."idNumber",
          k."businessName",
          k."registrationNumber",
          k."registeredBusinessAddress",
          k."representativeFirstName",
          k."representativeLastName",
          k."representativeRole",
          k."reviewNote"
        FROM "Kyc" k
        INNER JOIN "User" u ON u."id" = k."userId"
        WHERE k."id" = $1 AND k."status" = ANY($2::text[])
        LIMIT 1
      `,
      [kycId, COMPLETED_STATUSES]
    );

    const kyc = result.rows[0];

    if (!kyc) {
      return null;
    }

    const documentResult = await this.pool.query<KycDocumentRow>(
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

    return {
      ...kyc,
      documents: documentResult.rows.map((document) =>
        this.mapDocument(document)
      )
    };
  }

  async approveSellerKyc(input: {
    kycId: string;
    reviewNote?: string;
    reviewedAt: Date;
  }): Promise<AdminSellerKycDetail | null> {
    const result = await this.pool.query<AdminKycDetailRow>(
      `
        UPDATE "Kyc" k
        SET
          "status" = 'approved',
          "reviewedAt" = $2,
          "reviewNote" = $3,
          "updatedAt" = CURRENT_TIMESTAMP
        FROM "User" u
        WHERE k."id" = $1
          AND u."id" = k."userId"
        RETURNING
          k."id",
          k."userId",
          u."firstName" AS "sellerFirstName",
          u."lastName" AS "sellerLastName",
          u."username" AS "sellerUsername",
          u."email" AS "sellerEmail",
          u."phone" AS "sellerPhone",
          k."sellerType" AS "accountType",
          k."status",
          k."submittedAt",
          k."reviewedAt",
          k."createdAt",
          k."updatedAt",
          k."email",
          k."phone",
          k."address",
          k."city",
          k."state",
          k."country",
          k."bankName",
          k."bankAccountNumber",
          k."bankAccountName",
          k."fullName",
          k."dateOfBirth",
          k."gender",
          k."idType",
          k."idNumber",
          k."businessName",
          k."registrationNumber",
          k."registeredBusinessAddress",
          k."representativeFirstName",
          k."representativeLastName",
          k."representativeRole",
          k."reviewNote"
      `,
      [input.kycId, input.reviewedAt, input.reviewNote ?? null]
    );

    const approvedKyc = result.rows[0];

    if (!approvedKyc) {
      return null;
    }

    const documentResult = await this.pool.query<KycDocumentRow>(
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
      [approvedKyc.id]
    );

    return {
      ...approvedKyc,
      documents: documentResult.rows.map((document) =>
        this.mapDocument(document)
      )
    };
  }

  private mapDocument(document: KycDocumentRow): SellerKycDocumentRecord {
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
