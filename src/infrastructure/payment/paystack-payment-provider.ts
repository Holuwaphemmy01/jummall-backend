import { createHmac } from "node:crypto";

import type {
  InitializePaymentTransactionInput,
  InitializePaymentTransactionResult,
  PaymentProvider,
  VerifyPaymentTransactionResult
} from "../../ports/payment/payment-provider";

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data?: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerifyResponse {
  status: boolean;
  message: string;
  data?: {
    reference: string;
    amount: number;
    currency: string;
    status: string;
    paid_at: string | null;
  };
}

export class PaystackPaymentProvider implements PaymentProvider {
  readonly name = "paystack" as const;

  constructor(
    private readonly secretKey: string = process.env.PAYSTACK_SECRET_KEY ?? "",
    private readonly callbackUrl: string | undefined =
      process.env.PAYSTACK_CALLBACK_URL || undefined
  ) {}

  async initializeTransaction(
    input: InitializePaymentTransactionInput
  ): Promise<InitializePaymentTransactionResult> {
    this.assertConfigured();

    const payload = {
      email: input.customerEmail,
      amount: Math.round(input.amount * 100),
      currency: input.currency,
      reference: input.reference,
      callback_url: input.callbackUrl ?? this.callbackUrl,
      metadata: input.metadata ?? {}
    };

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.secretKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const rawBody = await response.text();

    if (!response.ok) {
      throw new Error("Paystack transaction initialization failed.");
    }

    let body: PaystackInitializeResponse;

    try {
      body = JSON.parse(rawBody) as PaystackInitializeResponse;
    } catch {
      throw new Error("Paystack transaction initialization failed.");
    }

    if (!body.status || !body.data?.authorization_url) {
      throw new Error(body.message || "Paystack transaction initialization failed.");
    }

    return {
      provider: this.name,
      reference: body.data.reference,
      authorizationUrl: body.data.authorization_url,
      accessCode: body.data.access_code ?? null
    };
  }

  async verifyTransaction(
    reference: string
  ): Promise<VerifyPaymentTransactionResult> {
    this.assertConfigured();

    const encodedReference = encodeURIComponent(reference);
    const response = await fetch(
      `https://api.paystack.co/transaction/verify/${encodedReference}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.secretKey}`
        }
      }
    );

    if (!response.ok) {
      throw new Error("Paystack transaction verification failed.");
    }

    const body = (await response.json()) as PaystackVerifyResponse;

    if (!body.status || !body.data) {
      throw new Error(body.message || "Paystack transaction verification failed.");
    }

    return {
      provider: this.name,
      reference: body.data.reference,
      amount: body.data.amount / 100,
      currency: body.data.currency,
      status: this.mapVerificationStatus(body.data.status),
      paidAt: body.data.paid_at ? new Date(body.data.paid_at) : null
    };
  }

  validateWebhookSignature(input: {
    rawBody: string;
    signature: string | null;
  }): boolean {
    if (!input.signature) {
      return false;
    }

    this.assertConfigured();

    const expected = createHmac("sha512", this.secretKey)
      .update(input.rawBody)
      .digest("hex");

    return expected === input.signature;
  }

  private mapVerificationStatus(status: string) {
    switch (status) {
      case "success":
        return "success" as const;
      case "failed":
        return "failed" as const;
      case "abandoned":
        return "abandoned" as const;
      default:
        return "pending" as const;
    }
  }

  private assertConfigured() {
    if (!this.secretKey) {
      throw new Error("Paystack secret key is not configured.");
    }
  }
}
