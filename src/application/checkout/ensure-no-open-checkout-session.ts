import type { CheckoutSessionRepository } from "../../ports/checkout-session-repository";
import { findBlockingInitializedCheckoutSession } from "./checkout-session-expiry";

export async function ensureNoOpenCheckoutSession(
  checkoutSessionRepository: CheckoutSessionRepository,
  buyerId: string,
  errorFactory: (message: string, field?: string) => Error
) {
  const activeCheckout =
    await findBlockingInitializedCheckoutSession(
      checkoutSessionRepository,
      buyerId
    );

  if (activeCheckout) {
    throw errorFactory(
      "An active checkout session is awaiting payment. Complete or resolve it before modifying the cart.",
      "buyer_id"
    );
  }
}
