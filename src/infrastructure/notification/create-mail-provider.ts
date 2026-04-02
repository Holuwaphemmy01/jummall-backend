import type { MailProvider } from "../../ports/mail-provider";
import { ResendMailProvider } from "./resend-mail-provider";
import { SmtpMailProvider } from "./smtp-mail-provider";

function resolveProviderName(): string {
  if (process.env.MAIL_PROVIDER?.trim()) {
    return process.env.MAIL_PROVIDER.trim().toLowerCase();
  }

  return process.env.NODE_ENV === "production" ? "resend" : "smtp";
}

export function createMailProvider(): MailProvider {
  const providerName = resolveProviderName();

  if (providerName === "resend") {
    return new ResendMailProvider();
  }

  if (providerName === "smtp") {
    return new SmtpMailProvider();
  }

  throw new Error(
    `Unsupported MAIL_PROVIDER value "${providerName}". Use "smtp" or "resend".`
  );
}
