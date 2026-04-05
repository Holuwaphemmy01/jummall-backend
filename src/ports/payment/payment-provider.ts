export type PaymentProviderName = "paystack";
export type PaymentVerificationStatus =
  | "success"
  | "failed"
  | "abandoned"
  | "pending";

export interface InitializePaymentTransactionInput {
  reference: string;
  amount: number;
  currency: string;
  customerEmail: string;
  callbackUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface InitializePaymentTransactionResult {
  provider: PaymentProviderName;
  reference: string;
  authorizationUrl: string;
  accessCode: string | null;
}

export interface VerifyPaymentTransactionResult {
  provider: PaymentProviderName;
  reference: string;
  amount: number;
  currency: string;
  status: PaymentVerificationStatus;
  paidAt: Date | null;
}

export interface PaymentProvider {
  readonly name: PaymentProviderName;
  initializeTransaction(
    input: InitializePaymentTransactionInput
  ): Promise<InitializePaymentTransactionResult>;
  verifyTransaction(reference: string): Promise<VerifyPaymentTransactionResult>;
  validateWebhookSignature(input: {
    rawBody: string;
    signature: string | null;
  }): boolean;
}

