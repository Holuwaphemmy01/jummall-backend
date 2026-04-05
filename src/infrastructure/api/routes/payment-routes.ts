import { Router } from "express";

import type { HandlePaystackWebhookUseCase } from "../../../application/checkout/handle-paystack-webhook";
import { HandlePaystackWebhookError } from "../../../application/checkout/handle-paystack-webhook";

interface PaymentRouterDependencies {
  handlePaystackWebhook: HandlePaystackWebhookUseCase;
}

export function createPaymentRouter({
  handlePaystackWebhook
}: PaymentRouterDependencies) {
  const paymentRouter = Router();

  paymentRouter.post("/paystack/webhook", async (req, res) => {
    const rawBody =
      ((req as { rawBody?: string }).rawBody ?? JSON.stringify(req.body)) || "";
    const signature = req.header("x-paystack-signature") ?? null;

    try {
      const result = await handlePaystackWebhook.execute({
        rawBody,
        signature
      });

      return res.status(200).json({
        message: result.ignored
          ? "Webhook ignored successfully."
          : "Webhook processed successfully.",
        data: {
          processed: result.processed,
          ignored: result.ignored,
          checkout_reference: result.checkoutReference,
          order_id: result.orderId
        }
      });
    } catch (caughtError) {
      if (caughtError instanceof HandlePaystackWebhookError) {
        return res.status(caughtError.statusCode).json({
          message: caughtError.message,
          field: caughtError.field
        });
      }

      return res.status(500).json({
        message: "Unable to process Paystack webhook."
      });
    }
  });

  return paymentRouter;
}
