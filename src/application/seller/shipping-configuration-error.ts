export class SellerShippingConfigurationError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "SellerShippingConfigurationError";
  }
}
