export class ShippingConfigurationError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "ShippingConfigurationError";
  }
}
