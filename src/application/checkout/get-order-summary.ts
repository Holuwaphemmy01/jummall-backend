import type { CheckoutOrderSummary } from "./checkout-types";
import type { PrepareCheckoutDataInput } from "./prepare-checkout-data";
import {
  PrepareCheckoutData,
  PrepareCheckoutDataError
} from "./prepare-checkout-data";

export interface GetOrderSummaryInput extends PrepareCheckoutDataInput {}

export interface GetOrderSummaryResult {
  summary: CheckoutOrderSummary;
}

export interface GetOrderSummaryUseCase {
  execute(input: GetOrderSummaryInput): Promise<GetOrderSummaryResult>;
}

export class GetOrderSummaryError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly field?: string
  ) {
    super(message);
    this.name = "GetOrderSummaryError";
  }
}

export class GetOrderSummary implements GetOrderSummaryUseCase {
  constructor(private readonly prepareCheckoutData: PrepareCheckoutData) {}

  async execute(input: GetOrderSummaryInput): Promise<GetOrderSummaryResult> {
    try {
      const prepared = await this.prepareCheckoutData.execute(input);
      return {
        summary: prepared.summary
      };
    } catch (error) {
      if (error instanceof PrepareCheckoutDataError) {
        throw new GetOrderSummaryError(
          error.message,
          error.statusCode,
          error.field
        );
      }

      throw error;
    }
  }
}

