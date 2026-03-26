export interface SellerKycErrorDetail {
  field: string;
  message: string;
}

export class SellerKycError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly details: SellerKycErrorDetail[] = []
  ) {
    super(message);
    this.name = "SellerKycError";
  }
}
