import { describe, expect, it, jest } from "@jest/globals";

import { ListCompletedSellerKyc } from "../../../src/application/admin/list-completed-seller-kyc";
import type {
  AdminKycRepository,
  AdminSellerKycDetail,
  AdminSellerKycSummary
} from "../../../src/ports/admin-kyc-repository";

class AdminKycRepositoryDouble implements AdminKycRepository {
  listCompletedSellerKyc = jest
    .fn<() => Promise<AdminSellerKycSummary[]>>()
    .mockResolvedValue([
      {
        id: "kyc-id",
        userId: "seller-id",
        sellerFirstName: "Jane",
        sellerLastName: "Doe",
        sellerUsername: "jane.doe",
        sellerEmail: "jane@example.com",
        sellerPhone: "+2348012345678",
        accountType: "individual",
        status: "submitted",
        submittedAt: new Date("2026-03-26T12:00:00.000Z"),
        reviewedAt: null,
        createdAt: new Date("2026-03-25T12:00:00.000Z"),
        updatedAt: new Date("2026-03-26T12:00:00.000Z")
      }
    ]);

  findCompletedSellerKycById = jest
    .fn<(kycId: string) => Promise<AdminSellerKycDetail | null>>()
    .mockResolvedValue(null);

  approveSellerKyc = jest
    .fn<
      (input: {
        kycId: string;
        reviewNote?: string;
        reviewedAt: Date;
      }) => Promise<AdminSellerKycDetail | null>
    >()
    .mockResolvedValue(null);
}

describe("ListCompletedSellerKyc", () => {
  it("returns completed seller KYC submissions for admin review", async () => {
    const adminKycRepository = new AdminKycRepositoryDouble();
    const listCompletedSellerKyc = new ListCompletedSellerKyc(adminKycRepository);

    const result = await listCompletedSellerKyc.execute();

    expect(adminKycRepository.listCompletedSellerKyc).toHaveBeenCalled();
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: "kyc-id",
      sellerEmail: "jane@example.com",
      status: "submitted"
    });
  });
});
