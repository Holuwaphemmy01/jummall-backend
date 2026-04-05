import { Router } from "express";

import { CompleteCheckoutAfterPayment } from "../application/checkout/complete-checkout-after-payment";
import { HandlePaystackWebhook } from "../application/checkout/handle-paystack-webhook";
import { PostgresCheckoutSessionRepository } from "../infrastructure/database/repositories/postgres-checkout-session-repository";
import { PostgresCheckoutTransactionRunner } from "../infrastructure/database/repositories/postgres-checkout-transaction-runner";
import { PaystackPaymentProvider } from "../infrastructure/payment/paystack-payment-provider";
import { createPaymentRouter } from "../infrastructure/api/routes/payment-routes";

export function createPaymentModule() {
  const paymentRouter = Router();
  const checkoutSessionRepository = new PostgresCheckoutSessionRepository();
  const checkoutTransactionRunner = new PostgresCheckoutTransactionRunner();
  const paymentProvider = new PaystackPaymentProvider();
  const completeCheckoutAfterPayment = new CompleteCheckoutAfterPayment(
    checkoutSessionRepository,
    checkoutTransactionRunner
  );
  const handlePaystackWebhook = new HandlePaystackWebhook(
    paymentProvider,
    checkoutSessionRepository,
    completeCheckoutAfterPayment
  );

  paymentRouter.use(createPaymentRouter({ handlePaystackWebhook }));

  return paymentRouter;
}
