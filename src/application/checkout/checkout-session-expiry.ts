import type {
  CheckoutSessionRecord,
  CheckoutSessionRepository
} from "../../ports/checkout-session-repository";

const ONE_MINUTE_IN_MS = 60 * 1000;

export function getCheckoutSessionExpiryMinutes(): number {
  const configuredMinutes = Number(
    process.env.CHECKOUT_SESSION_EXPIRY_MINUTES ??
      (process.env.NODE_ENV === "production" ? 15 : 1)
  );

  if (!Number.isFinite(configuredMinutes) || configuredMinutes <= 0) {
    return process.env.NODE_ENV === "production" ? 15 : 1;
  }

  return configuredMinutes;
}

export function isCheckoutSessionExpired(
  session: Pick<CheckoutSessionRecord, "updatedAt">,
  now: Date = new Date()
): boolean {
  const ageInMs = now.getTime() - session.updatedAt.getTime();

  return ageInMs >= getCheckoutSessionExpiryMinutes() * ONE_MINUTE_IN_MS;
}

export async function findBlockingInitializedCheckoutSession(
  checkoutSessionRepository: CheckoutSessionRepository,
  buyerId: string,
  now: Date = new Date()
): Promise<CheckoutSessionRecord | null> {
  const initializedSession =
    await checkoutSessionRepository.findInitializedByBuyerId(buyerId);

  if (!initializedSession) {
    return null;
  }

  if (!isCheckoutSessionExpired(initializedSession, now)) {
    return initializedSession;
  }

  await checkoutSessionRepository.markFailed({
    sessionId: initializedSession.id,
    failureReason: "checkout_session_expired"
  });

  return null;
}
